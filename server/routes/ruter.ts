import { Router } from 'express';
import {
  OpenRouteServiceFejl,
  beregnAfstandMellemAdresser,
  harOpenRouteServiceNoegle,
} from '../integrations/openrouteservice';

/**
 * Ruteberegning. Et rent forslag til km-feltet — aldrig en tavs overskrivning
 * af noget, brugeren selv har tastet. Alle fejlveje falder tilbage til manuel
 * indtastning, ikke til at blokere jobbet.
 */
export function ruterRoutes(): Router {
  const r = Router();

  r.get('/ruter/status', (_req, res) => {
    res.json({ klar: harOpenRouteServiceNoegle() });
  });

  r.get('/ruter/afstand', async (req, res) => {
    const fra = String(req.query.fra ?? '').trim();
    const til = String(req.query.til ?? '').trim();

    if (!fra) {
      return res.status(400).json({
        fejl: 'Sæt en hjemmeadresse på indkomståret først, så afstanden kan beregnes derfra.',
      });
    }
    if (!til) {
      return res.status(400).json({ fejl: 'Skriv en adresse for jobbet først.' });
    }

    try {
      const km = await beregnAfstandMellemAdresser(fra, til);
      res.json({ km });
    } catch (err) {
      if (err instanceof OpenRouteServiceFejl) {
        const status =
          err.kode === 'MANGLER_NOEGLE' ? 503 : err.kode === 'IKKE_GEOKODET' ? 422 : 504;
        return res.status(status).json({ fejl: err.message });
      }
      console.error('Afstandsberegning fejlede:', err);
      res.status(500).json({ fejl: 'Afstanden kunne ikke beregnes. Tast den manuelt i stedet.' });
    }
  });

  return r;
}
