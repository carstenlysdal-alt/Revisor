import { Router } from 'express';
import OpenAI from 'openai';
import type { Repository } from '../db/repository';
import type { BilagsLager } from '../storage/lager';
import { getUdbyder, udbyderStatus } from '../ai/faktor';
import { ManglendeApiNoegleError } from '../ai/udbyder';
import { PdfUdenTekstError } from '../ai/pdf';
import { rensProsa } from '../ai/rens';

/** Oversætter en fejl til noget, brugeren kan handle på. */
function tilBrugerfejl(err: unknown): { status: number; fejl: string } {
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
    fejl: 'Bilaget kunne ikke læses. Prøv igen, eller opret posten manuelt.',
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

      const svar = await getUdbyder().chat(
        {
          beskeder: Array.isArray(beskeder) ? beskeder : [],
          beregning,
          brugWebsoegning: Boolean(brugWebsoegning),
          aktivtForslag: aktivtForslag ?? null,
        },
        (fase) => send('status', { fase })
      );

      if (svar.bekraeftet) {
        // Kun et signal — serveren gemmer intet selv. Klienten holder allerede
        // det udkast, der skal gemmes, og bruger sin egen gem-handler, akkurat
        // som når "Godkend"-knappen klikkes.
        send('bekraeft', {});
      } else if (svar.forslag) {
        send('forslag', { besked: rensProsa(svar.forslag.besked), forslag: svar.forslag });
      } else if (!svar.tekst) {
        send('fejl', { fejl: 'Der kom ikke noget svar tilbage. Prøv igen.' });
      } else {
        send('faerdig', {
          tekst: rensProsa(svar.tekst),
          kilder: svar.kilder.map((k) => ({ titel: k.titel, url: k.url })),
        });
      }
    } catch (err) {
      console.error('Revisor-chat fejlede:', err);
      const { fejl } = tilBrugerfejl(err);
      if (!res.headersSent) res.setHeader('Content-Type', 'text/event-stream');
      send('fejl', { fejl });
    } finally {
      res.end();
    }
  });

  return r;
}
