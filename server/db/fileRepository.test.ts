import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileRepository } from './fileRepository';

/**
 * Sikkerhedskritisk: /api/data sender hentAlt()'s indhold ukrypteret til
 * klienten. Et refresh token i den samme fil ville følge med.
 */
describe('FileRepository — Google Drive-forbindelsen', () => {
  let dataDir: string;
  let repo: FileRepository;

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'revisor-repo-test-'));
    repo = new FileRepository(dataDir);
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('gemmes og læses tilbage uændret', async () => {
    expect(await repo.hentGoogleDriveForbindelse()).toBeNull();

    await repo.gemGoogleDriveForbindelse({
      refreshToken: 'hemmeligt-token',
      mappeId: 'mappe-1',
      snapshotFilId: null,
      forbundetTidspunkt: '2026-01-01T00:00:00.000Z',
      sidsteFejl: null,
      sidsteFejlTidspunkt: null,
    });

    expect(await repo.hentGoogleDriveForbindelse()).toEqual({
      refreshToken: 'hemmeligt-token',
      mappeId: 'mappe-1',
      snapshotFilId: null,
      forbundetTidspunkt: '2026-01-01T00:00:00.000Z',
      sidsteFejl: null,
      sidsteFejlTidspunkt: null,
    });
  });

  it('ligger i en helt separat fil fra data.json', async () => {
    await repo.gemGoogleDriveForbindelse({
      refreshToken: 'hemmeligt-token',
      mappeId: null,
      snapshotFilId: null,
      forbundetTidspunkt: '2026-01-01T00:00:00.000Z',
      sidsteFejl: null,
      sidsteFejlTidspunkt: null,
    });

    const dataJson = await fs.readFile(path.join(dataDir, 'data.json'), 'utf8').catch(() => '');
    expect(dataJson).not.toContain('hemmeligt-token');

    const driveJson = await fs.readFile(path.join(dataDir, 'google-drive.json'), 'utf8');
    expect(driveJson).toContain('hemmeligt-token');
  });

  it('hentAlt() indeholder aldrig refresh-tokenet, heller ikke efter en forbindelse er gemt', async () => {
    await repo.gemIndkomstAar({
      id: 'aar-1',
      aar: 2026,
      hjemmeadresse: '',
      kommune: '',
      kommuneSkatteprocent: 0,
      kirkeskatteprocent: 0,
      forventetAIndkomst: 0,
      forventetPensionSUDagpenge: 0,
      forventedeFradragAIndkomst: 0,
      medlemFolkekirken: false,
      enligForsoerger: false,
      laast: false,
    });
    await repo.gemGoogleDriveForbindelse({
      refreshToken: 'hemmeligt-token',
      mappeId: 'mappe-1',
      snapshotFilId: null,
      forbundetTidspunkt: '2026-01-01T00:00:00.000Z',
      sidsteFejl: null,
      sidsteFejlTidspunkt: null,
    });

    const snapshot = await repo.hentAlt();

    expect(JSON.stringify(snapshot)).not.toContain('hemmeligt-token');
  });

  it('kan slettes', async () => {
    await repo.gemGoogleDriveForbindelse({
      refreshToken: 'hemmeligt-token',
      mappeId: null,
      snapshotFilId: null,
      forbundetTidspunkt: '2026-01-01T00:00:00.000Z',
      sidsteFejl: null,
      sidsteFejlTidspunkt: null,
    });

    await repo.sletGoogleDriveForbindelse();

    expect(await repo.hentGoogleDriveForbindelse()).toBeNull();
  });
});
