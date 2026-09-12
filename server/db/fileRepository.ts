import fs from 'fs/promises';
import path from 'path';
import type {
  Bilag,
  Fradrag,
  IndkomstAar,
  Investering,
  Job,
  OpsparingsTracker,
} from '../../src/types';
import { DataSnapshot, GoogleDriveForbindelse, Repository, tomtSnapshot } from './repository';

/**
 * Fil-baseret lager. Holder hele datasættet i én JSON-fil under DATA_DIR.
 *
 * Skrivninger er atomiske (skriv til temp, omdøb) og serialiseres gennem en
 * kø, så to samtidige kald ikke overskriver hinanden. Det rækker til én
 * bruger på én maskine, og det er præcis så langt, det er meningen den skal
 * nå: når DATABASE_URL peger på Railway, træder Postgres-driveren i stedet.
 */
export class FileRepository implements Repository {
  private readonly filsti: string;
  /**
   * Bevidst en helt separat fil fra data.json. refresh-tokenet er den eneste
   * reelle hemmelighed i hele lageret, og /api/data sender data.json's
   * indhold ukrypteret til klienten — de to må aldrig kunne blandes sammen
   * ved en fremtidig rettelse et andet sted i koden.
   */
  private readonly driveFilsti: string;
  private kø: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filsti = path.join(dataDir, 'data.json');
    this.driveFilsti = path.join(dataDir, 'google-drive.json');
  }

  private async læs(): Promise<DataSnapshot> {
    try {
      const rå = await fs.readFile(this.filsti, 'utf8');
      return { ...tomtSnapshot(), ...JSON.parse(rå) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return tomtSnapshot();
      throw err;
    }
  }

  private async skriv(snapshot: DataSnapshot): Promise<void> {
    await fs.mkdir(path.dirname(this.filsti), { recursive: true });
    const temp = `${this.filsti}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(snapshot, null, 2), 'utf8');
    await fs.rename(temp, this.filsti);
  }

  /** Kører en læs-ændr-skriv i kø, så samtidige kald ikke taber data. */
  private transaktion<T>(fn: (s: DataSnapshot) => T | Promise<T>): Promise<T> {
    const næste = this.kø.then(async () => {
      const snapshot = await this.læs();
      const resultat = await fn(snapshot);
      await this.skriv(snapshot);
      return resultat;
    });
    this.kø = næste.catch(() => undefined);
    return næste;
  }

  private static opsæt<T extends { id: string }>(liste: T[], post: T): T {
    const i = liste.findIndex((p) => p.id === post.id);
    if (i >= 0) liste[i] = post;
    else liste.unshift(post);
    return post;
  }

  hentAlt(): Promise<DataSnapshot> {
    return this.læs();
  }

  gemIndkomstAar(aar: IndkomstAar) {
    return this.transaktion((s) => FileRepository.opsæt(s.indkomstAar, aar));
  }

  sletIndkomstAar(id: string) {
    return this.transaktion<void>((s) => {
      s.indkomstAar = s.indkomstAar.filter((a) => a.id !== id);
      s.jobs = s.jobs.filter((j) => j.indkomstAarId !== id);
      s.fradrag = s.fradrag.filter((f) => f.indkomstAarId !== id);
      s.investeringer = s.investeringer.filter((i) => i.indkomstAarId !== id);
      delete s.opsparing[id];
    });
  }

  gemJob(job: Job) {
    return this.transaktion((s) => FileRepository.opsæt(s.jobs, job));
  }

  sletJob(id: string) {
    return this.transaktion<void>((s) => {
      s.jobs = s.jobs.filter((j) => j.id !== id);
    });
  }

  gemFradrag(fradrag: Fradrag) {
    return this.transaktion((s) => FileRepository.opsæt(s.fradrag, fradrag));
  }

  sletFradrag(id: string) {
    return this.transaktion<void>((s) => {
      s.fradrag = s.fradrag.filter((f) => f.id !== id);
    });
  }

  gemInvestering(investering: Investering) {
    return this.transaktion((s) => FileRepository.opsæt(s.investeringer, investering));
  }

  sletInvestering(id: string) {
    return this.transaktion<void>((s) => {
      s.investeringer = s.investeringer.filter((i) => i.id !== id);
    });
  }

  gemOpsparing(indkomstAarId: string, data: OpsparingsTracker) {
    return this.transaktion<void>((s) => {
      s.opsparing[indkomstAarId] = data;
    });
  }

  gemBilag(bilag: Bilag) {
    return this.transaktion((s) => FileRepository.opsæt(s.bilag, bilag));
  }

  async findBilagVedHash(sha256: string): Promise<Bilag | null> {
    const s = await this.læs();
    return s.bilag.find((b) => b.sha256 === sha256) ?? null;
  }

  async hentBilag(id: string): Promise<Bilag | null> {
    const s = await this.læs();
    return s.bilag.find((b) => b.id === id) ?? null;
  }

  opdaterBilagDriveStatus(id: string, tidspunkt: string | null, fejl: string | null) {
    return this.transaktion<void>((s) => {
      const bilag = s.bilag.find((b) => b.id === id);
      if (!bilag) return;
      bilag.drevBackupTidspunkt = tidspunkt;
      bilag.drevBackupFejl = fejl;
    });
  }

  sletBilag(id: string) {
    return this.transaktion<void>((s) => {
      s.bilag = s.bilag.filter((b) => b.id !== id);
      s.jobs.forEach((j) => (j.bilagIds = j.bilagIds.filter((x) => x !== id)));
      s.fradrag.forEach((f) => (f.bilagIds = f.bilagIds.filter((x) => x !== id)));
      s.investeringer.forEach((i) => (i.bilagIds = i.bilagIds.filter((x) => x !== id)));
    });
  }

  erstatAlt(snapshot: DataSnapshot) {
    return this.transaktion<void>((s) => {
      Object.assign(s, snapshot);
    });
  }

  /* ---------------------------------------------- Google Drive-forbindelse */

  async hentGoogleDriveForbindelse(): Promise<GoogleDriveForbindelse | null> {
    try {
      const rå = await fs.readFile(this.driveFilsti, 'utf8');
      return JSON.parse(rå) as GoogleDriveForbindelse;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async gemGoogleDriveForbindelse(forbindelse: GoogleDriveForbindelse): Promise<void> {
    await fs.mkdir(path.dirname(this.driveFilsti), { recursive: true });
    const temp = `${this.driveFilsti}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(forbindelse, null, 2), 'utf8');
    await fs.rename(temp, this.driveFilsti);
  }

  async sletGoogleDriveForbindelse(): Promise<void> {
    await fs.rm(this.driveFilsti, { force: true });
  }
}
