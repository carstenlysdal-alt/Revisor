import { Router, type NextFunction, type Request, type Response } from 'express';
import { tjekKodeord } from './kodeord';
import {
  COOKIE_NAVN,
  laesCookie,
  lavToken,
  ryddetCookie,
  sessionCookie,
  tjekToken,
} from './session';
import { hastighedsgraense } from './rateLimit';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function harKodeord(): boolean {
  return Boolean(process.env.AUTH_PASSWORD_HASH);
}

function hemmelighed(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error(
      'SESSION_SECRET mangler. Uden den kan en session ikke signeres, og login ville være en attrap.'
    );
  }
  return s;
}

const erSikkerForbindelse = (req: Request) =>
  req.secure || req.get('x-forwarded-proto') === 'https';

/**
 * Kræver login på alt bag /api.
 *
 * Er der ikke sat et kodeord, lukkes kun loopback ind. Det holder lokal
 * udvikling fri for friktion og gør det umuligt at udrulle appen offentligt
 * uden adgangskontrol ved et uheld. Alternativet, at lade den stå åben med en
 * advarsel i loggen, er en advarsel ingen læser.
 */
export function kraevLogin(req: Request, res: Response, next: NextFunction) {
  if (!harKodeord()) {
    if (LOOPBACK.has(req.ip ?? '')) return next();
    return res.status(503).json({
      fejl:
        'Der er ikke sat noget kodeord på serveren, så appen svarer kun lokalt. ' +
        'Sæt AUTH_PASSWORD_HASH og SESSION_SECRET, før den gøres tilgængelig udefra.',
    });
  }

  if (tjekToken(laesCookie(req.headers.cookie, COOKIE_NAVN), hemmelighed())) {
    return next();
  }

  res.status(401).json({ fejl: 'Du er ikke logget ind.' });
}

export function authRoutes(): Router {
  const r = Router();

  r.get('/auth/status', (req, res) => {
    res.json({
      kraeverLogin: harKodeord(),
      loggetInd: harKodeord()
        ? tjekToken(laesCookie(req.headers.cookie, COOKIE_NAVN), hemmelighed())
        : LOOPBACK.has(req.ip ?? ''),
      kunLokalt: !harKodeord(),
    });
  });

  r.post(
    '/auth/login',
    // Fem forsøg i minuttet. Et kodeord kan ikke gættes igennem med den takt.
    hastighedsgraense({
      maks: 5,
      vinduMs: 60_000,
      besked: 'For mange loginforsøg.',
    }),
    (req, res) => {
      if (!harKodeord()) {
        return res.status(503).json({
          fejl: 'Der er ikke sat noget kodeord på serveren.',
        });
      }

      const kodeord = String(req.body?.kodeord ?? '');
      if (!tjekKodeord(kodeord, process.env.AUTH_PASSWORD_HASH!)) {
        // Samme besked uanset årsag. Der er ingen grund til at hjælpe med at
        // afgrænse gættet.
        return res.status(401).json({ fejl: 'Forkert kodeord.' });
      }

      res.setHeader(
        'Set-Cookie',
        sessionCookie(lavToken(hemmelighed()), erSikkerForbindelse(req))
      );
      res.json({ loggetInd: true });
    }
  );

  r.post('/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', ryddetCookie(erSikkerForbindelse(req)));
    res.json({ loggetInd: false });
  });

  return r;
}

export { hastighedsgraense };
