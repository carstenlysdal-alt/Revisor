import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileRepository } from '../db/fileRepository';
import { beregnHash, FilArkiv } from '../storage/bilag';
import { koerGoogleDriveBackup } from './automatiskBackup';

describe('automatisk Google Drev-backup', () => {
  let dataDir: string;
  let repo: FileRepository;
  let arkiv: FilArkiv;

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'revisor-drive-backup-'));
    repo = new FileRepository(dataDir);
    arkiv = new FilArkiv(dataDir);
    await repo.gemGoogleDriveForbindelse({
      refreshToken: 'refresh-1',
      mappeId: 'mappe-1',
      snapshotFilId: null,
      forbundetTidspunkt: '2026-01-01T00:00:00.000Z',
      sidsteFejl: null,
      sidsteFejlTidspunkt: null,
    });
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('uploader originalbilaget én gang og opdaterer det komplette snapshot', async () => {
    const indhold = Buffer.from('original kvittering');
    const sha256 = beregnHash(indhold);
    await arkiv.gem(indhold, 'application/pdf');
    await repo.gemBilag({
      id: 'bilag-1',
      sha256,
      filnavn: 'kvittering.pdf',
      mimeType: 'application/pdf',
      stoerrelse: indhold.length,
      uploadet: '2026-01-02T00:00:00.000Z',
    });

    const upload = vi.fn().mockResolvedValue('drive-bilag-1');
    const opdaterSnapshot = vi.fn().mockResolvedValue('snapshot-1');
    const handlinger = {
      upload,
      opdaterSnapshot,
      nu: () => '2026-01-03T00:00:00.000Z',
    };

    await koerGoogleDriveBackup(repo, arkiv, handlinger);
    await koerGoogleDriveBackup(repo, arkiv, handlinger);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(
      'refresh-1',
      'mappe-1',
      'kvittering.pdf',
      indhold,
      'application/pdf'
    );
    expect(opdaterSnapshot).toHaveBeenCalledTimes(2);
    const sikkerhedskopi = JSON.parse(opdaterSnapshot.mock.calls[0][3]);
    expect(sikkerhedskopi.bilag[0].drevBackupTidspunkt).toBe('2026-01-03T00:00:00.000Z');

    const gemtBilag = await repo.hentBilag('bilag-1');
    expect(gemtBilag?.drevBackupTidspunkt).toBe('2026-01-03T00:00:00.000Z');
    expect((await repo.hentGoogleDriveForbindelse())?.snapshotFilId).toBe('snapshot-1');
  });

  it('gemmer en læsbar fejlstatus uden at miste databaseindholdet', async () => {
    await repo.gemBilag({
      id: 'bilag-uden-fil',
      sha256: 'mangler',
      filnavn: 'mangler.pdf',
      mimeType: 'application/pdf',
      stoerrelse: 10,
      uploadet: '2026-01-02T00:00:00.000Z',
    });

    await koerGoogleDriveBackup(repo, arkiv, {
      upload: vi.fn(),
      opdaterSnapshot: vi.fn().mockResolvedValue('snapshot-1'),
      nu: () => '2026-01-03T00:00:00.000Z',
    });

    const bilag = await repo.hentBilag('bilag-uden-fil');
    const forbindelse = await repo.hentGoogleDriveForbindelse();
    expect(bilag?.drevBackupFejl).toMatch(/findes ikke/i);
    expect(forbindelse?.sidsteFejl).toMatch(/mangler\.pdf/i);
    expect((await repo.hentAlt()).bilag).toHaveLength(1);
  });
});
