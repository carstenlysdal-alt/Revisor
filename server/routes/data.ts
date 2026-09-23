import { Router, type Response } from 'express';
import type { Repository } from '../db/repository';

async function afvisHvisAarErLaast(
  repo: Repository,
  indkomstAarId: string | undefined,
  res: Response
): Promise<boolean> {
  if (!indkomstAarId) return false;
  const aar = (await repo.hentAlt()).indkomstAar.find((post) => post.id === indkomstAarId);
  if (!aar?.laast) return false;
  res.status(423).json({ fejl: `Indkomståret ${aar.aar} er låst. Lås det op først.` });
  return true;
}

export function dataRoutes(repo: Repository, onAendring: () => void = () => undefined): Router {
  const r = Router();

  r.get('/data', async (_req, res, next) => {
    try {
      res.json(await repo.hentAlt());
    } catch (err) {
      next(err);
    }
  });

  r.get('/profil', async (_req, res, next) => {
    try {
      res.json(await repo.hentProfil());
    } catch (err) {
      next(err);
    }
  });

  r.put('/profil', async (req, res, next) => {
    try {
      const gemt = await repo.gemProfil(req.body);
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.put('/indkomstaar/:id', async (req, res, next) => {
    try {
      const eksisterende = (await repo.hentAlt()).indkomstAar.find(
        (aar) => aar.id === req.params.id
      );
      if (eksisterende?.laast && req.body?.laast !== false) {
        res.status(423).json({
          fejl: `Indkomståret ${eksisterende.aar} er låst. Lås det op først.`,
        });
        return;
      }
      const naeste = eksisterende?.laast
        ? { ...eksisterende, laast: false }
        : { ...req.body, id: req.params.id };
      const gemt = await repo.gemIndkomstAar(naeste);
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.delete('/indkomstaar/:id', async (req, res, next) => {
    try {
      if (await afvisHvisAarErLaast(repo, req.params.id, res)) return;
      await repo.sletIndkomstAar(req.params.id);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/jobs/:id', async (req, res, next) => {
    try {
      const eksisterende = (await repo.hentAlt()).jobs.find((post) => post.id === req.params.id);
      if (await afvisHvisAarErLaast(repo, eksisterende?.indkomstAarId, res)) return;
      if (await afvisHvisAarErLaast(repo, req.body?.indkomstAarId, res)) return;
      const gemt = await repo.gemJob({ ...req.body, id: req.params.id });
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.delete('/jobs/:id', async (req, res, next) => {
    try {
      const job = (await repo.hentAlt()).jobs.find((post) => post.id === req.params.id);
      if (await afvisHvisAarErLaast(repo, job?.indkomstAarId, res)) return;
      await repo.sletJob(req.params.id);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/fradrag/:id', async (req, res, next) => {
    try {
      const eksisterende = (await repo.hentAlt()).fradrag.find(
        (post) => post.id === req.params.id
      );
      if (await afvisHvisAarErLaast(repo, eksisterende?.indkomstAarId, res)) return;
      if (await afvisHvisAarErLaast(repo, req.body?.indkomstAarId, res)) return;
      const gemt = await repo.gemFradrag({ ...req.body, id: req.params.id });
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.delete('/fradrag/:id', async (req, res, next) => {
    try {
      const fradrag = (await repo.hentAlt()).fradrag.find((post) => post.id === req.params.id);
      if (await afvisHvisAarErLaast(repo, fradrag?.indkomstAarId, res)) return;
      await repo.sletFradrag(req.params.id);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/investeringer/:id', async (req, res, next) => {
    try {
      const eksisterende = (await repo.hentAlt()).investeringer.find(
        (post) => post.id === req.params.id
      );
      if (await afvisHvisAarErLaast(repo, eksisterende?.indkomstAarId, res)) return;
      if (await afvisHvisAarErLaast(repo, req.body?.indkomstAarId, res)) return;
      const gemt = await repo.gemInvestering({ ...req.body, id: req.params.id });
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.delete('/investeringer/:id', async (req, res, next) => {
    try {
      const investering = (await repo.hentAlt()).investeringer.find(
        (post) => post.id === req.params.id
      );
      if (await afvisHvisAarErLaast(repo, investering?.indkomstAarId, res)) return;
      await repo.sletInvestering(req.params.id);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/opsparing/:indkomstAarId', async (req, res, next) => {
    try {
      if (await afvisHvisAarErLaast(repo, req.params.indkomstAarId, res)) return;
      await repo.gemOpsparing(req.params.indkomstAarId, req.body);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return r;
}
