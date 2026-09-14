import { Router } from 'express';
import {
  OpenRouteServiceFejl,
  beregnRuteDetaljer,
  soegAdresse,
} from '../integrations/openrouteservice';

/**
 * Ruteberegning og adressesøgning.
 * Standard er tur/retur og understøtter valgfri mellemstationer.
 */
export function ruterRoutes(): Router {
  const r = Router();

  r.get('/ruter/status', (_req, res) => {
    res.json({ klar: true });
  });

  r.get('/ruter/soeg', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);
    try {
      const forslag = await soegAdresse(q);
      res.json(forslag);
    } catch {
      res.json([]);
    }
  });

  const haandterAfstand = async (
    fra: string,
    til: string,
    mellemRaw: unknown,
    turReturRaw: unknown,
    res: any
  ) => {
    const rentFra = String(fra ?? '').trim();
    const rentTil = String(til ?? '').trim();

    if (!rentFra) {
      return res.status(400).json({
        fejl: 'Sæt en hjemmeadresse på indkomståret først, så afstanden kan beregnes derfra.',
      });
    }
    if (!rentTil) {
      return res.status(400).json({ fejl: 'Skriv en adresse eller et sted for kørslen først.' });
    }

    const mellemstationer: string[] = Array.isArray(mellemRaw)
      ? (mellemRaw as string[]).map(String)
      : typeof mellemRaw === 'string' && mellemRaw.trim()
        ? mellemRaw.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
        : [];

    // Standard er tur/retur = true, medmindre eksplicit sat til false
    const turRetur =
      turReturRaw === undefined || turReturRaw === null
        ? true
        : turReturRaw !== 'false' && turReturRaw !== false;

    try {
      const rute = await beregnRuteDetaljer(rentFra, rentTil, { mellemstationer, turRetur });
      res.json(rute);
    } catch (err) {
      if (err instanceof OpenRouteServiceFejl) {
        const status =
          err.kode === 'MANGLER_NOEGLE' ? 503 : err.kode === 'IKKE_GEOKODET' ? 422 : 504;
        return res.status(status).json({ fejl: err.message });
      }
      console.error('Afstandsberegning fejlede:', err);
      res.status(500).json({ fejl: 'Afstanden kunne ikke beregnes. Tast den manuelt i stedet.' });
    }
  };

  r.get('/ruter/afstand', async (req, res) => {
    await haandterAfstand(
      String(req.query.fra ?? ''),
      String(req.query.til ?? ''),
      req.query.mellemstationer,
      req.query.turRetur,
      res
    );
  });

  r.post('/ruter/afstand', async (req, res) => {
    await haandterAfstand(
      String(req.body?.fra ?? ''),
      String(req.body?.til ?? ''),
      req.body?.mellemstationer,
      req.body?.turRetur,
      res
    );
  });

  return r;
}
