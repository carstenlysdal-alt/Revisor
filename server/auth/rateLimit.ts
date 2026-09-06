import type { NextFunction, Request, Response } from 'express';

/**
 * Simpel hastighedsbegrænsning i hukommelsen.
 *
 * Nok til én instans med én bruger. To steder er den nødvendig: på login, så
 * kodeordet ikke kan gættes igennem, og på AI-ruterne, så en åben URL ikke kan
 * bruge af regningen.
 */
interface Spand {
  antal: number;
  nulstillesVed: number;
}

export function hastighedsgraense(opts: {
  maks: number;
  vinduMs: number;
  besked: string;
}) {
  const spande = new Map<string, Spand>();

  return (req: Request, res: Response, next: NextFunction) => {
    const noegle = req.ip ?? 'ukendt';
    const nu = Date.now();
    const spand = spande.get(noegle);

    if (!spand || nu > spand.nulstillesVed) {
      spande.set(noegle, { antal: 1, nulstillesVed: nu + opts.vinduMs });
      return next();
    }

    if (spand.antal >= opts.maks) {
      const sekunder = Math.ceil((spand.nulstillesVed - nu) / 1000);
      res.setHeader('Retry-After', String(sekunder));
      return res.status(429).json({ fejl: `${opts.besked} Prøv igen om ${sekunder} sekunder.` });
    }

    spand.antal += 1;
    next();
  };
}
