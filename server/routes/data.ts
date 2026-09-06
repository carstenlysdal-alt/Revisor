import { Router } from 'express';
import type { Repository } from '../db/repository';

export function dataRoutes(repo: Repository): Router {
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
      res.json(await repo.gemIndkomstAar({ ...req.body, id: req.params.id }));
    } catch (err) {
      next(err);
    }
  });

  r.delete('/indkomstaar/:id', async (req, res, next) => {
    try {
      await repo.sletIndkomstAar(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/jobs/:id', async (req, res, next) => {
    try {
      res.json(await repo.gemJob({ ...req.body, id: req.params.id }));
    } catch (err) {
      next(err);
    }
  });

  r.delete('/jobs/:id', async (req, res, next) => {
    try {
      await repo.sletJob(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/fradrag/:id', async (req, res, next) => {
    try {
      res.json(await repo.gemFradrag({ ...req.body, id: req.params.id }));
    } catch (err) {
      next(err);
    }
  });

  r.delete('/fradrag/:id', async (req, res, next) => {
    try {
      await repo.sletFradrag(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/investeringer/:id', async (req, res, next) => {
    try {
      res.json(await repo.gemInvestering({ ...req.body, id: req.params.id }));
    } catch (err) {
      next(err);
    }
  });

  r.delete('/investeringer/:id', async (req, res, next) => {
    try {
      await repo.sletInvestering(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.put('/opsparing/:indkomstAarId', async (req, res, next) => {
    try {
      await repo.gemOpsparing(req.params.indkomstAarId, req.body);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return r;
}
