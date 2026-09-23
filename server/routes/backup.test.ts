import { Writable } from 'stream';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { Repository } from '../db/repository';
import type { BilagsLager } from '../storage/lager';
import { beregnHash } from '../storage/bilag';
import { backupRoutes, sikkertBackupFilnavn } from './backup';

class TestSvar extends Writable {
  readonly headers = new Map<string, string>();
  readonly dele: Buffer[] = [];
  statusCode = 200;
  jsonBody: unknown;

  setHeader(navn: string, vaerdi: string) {
    this.headers.set(navn.toLowerCase(), String(vaerdi));
    return this;
  }

  status(kode: number) {
    this.statusCode = kode;
    return this;
  }

  json(body: unknown) {
    this.jsonBody = body;
    this.end();
    return this;
  }

  _write(chunk: Buffer, _encoding: BufferEncoding, done: (fejl?: Error | null) => void) {
    this.dele.push(Buffer.from(chunk));
    done();
  }
}

describe('backupRoutes', () => {
  it('fjerner mapper og ugyldige tegn fra bilagsfilnavne', () => {
    expect(sikkertBackupFilnavn('../../privat?.pdf')).toBe('privat_.pdf');
    expect(sikkertBackupFilnavn('C:\\kvitteringer\\bro:2026.jpg')).toBe('bro_2026.jpg');
  });

  it('streamer en komplet ZIP med data og originalbilag', async () => {
    const original = Buffer.from('%PDF-test');
    const sha256 = beregnHash(original);
    const bilag = {
      id: 'bilag-1',
      sha256,
      filnavn: 'kvittering.pdf',
      mimeType: 'application/pdf',
      stoerrelse: 8,
      uploadet: '2026-09-23T00:00:00.000Z',
    };
    const repo = {
      hentAlt: vi.fn().mockResolvedValue({
        profil: { navn: 'Test', hjemmeadresse: '', kommune: '' },
        indkomstAar: [],
        jobs: [],
        fradrag: [],
        investeringer: [],
        opsparing: {},
        bilag: [bilag],
      }),
      hentChatHistorik: vi.fn().mockResolvedValue([]),
    } as unknown as Repository;
    const hent = vi.fn().mockResolvedValue(original);
    const router = backupRoutes(
      repo,
      { hent } as unknown as BilagsLager,
      () => new Date('2026-09-23T12:34:56.000Z')
    );
    const handler = router.stack.find((lag) => lag.route?.path === '/backup')!.route!.stack[0]!
      .handle;
    const svar = new TestSvar();
    const faerdig = new Promise<void>((resolve, reject) => {
      svar.once('finish', resolve);
      svar.once('error', reject);
    });

    await handler({} as Request, svar as unknown as Response, (fejl: unknown) => {
      throw fejl;
    });
    await faerdig;

    const zip = Buffer.concat(svar.dele);
    expect(svar.headers.get('content-type')).toBe('application/zip');
    expect(svar.headers.get('content-disposition')).toContain(
      'revis-komplet-backup-2026-09-23-12-34-56.zip'
    );
    expect(zip.subarray(0, 2).toString()).toBe('PK');
    expect(zip.includes(Buffer.from('data.json'))).toBe(true);
    expect(zip.includes(Buffer.from('manifest.json'))).toBe(true);
    expect(zip.includes(Buffer.from(`bilag/${sha256.slice(0, 12)}-kvittering.pdf`))).toBe(true);
    expect(hent).toHaveBeenCalledTimes(2);
  });

  it('afviser download, hvis et originalbilag ikke kan verificeres', async () => {
    const repo = {
      hentAlt: vi.fn().mockResolvedValue({
        profil: { navn: 'Test', hjemmeadresse: '', kommune: '' },
        indkomstAar: [],
        jobs: [],
        fradrag: [],
        investeringer: [],
        opsparing: {},
        bilag: [
          {
            id: 'bilag-1',
            sha256: 'a'.repeat(64),
            filnavn: 'mangler.pdf',
            mimeType: 'application/pdf',
            stoerrelse: 8,
            uploadet: '2026-09-23T00:00:00.000Z',
          },
        ],
      }),
      hentChatHistorik: vi.fn().mockResolvedValue([]),
    } as unknown as Repository;
    const router = backupRoutes(repo, {
      hent: vi.fn().mockResolvedValue(Buffer.from('forkert indhold')),
    } as unknown as BilagsLager);
    const handler = router.stack.find((lag) => lag.route?.path === '/backup')!.route!.stack[0]!
      .handle;
    const svar = new TestSvar();

    await handler({} as Request, svar as unknown as Response, (fejl: unknown) => {
      throw fejl;
    });

    expect(svar.statusCode).toBe(409);
    expect(svar.jsonBody).toEqual({
      fejl: 'Sikkerhedskopien blev ikke hentet, fordi originalfilen “mangler.pdf” mangler eller er beskadiget.',
    });
    expect(svar.headers.has('content-disposition')).toBe(false);
  });
});
