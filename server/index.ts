import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { FileRepository } from './db/fileRepository';
import { BilagsArkiv } from './storage/bilag';
import { dataRoutes } from './routes/data';
import { bilagRoutes } from './routes/bilag';
import { aiRoutes } from './routes/ai';
import { harAiUdbyder, udbyderStatus } from './ai/faktor';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

const app = express();
app.use(express.json({ limit: '30mb' }));

const repo = new FileRepository(DATA_DIR);
const arkiv = new BilagsArkiv(DATA_DIR);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    ai: udbyderStatus(),
    lager: process.env.DATABASE_URL ? 'postgres' : 'fil',
  });
});

app.use('/api', dataRoutes(repo));
app.use('/api', bilagRoutes(repo, arkiv));
app.use('/api', aiRoutes(repo, arkiv));

app.use('/api', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Serverfejl:', err);
  res.status(500).json({ fejl: 'Der gik noget galt på serveren. Prøv igen.' });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Revisor AI kører på http://localhost:${PORT}`);
    const ai = udbyderStatus();
    if (ai.klar) {
      console.log(`AI-udbyder: ${ai.udbyder} (${ai.modeller?.tekst}).`);
    } else {
      console.warn(
        'Der er ingen AI-nøgle. Bilagslæsning og revisor-chat er slået fra, indtil ' +
          'GEMINI_API_KEY eller DEEPSEEK_API_KEY er sat i .env.'
      );
    }
    if (!process.env.DATABASE_URL) {
      console.log(`Data gemmes i ${DATA_DIR}. Sæt DATABASE_URL for at bruge Postgres.`);
    }
  });
}

start();
