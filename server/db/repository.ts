import type {
  Bilag,
  Fradrag,
  IndkomstAar,
  Investering,
  Job,
  OpsparingsTracker,
} from '../../src/types';

export interface DataSnapshot {
  indkomstAar: IndkomstAar[];
  jobs: Job[];
  fradrag: Fradrag[];
  investeringer: Investering[];
  opsparing: Record<string, OpsparingsTracker>;
  bilag: Bilag[];
}

export const tomtSnapshot = (): DataSnapshot => ({
  indkomstAar: [],
  jobs: [],
  fradrag: [],
  investeringer: [],
  opsparing: {},
  bilag: [],
});

/**
 * Enkeltbrugerapp, én forbindelse. Ligger UDEN FOR DataSnapshot/hentAlt() med
 * vilje — refresh-tokenet må aldrig følge med i det payload, som /api/data
 * allerede sender ukrypteret til klienten.
 */
export interface GoogleDriveForbindelse {
  refreshToken: string;
  mappeId: string | null;
  snapshotFilId: string | null;
  forbundetTidspunkt: string;
  sidsteFejl: string | null;
  sidsteFejlTidspunkt: string | null;
}

/**
 * Kontrakten mellem routes og lagringen. Routes taler kun med denne grænseflade,
 * så en Postgres-driver kan skiftes ind uden at røre noget andet.
 */
export interface Repository {
  hentAlt(): Promise<DataSnapshot>;

  gemIndkomstAar(aar: IndkomstAar): Promise<IndkomstAar>;
  sletIndkomstAar(id: string): Promise<void>;

  gemJob(job: Job): Promise<Job>;
  sletJob(id: string): Promise<void>;

  gemFradrag(fradrag: Fradrag): Promise<Fradrag>;
  sletFradrag(id: string): Promise<void>;

  gemInvestering(investering: Investering): Promise<Investering>;
  sletInvestering(id: string): Promise<void>;

  gemOpsparing(indkomstAarId: string, data: OpsparingsTracker): Promise<void>;

  gemBilag(bilag: Bilag): Promise<Bilag>;
  findBilagVedHash(sha256: string): Promise<Bilag | null>;
  hentBilag(id: string): Promise<Bilag | null>;
  sletBilag(id: string): Promise<void>;

  /** Erstatter hele datasættet. Bruges af eksempeldata og nulstilling. */
  erstatAlt(snapshot: DataSnapshot): Promise<void>;

  hentGoogleDriveForbindelse(): Promise<GoogleDriveForbindelse | null>;
  gemGoogleDriveForbindelse(forbindelse: GoogleDriveForbindelse): Promise<void>;
  sletGoogleDriveForbindelse(): Promise<void>;
}
