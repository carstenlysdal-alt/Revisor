import { Router } from 'express';
import type { Repository } from '../db/repository';
import {
  BilagsArkiv,
  MAKS_FILSTOERRELSE,
  TILLADTE_MIMETYPER,
} from '../storage/bilag';
import type { Bilag } from '../../src/types';

export function bilagRoutes(repo: Repository, arkiv: BilagsArkiv): Router {
  const r = Router();

  /**
   * Gemmer et bilag og fortæller, om det samme indhold allerede findes.
   * Dubletten blokerer ikke, men brugeren får den at vide, før der bruges
   * penge på at læse bilaget igen.
   */
  r.post('/bilag', async (req, res, next) => {
    try {
      const { data, mimeType, filnavn } = req.body ?? {};

      if (typeof data !== 'string' || !data) {
        return res.status(400).json({ fejl: 'Filen mangler i kaldet.' });
      }
      if (!TILLADTE_MIMETYPER[mimeType]) {
        return res.status(415).json({
          fejl: `Filtypen ${mimeType || 'ukendt'} kan ikke læses. Brug PDF, PNG, JPG, WEBP eller HEIC.`,
        });
      }

      const indhold = Buffer.from(data, 'base64');
      if (indhold.length > MAKS_FILSTOERRELSE) {
        return res.status(413).json({
          fejl: `Filen fylder ${Math.round(indhold.length / 1024 / 1024)} MB. Grænsen er ${MAKS_FILSTOERRELSE / 1024 / 1024} MB.`,
        });
      }

      const sha256 = BilagsArkiv.hash(indhold);
      const eksisterende = await repo.findBilagVedHash(sha256);

      await arkiv.gem(indhold, mimeType);

      const bilag: Bilag =
        eksisterende ?? {
          id: `bilag-${sha256.slice(0, 16)}`,
          sha256,
          filnavn: String(filnavn || 'bilag'),
          mimeType,
          stoerrelse: indhold.length,
          uploadet: new Date().toISOString(),
        };

      if (!eksisterende) await repo.gemBilag(bilag);

      res.json({
        bilag,
        dublet: eksisterende
          ? {
              bilagId: eksisterende.id,
              filnavn: eksisterende.filnavn,
              uploadet: eksisterende.uploadet,
            }
          : null,
      });
    } catch (err) {
      next(err);
    }
  });

  r.get('/bilag/:id/fil', async (req, res, next) => {
    try {
      const bilag = await repo.hentBilag(req.params.id);
      if (!bilag) return res.status(404).json({ fejl: 'Bilaget findes ikke.' });

      const indhold = await arkiv.hent(bilag.sha256, bilag.mimeType);
      res.setHeader('Content-Type', bilag.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(bilag.filnavn)}"`
      );
      res.send(indhold);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return res.status(410).json({
          fejl: 'Bilaget er registreret, men selve filen findes ikke længere i arkivet.',
        });
      }
      next(err);
    }
  });

  r.delete('/bilag/:id', async (req, res, next) => {
    try {
      const bilag = await repo.hentBilag(req.params.id);
      if (bilag) {
        await arkiv.slet(bilag.sha256, bilag.mimeType);
        await repo.sletBilag(bilag.id);
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return r;
}
