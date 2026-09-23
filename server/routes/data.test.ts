import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { Repository } from '../db/repository';
import { dataRoutes } from './data';

function findHandler(router: ReturnType<typeof dataRoutes>, path: string, _method: string) {
  const layer = router.stack.find(
    (candidate) => candidate.route?.path === path
  );
  return layer!.route!.stack[0]!.handle;
}

function svar() {
  const resultat = { status: 200, body: undefined as unknown };
  const res = {
    status(kode: number) {
      resultat.status = kode;
      return res;
    },
    json(body: unknown) {
      resultat.body = body;
      return res;
    },
    end() {
      return res;
    },
  } as unknown as Response;
  return { res, resultat };
}

describe('dataRoutes — låste indkomstår', () => {
  it('afviser oprettelse af en post på et låst år', async () => {
    const gemJob = vi.fn();
    const repo = {
      hentAlt: vi.fn().mockResolvedValue({
        indkomstAar: [{ id: 'aar-2026', aar: 2026, laast: true }],
        jobs: [],
        fradrag: [],
        investeringer: [],
      }),
      gemJob,
    } as unknown as Repository;
    const handler = findHandler(dataRoutes(repo), '/jobs/:id', 'put');
    const { res, resultat } = svar();

    await handler(
      { params: { id: 'job-1' }, body: { indkomstAarId: 'aar-2026' } } as unknown as Request,
      res,
      (fejl: unknown) => {
        throw fejl;
      }
    );

    expect(resultat.status).toBe(423);
    expect(gemJob).not.toHaveBeenCalled();
  });

  it('afviser at flytte en eksisterende post ud af et låst år', async () => {
    const gemJob = vi.fn();
    const repo = {
      hentAlt: vi.fn().mockResolvedValue({
        indkomstAar: [
          { id: 'laast-aar', aar: 2025, laast: true },
          { id: 'aabent-aar', aar: 2026, laast: false },
        ],
        jobs: [{ id: 'job-1', indkomstAarId: 'laast-aar' }],
        fradrag: [],
        investeringer: [],
      }),
      gemJob,
    } as unknown as Repository;
    const handler = findHandler(dataRoutes(repo), '/jobs/:id', 'put');
    const { res, resultat } = svar();

    await handler(
      { params: { id: 'job-1' }, body: { indkomstAarId: 'aabent-aar' } } as unknown as Request,
      res,
      (fejl: unknown) => {
        throw fejl;
      }
    );

    expect(resultat.status).toBe(423);
    expect(gemJob).not.toHaveBeenCalled();
  });

  it('tillader oplåsning uden at acceptere andre samtidige ændringer', async () => {
    const eksisterende = { id: 'aar-2026', aar: 2026, kommune: 'Slagelse', laast: true };
    const gemIndkomstAar = vi.fn(async (aar) => aar);
    const repo = {
      hentAlt: vi.fn().mockResolvedValue({ indkomstAar: [eksisterende] }),
      gemIndkomstAar,
    } as unknown as Repository;
    const handler = findHandler(dataRoutes(repo), '/indkomstaar/:id', 'put');
    const { res } = svar();

    await handler(
      {
        params: { id: 'aar-2026' },
        body: { ...eksisterende, kommune: 'København', laast: false },
      } as unknown as Request,
      res,
      (fejl: unknown) => {
        throw fejl;
      }
    );

    expect(gemIndkomstAar).toHaveBeenCalledWith({ ...eksisterende, laast: false });
  });
});
