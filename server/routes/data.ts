import { Router } from 'express';
import type { Repository } from '../db/repository';

export function dataRoutes(repo: Repository, onAendring: () => void = () => undefined): Router {
  const r = Router();

  r.get('/data', async (_req, res, next) => {
    try {
      res.json(await repo.hentAlt());
    } catch (err) {
      next(err);
    }
  });

  r.put('/indkomstaar/:id', async (req, res, next) => {
    try {
      const gemt = await repo.gemIndkomstAar({ ...req.body, id: req.params.id });
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.delete('/indkomstaar/:id', async (req, res, next) => {
    try {
      await repo.sletIndkomstAar(req.params.id);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/jobs/:id', async (req, res, next) => {
    try {
      const gemt = await repo.gemJob({ ...req.body, id: req.params.id });
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.delete('/jobs/:id', async (req, res, next) => {
    try {
      await repo.sletJob(req.params.id);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/fradrag/:id', async (req, res, next) => {
    try {
      const gemt = await repo.gemFradrag({ ...req.body, id: req.params.id });
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.delete('/fradrag/:id', async (req, res, next) => {
    try {
      await repo.sletFradrag(req.params.id);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/investeringer/:id', async (req, res, next) => {
    try {
      const gemt = await repo.gemInvestering({ ...req.body, id: req.params.id });
      onAendring();
      res.json(gemt);
    } catch (err) {
      next(err);
    }
  });

  r.delete('/investeringer/:id', async (req, res, next) => {
    try {
      await repo.sletInvestering(req.params.id);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/opsparing/:indkomstAarId', async (req, res, next) => {
    try {
      await repo.gemOpsparing(req.params.indkomstAarId, req.body);
      onAendring();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return r;
}
