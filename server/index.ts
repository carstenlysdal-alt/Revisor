import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { FileRepository } from './db/fileRepository';
import { PostgresRepository } from './db/postgresRepository';
import type { Repository } from './db/repository';
import { FilArkiv } from './storage/bilag';
import type { BilagsLager } from './storage/lager';
import { dataRoutes } from './routes/data';
import { bilagRoutes } from './routes/bilag';
import { aiRoutes } from './routes/ai';
import { ruterRoutes } from './routes/ruter';
import { authRoutes, harKodeord, hastighedsgraense, kraevLogin } from './auth';
import { udbyderStatus } from './ai/faktor';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

async function opretLager(): Promise<{
  repo: Repository;
  arkiv: BilagsLager;
  navn: string;
}> {
  if (process.env.DATABASE_URL) {
    const pg = new PostgresRepository(process.env.DATABASE_URL);
    await pg.migrer();
    // Postgres er både datalager og bilagsarkiv. En container får nyt
    // filsystem ved hver udrulning, så bilag på disk ville forsvinde.
    return { repo: pg, arkiv: pg, navn: 'postgres' };
  }

  return {
    repo: new FileRepository(DATA_DIR),
    arkiv: new FilArkiv(DATA_DIR),
    navn: `fil (${DATA_DIR})`,
  };
}

async function start() {
  const app = express();

  // Railway terminerer TLS foran appen. Uden dette ser Express alle kald som
  // ukrypterede og fra samme IP, hvilket ville gøre både Secure-cookien og
  // hastighedsbegrænsningen virkningsløs.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  app.use(express.json({ limit: '30mb' }));

  const { repo, arkiv, navn: lagernavn } = await opretLager();

  // Sundhedstjek uden login, så Railway kan se om containeren lever. Den
  // røber ikke andet end at appen kører.
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', authRoutes());

  // Alt herunder kræver login. Bilagene ligger bag den her linje.
  app.use('/api', kraevLogin);

  app.use('/api', dataRoutes(repo));
  app.use('/api', bilagRoutes(repo, arkiv));
  app.use(
    '/api',
    // AI-kald koster penge pr. gang, også for den der er logget ind.
    hastighedsgraense({
      maks: 30,
      vinduMs: 60_000,
      besked: 'Der er sendt mange AI-kald på kort tid.',
    }),
    aiRoutes(repo, arkiv)
  );
  app.use(
    '/api',
    // Beskytter det gratis kvoteloft hos OpenRouteService (2.500/dag).
    hastighedsgraense({
      maks: 20,
      vinduMs: 60_000,
      besked: 'Der er sendt mange ruteopslag på kort tid.',
    }),
    ruterRoutes()
  );

  app.use('/api', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Serverfejl:', err);
    res.status(500).json({ fejl: 'Der gik noget galt på serveren. Prøv igen.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Revisor kører på port ${PORT}. Lager: ${lagernavn}.`);

    const ai = udbyderStatus();
    console.log(
      ai.klar
        ? `AI-udbyder: ${ai.udbyder} (${ai.modeller?.tekst}).`
        : 'Ingen AI-nøgle. Bilagslæsning og revisor-chat er slået fra.'
    );

    if (!harKodeord()) {
      console.warn(
        'AUTH_PASSWORD_HASH er ikke sat. Appen svarer kun på kald fra denne maskine. ' +
          'Kør "npm run kodeord" og sæt hashet, før den udrulles.'
      );
    }
  });
}

start().catch((err) => {
  console.error('Serveren kunne ikke starte:', err);
  process.exit(1);
});
