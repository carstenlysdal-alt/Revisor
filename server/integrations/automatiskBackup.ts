import type { Repository } from '../db/repository';
import type { BilagsLager } from '../storage/lager';
import {
  GoogleDriveTokenUdloebetError,
  opdaterDatasnapshot,
  uploadTilDrive,
} from './googleDrive';

type DriveHandlinger = {
  upload: typeof uploadTilDrive;
  opdaterSnapshot: typeof opdaterDatasnapshot;
  nu: () => string;
};

const standardHandlinger: DriveHandlinger = {
  upload: uploadTilDrive,
  opdaterSnapshot: opdaterDatasnapshot,
  nu: () => new Date().toISOString(),
};

function fejltekst(fejl: unknown): string {
  return fejl instanceof Error ? fejl.message : 'Google Drev-backuppen fejlede.';
}

/**
 * Gemmer alle endnu ikke sikkerhedskopierede originalbilag og et komplet
 * datasnapshot. Funktionen sluger Google-fejl efter at have gemt dem i
 * statusfelterne; en kortvarig fejl hos Google må aldrig få en almindelig
 * databasegemning i Revisor til at se fejlet ud.
 */
export async function koerGoogleDriveBackup(
  repo: Repository,
  arkiv: BilagsLager,
  handlinger: DriveHandlinger = standardHandlinger
): Promise<void> {
  const forbindelse = await repo.hentGoogleDriveForbindelse();
  if (!forbindelse?.mappeId) return;

  const fejl: string[] = [];
  let tokenUdloebet = false;
  const snapshot = await repo.hentAlt();

  for (const bilag of snapshot.bilag.filter((b) => !b.drevBackupTidspunkt)) {
    try {
      const indhold = await arkiv.hent(bilag.sha256, bilag.mimeType);
      await handlinger.upload(
        forbindelse.refreshToken,
        forbindelse.mappeId,
        bilag.filnavn,
        indhold,
        bilag.mimeType
      );
      await repo.opdaterBilagDriveStatus(bilag.id, handlinger.nu(), null);
    } catch (err) {
      const besked = fejltekst(err);
      fejl.push(`${bilag.filnavn}: ${besked}`);
      await repo.opdaterBilagDriveStatus(bilag.id, null, besked);
      if (err instanceof GoogleDriveTokenUdloebetError) {
        tokenUdloebet = true;
        break;
      }
    }
  }

  let snapshotFilId = forbindelse.snapshotFilId;
  if (!tokenUdloebet) {
    try {
      const friskSnapshot = await repo.hentAlt();
      snapshotFilId = await handlinger.opdaterSnapshot(
        forbindelse.refreshToken,
        forbindelse.mappeId,
        forbindelse.snapshotFilId,
        JSON.stringify(friskSnapshot, null, 2)
      );
    } catch (err) {
      fejl.push(`Datasnapshot: ${fejltekst(err)}`);
    }
  }

  // Forbindelsen kan være afbrudt, mens uploaden kørte. I så fald må den
  // gamle refresh-token-række ikke genskabes.
  const stadigForbundet = await repo.hentGoogleDriveForbindelse();
  if (!stadigForbundet || stadigForbundet.refreshToken !== forbindelse.refreshToken) return;

  await repo.gemGoogleDriveForbindelse({
    ...stadigForbundet,
    snapshotFilId,
    sidsteFejl: fejl.length ? fejl.join('\n') : null,
    sidsteFejlTidspunkt: fejl.length ? handlinger.nu() : null,
  });
}

/** Serialiserer og samler mange hurtige ændringer til én backupkørsel. */
export function opretAutomatiskDriveBackup(repo: Repository, arkiv: BilagsLager) {
  let koe: Promise<void> = Promise.resolve();
  let planlagt: ReturnType<typeof setTimeout> | null = null;

  const koerNu = (): Promise<void> => {
    if (planlagt) {
      clearTimeout(planlagt);
      planlagt = null;
    }
    koe = koe
      .then(() => koerGoogleDriveBackup(repo, arkiv))
      .catch((err) => console.error('Google Drev-backup kunne ikke startes:', err));
    return koe;
  };

  const planlaeg = () => {
    if (planlagt) clearTimeout(planlagt);
    planlagt = setTimeout(() => {
      planlagt = null;
      void koerNu();
    }, 300);
  };

  return { koerNu, planlaeg };
}
