import crypto from 'crypto';
import { Router, type Request } from 'express';
import type { Repository } from '../db/repository';
import { laesCookie } from '../auth/session';
import {
  byggAuthUrl,
  harGoogleDriveKonfiguration,
  opretEllerFindMappe,
  udvekslKodeForToken,
} from '../integrations/googleDrive';

const GOOGLE_STATE_COOKIE = 'revisor_google_state';

const erSikkerForbindelse = (req: Request) =>
  req.secure || req.get('x-forwarded-proto') === 'https';

function stateCookie(req: Request, state: string, maxAge: number): string {
  return [
    `${GOOGLE_STATE_COOKIE}=${encodeURIComponent(state)}`,
    'Path=/api/google',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    erSikkerForbindelse(req) ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function erGyldigGoogleState(
  forventet: string | undefined,
  modtaget: string
): boolean {
  if (!forventet || !modtaget) return false;
  const a = Buffer.from(forventet);
  const b = Buffer.from(modtaget);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Google Drive-forbindelsen. /start og /callback er sideskift, ikke
 * JSON-kald — Google sender selv browseren tilbage til /callback efter
 * samtykke, så fejl her sendes videre som en ?drev=-parameter på forsiden
 * i stedet for et JSON-svar, ingen ser.
 */
export function integrationerRoutes(
  repo: Repository,
  onForbundet: () => void = () => undefined
): Router {
  const r = Router();

  r.get('/google/status', async (_req, res) => {
    const [forbindelse, snapshot] = await Promise.all([
      repo.hentGoogleDriveForbindelse(),
      repo.hentAlt(),
    ]);
    res.json({
      konfigureret: harGoogleDriveKonfiguration(),
      forbundet: Boolean(forbindelse),
      forbundetTidspunkt: forbindelse?.forbundetTidspunkt ?? null,
      sidsteFejl: forbindelse?.sidsteFejl ?? null,
      sidsteFejlTidspunkt: forbindelse?.sidsteFejlTidspunkt ?? null,
      sikkerhedskopieredeBilag: snapshot.bilag.filter(
        (b) => b.drevBackupTidspunkt && b.drevBackupMappeId === forbindelse?.mappeId
      ).length,
      afventendeBilag: snapshot.bilag.filter(
        (b) => !b.drevBackupTidspunkt || b.drevBackupMappeId !== forbindelse?.mappeId
      ).length,
    });
  });

  r.get('/google/start', (req, res) => {
    if (!harGoogleDriveKonfiguration()) {
      return res.redirect('/?drev=ikke-konfigureret');
    }
    try {
      const state = crypto.randomBytes(32).toString('base64url');
      res.setHeader('Set-Cookie', stateCookie(req, state, 10 * 60));
      res.redirect(byggAuthUrl(state));
    } catch (err) {
      console.error('Kunne ikke bygge Google-godkendelses-URL:', err);
      res.redirect('/?drev=fejl');
    }
  });

  r.get('/google/callback', async (req, res) => {
    const kode = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    const forventetState = laesCookie(req.headers.cookie, GOOGLE_STATE_COOKIE);
    res.setHeader('Set-Cookie', stateCookie(req, '', 0));
    if (!kode || !erGyldigGoogleState(forventetState, state)) {
      return res.redirect('/?drev=fejl');
    }

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
      onForbundet();
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
