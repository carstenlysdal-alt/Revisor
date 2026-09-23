import { Router } from 'express';
import OpenAI from 'openai';
import type { Repository } from '../db/repository';
import type { BilagsLager } from '../storage/lager';
import { getUdbyder, udbyderStatus } from '../ai/faktor';
import { ManglendeApiNoegleError } from '../ai/udbyder';
import { PdfUdenTekstError } from '../ai/pdf';
import { rensProsa } from '../ai/rens';

/** Hvor mange tidligere beskeder der hentes med som hukommelse til hvert chat-kald. */
const HISTORIK_TIL_HUKOMMELSE = 20;

/**
 * Oversætter en fejl til noget, brugeren kan handle på.
 *
 * Den sidste, uspecifikke fejl afhænger af kald: kontekst 'bilag' taler om et
 * dokument, 'chat' om et svar. De to endpoints deler ellers samme oversættelse.
 */
function tilBrugerfejl(
  err: unknown,
  kontekst: 'bilag' | 'chat' = 'bilag'
): { status: number; fejl: string } {
  if (err instanceof ManglendeApiNoegleError) return { status: 503, fejl: err.message };
  if (err instanceof PdfUdenTekstError) return { status: 422, fejl: err.message };

  if (err instanceof OpenAI.AuthenticationError) {
    return { status: 502, fejl: 'API-nøglen blev afvist. Kontrollér nøglen i .env.' };
  }
  if (err instanceof OpenAI.RateLimitError) {
    return {
      status: 429,
      fejl: 'Der er for mange kald i gang lige nu. Vent et minut og prøv igen.',
    };
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return {
      status: 504,
      fejl: 'Der er ikke forbindelse til AI-udbyderen. Tjek netværket og prøv igen.',
    };
  }

  const besked = err instanceof Error ? err.message : '';
  if (/api[_ -]?key|unauthenticat|permission|denied|401|403/i.test(besked)) {
    return { status: 502, fejl: 'API-nøglen blev afvist. Kontrollér nøglen i .env.' };
  }
  if (/quota|rate|429/i.test(besked)) {
    return {
      status: 429,
      fejl: 'Kvoten hos AI-udbyderen er brugt op, eller der er for mange kald i gang.',
    };
  }

  return {
    status: 500,
    fejl:
      kontekst === 'chat'
        ? 'Svaret kunne ikke dannes. Prøv igen, eller omformulér spørgsmålet.'
        : 'Bilaget kunne ikke læses. Prøv igen, eller opret posten manuelt.',
  };
}

export function aiRoutes(repo: Repository, arkiv: BilagsLager): Router {
  const r = Router();

  r.get('/ai/status', (_req, res) => {
    res.json(udbyderStatus());
  });

  /**
   * Læser et allerede gemt bilag og returnerer en kladde.
   *
   * Kladden gemmes ikke. Den skal godkendes i grænsefladen først, og et
   * UKENDT-svar bliver aldrig til en post af sig selv.
   */
  r.post('/ai/analyser-bilag', async (req, res) => {
    try {
      const bilag = await repo.hentBilag(req.body?.bilagId);
      if (!bilag) return res.status(404).json({ fejl: 'Bilaget findes ikke.' });

      const indhold = await arkiv.hent(bilag.sha256, bilag.mimeType);
      const analyse = await getUdbyder().analyserBilag({
        indhold,
        mimeType: bilag.mimeType,
        filnavn: bilag.filnavn,
      });

      res.json({ id: `kladde-${bilag.id}`, bilag, analyse });
    } catch (err) {
      console.error('Bilagsanalyse fejlede:', err);
      const { status, fejl } = tilBrugerfejl(err);
      res.status(status).json({ fejl });
    }
  });

  /**
   * Revisor-chatten. Streamer status undervejs og hele svaret til sidst.
   *
   * Statusbeskederne følger de faser, der faktisk sker: der siges kun "søger",
   * mens en søgning er i gang. Ingen tidsstyret overgang mellem faser.
   */
  r.post('/ai/chat', async (req, res) => {
    const send = (type: string, data: unknown) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const { beskeder, beregning, brugWebsoegning, aktivtForslag } = req.body ?? {};
      const beskederListe: { rolle: 'bruger' | 'assistent'; indhold: string }[] = Array.isArray(
        beskeder
      )
        ? beskeder
        : [];

      const tidligereHistorik = await repo.hentChatHistorik(HISTORIK_TIL_HUKOMMELSE);
      const snapshot = await repo.hentAlt();
      const profil = snapshot.profil || (await repo.hentProfil());
      const kendteHvervgivere = Array.from(
        new Set([
          ...(((beregning as Record<string, unknown>)?.kendteHvervgivere as string[]) || []),
          ...snapshot.jobs.map((j) => j.hvervgiver).filter(Boolean),
          ...snapshot.jobs.map((j) => j.booker || '').filter(Boolean),
        ])
      );

      const berigetBeregning = {
        ...(typeof beregning === 'object' && beregning !== null ? beregning : {}),
        profil,
        fastBooker: profil.fastBooker ?? profil.fastHvervgiver,
        kendteHvervgivere,
        navn: profil.navn || (beregning as Record<string, unknown>)?.navn,
        bopaelsadresse:
          profil.hjemmeadresse ||
          (beregning as Record<string, unknown>)?.bopaelsadresse ||
          (beregning as Record<string, unknown>)?.hjemmeadresse,
        hjemmeadresse:
          profil.hjemmeadresse ||
          (beregning as Record<string, unknown>)?.hjemmeadresse ||
          (beregning as Record<string, unknown>)?.bopaelsadresse,
        kommune: profil.kommune || (beregning as Record<string, unknown>)?.kommune,
      };

      const svar = await getUdbyder().chat(
        {
          beskeder: beskederListe,
          beregning: berigetBeregning,
          brugWebsoegning: Boolean(brugWebsoegning),
          aktivtForslag: aktivtForslag ?? null,
          tidligereHistorik,
        },
        (fase) => send('status', { fase })
      );

      // Bedst-mulig hukommelse: fejler denne, skal chatsvaret stadig nå frem.
      const gemTilHistorik = async (rolle: 'bruger' | 'assistent', indhold: string) => {
        if (!indhold.trim()) return;
        try {
          await repo.gemChatBesked({ rolle, indhold, tidspunkt: new Date().toISOString() });
        } catch (err) {
          console.error('Kunne ikke gemme chatbesked til historikken:', err);
        }
      };

      const sidsteBrugerbesked = [...beskederListe].reverse().find((b) => b.rolle === 'bruger');
      if (sidsteBrugerbesked) await gemTilHistorik('bruger', sidsteBrugerbesked.indhold);

      if (svar.bekraeftet) {
        // Kun et signal — serveren gemmer intet selv. Klienten holder allerede
        // det udkast, der skal gemmes, og bruger sin egen gem-handler, akkurat
        // som når "Godkend"-knappen klikkes.
        send('bekraeft', {});
      } else if (svar.forslag) {
        const besked = rensProsa(svar.forslag.besked);
        send('forslag', { besked, forslag: svar.forslag });
        await gemTilHistorik('assistent', besked);
      } else if (!svar.tekst) {
        send('fejl', { fejl: 'Der kom ikke noget svar tilbage. Prøv igen.' });
      } else {
        const tekst = rensProsa(svar.tekst);
        send('faerdig', {
          tekst,
          kilder: svar.kilder.map((k) => ({ titel: k.titel, url: k.url })),
        });
        await gemTilHistorik('assistent', tekst);
      }
    } catch (err) {
      console.error('Revisor-chat fejlede:', err);
      const { fejl } = tilBrugerfejl(err, 'chat');
      if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
      send('fejl', { fejl });
    } finally {
      res.end();
    }
  });

  return r;
}
