import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { Repository } from '../db/repository';
import type { BilagsLager } from '../storage/lager';
import { bilagRoutes } from './bilag';

function nulstilHandler(repo: Repository, arkiv: BilagsLager) {
  const router = bilagRoutes(repo, arkiv);
  return router.stack.find((candidate) => candidate.route?.path === '/nulstil')!
    .route!.stack[0]!.handle;
}

const req = { body: { bekraeftelse: 'SLET ALT' } } as Request;

function svar() {
  const json = vi.fn();
  return { json, res: { json } as unknown as Response };
}

describe('bilagRoutes — sikker nulstilling', () => {
  it('rører ikke bilagsfilerne, hvis databasen ikke kan nulstilles', async () => {
    const slet = vi.fn();
    const repo = {
      hentAlt: vi.fn().mockResolvedValue({
        bilag: [{ id: 'b1', sha256: 'hash-1', mimeType: 'application/pdf' }],
      }),
      nulstilRegnskab: vi.fn().mockRejectedValue(new Error('databasefejl')),
    } as unknown as Repository;
    const next = vi.fn();

    await nulstilHandler(repo, { slet } as unknown as BilagsLager)(req, svar().res, next);

    expect(slet).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'databasefejl' }));
  });

  it('nulstiller regnskabet før bilagsfilerne ryddes og fuldfører ved en filfejl', async () => {
    const raekkefoelge: string[] = [];
    const repo = {
      hentAlt: vi.fn().mockResolvedValue({
        bilag: [
          { id: 'b1', sha256: 'hash-1', mimeType: 'application/pdf' },
          { id: 'b2', sha256: 'hash-2', mimeType: 'application/pdf' },
        ],
      }),
      nulstilRegnskab: vi.fn(async () => {
        raekkefoelge.push('database');
      }),
    } as unknown as Repository;
    const slet = vi.fn(async (hash: string) => {
      raekkefoelge.push(hash);
      if (hash === 'hash-1') throw new Error('filfejl');
    });
    const consoleFejl = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { res, json } = svar();

    await nulstilHandler(repo, { slet } as unknown as BilagsLager)(req, res, (fejl) => {
      throw fejl;
    });

    expect(raekkefoelge).toEqual(['database', 'hash-1', 'hash-2']);
    expect(json).toHaveBeenCalledWith({ ok: true });
    consoleFejl.mockRestore();
  });
});
