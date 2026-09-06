import { Router } from 'express';
import type { Repository } from '../db/repository';
import {
  byggAuthUrl,
  harGoogleDriveKonfiguration,
  opretEllerFindMappe,
  udvekslKodeForToken,
} from '../integrations/googleDrive';

/**
 * Google Drive-forbindelsen. /start og /callback er sideskift, ikke
 * JSON-kald — Google sender selv browseren tilbage til /callback efter
 * samtykke, så fejl her sendes videre som en ?drev=-parameter på forsiden
 * i stedet for et JSON-svar, ingen ser.
 */
export function integrationerRoutes(repo: Repository): Router {
  const r = Router();

  r.get('/google/status', async (_req, res) => {
    const forbindelse = await repo.hentGoogleDriveForbindelse();
    res.json({
      konfigureret: harGoogleDriveKonfiguration(),
      forbundet: Boolean(forbindelse),
      forbundetTidspunkt: forbindelse?.forbundetTidspunkt ?? null,
      sidsteFejl: forbindelse?.sidsteFejl ?? null,
      sidsteFejlTidspunkt: forbindelse?.sidsteFejlTidspunkt ?? null,
    });
  });

  r.get('/google/start', (_req, res) => {
    if (!harGoogleDriveKonfiguration()) {
      return res.redirect('/?drev=ikke-konfigureret');
    }
    try {
      res.redirect(byggAuthUrl());
    } catch (err) {
      console.error('Kunne ikke bygge Google-godkendelses-URL:', err);
      res.redirect('/?drev=fejl');
    }
  });

  r.get('/google/callback', async (req, res) => {
    const kode = String(req.query.code ?? '');
    if (!kode) return res.redirect('/?drev=fejl');

    try {
      const refreshToken = await udvekslKodeForToken(kode);
      const mappeId = await opretEllerFindMappe(refreshToken);
      await repo.gemGoogleDriveForbindelse({
        refreshToken,
        mappeId,
        snapshotFilId: null,
        forbundetTidspunkt: new Date().toISOString(),
        sidsteFejl: null,
        sidsteFejlTidspunkt: null,
      });
      res.redirect('/?drev=forbundet');
    } catch (err) {
      console.error('Google Drive-forbindelse fejlede:', err);
      res.redirect('/?drev=fejl');
    }
  });

  r.post('/google/afbryd', async (_req, res) => {
    await repo.sletGoogleDriveForbindelse();
    res.json({ ok: true });
  });

  return r;
}
