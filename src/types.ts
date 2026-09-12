import type { TransportMiddel } from './lib/tax/koersel';

export type { TransportMiddel };

export interface IndkomstAar {
  id: string;
  aar: number;
  hjemmeadresse: string;
  kommune: string;
  kommuneSkatteprocent: number;
  kirkeskatteprocent: number;
  forventetAIndkomst: number;
  forventetPensionSUDagpenge: number;
  forventedeFradragAIndkomst: number;
  medlemFolkekirken: boolean;
  enligForsoerger: boolean;
  laast: boolean;
}

export interface Job {
  id: string;
  indkomstAarId: string;
  hvervgiver: string;
  honorar: number;
  /** YYYY-MM-DD. Afgør hvilket indkomstår jobbet hører til. */
  startDato: string;
  slutDato: string;
  betalingsDato: string;
  transportmiddel: TransportMiddel;
  /** Strækning for én tur. */
  antalKm: number;
  antalTure: number;
  destinationAdresse?: string;
  amBidragFritaget: boolean;
  /** Rubrik 17 i stedet for rubrik 12: legater, gruppeliv, visse personalegoder. */
  erRubrik17?: boolean;
  /**
   * Bestyrelses-, udvalgs- eller kommissionshverv, hvor der IKKE er modtaget
   * skattefri kørselsgodtgørelse fra virksomheden.
   *
   * Ligningslovens § 9 B, stk. 5 giver netop denne gruppe ret til skattefri
   * godtgørelse fra hvervgiveren — modsat kunstnere og musikere. Får de den
   * ikke, er de IKKE henvist til de høje §9B-satser som kunstnere er, men
   * skal i stedet bruge det almindelige, lave befordringsfradrag (§9C).
   * Landsskatteretten har afvist lovhjemmel for det modsatte, jf. Østre
   * Landsrets dom gengivet i SKM2001.141.
   *
   * Sat til true routes egen bil/cykel-kørsel til rubrik 51 i stedet for
   * rubrik 29, uanset transportmiddel.
   */
  erBestyrelseshverv?: boolean;
  timerJob?: number;
  timerTransportForberedelse?: number;
  type?: string;
  bilagIds: string[];
  noter?: string;
  /** Sat på poster oprettet af "indlæs eksempeldata", så de kan fjernes samlet. */
  erEksempel?: boolean;
}

export interface Fradrag {
  id: string;
  indkomstAarId: string;
  beskrivelse: string;
  typeKategori: string;
  fakturaDato: string;
  fakturaBeloeb: number;
  fradragsProcent: number;
  fradragIDKK: number;
  bilagIds: string[];
  revisorNotat?: string;
  erEksempel?: boolean;
}

export interface Investering {
  id: string;
  indkomstAarId: string;
  titel: string;
  beloeb: number;
  fakturaDato: string;
  bilagIds: string[];
  noter?: string;
  erEksempel?: boolean;
}

export interface OpsparingsTracker {
  indbetaltTilSkat: number;
  opsparetPrivat: number;
}

export interface Bilag {
  id: string;
  sha256: string;
  filnavn: string;
  mimeType: string;
  stoerrelse: number;
  uploadet: string;
  /** Hvornår originalfilen senest blev bekræftet gemt i den tilsluttede Google Drev-mappe. */
  drevBackupTidspunkt?: string | null;
  /** Seneste fejl for netop dette bilag. Nulles efter en vellykket backup. */
  drevBackupFejl?: string | null;
}

/* ---------------------------------------------------------------- AI-laget */

export type Bilagsklassifikation = 'JOB' | 'FRADRAG' | 'INVESTERING' | 'UKENDT';

/**
 * Et udtrukket felt med modellens egen vurdering af, hvor sikker den er.
 * Felter under tærsklen markeres i grænsefladen og skal bekræftes aktivt.
 */
export interface UdtruktFelt<T> {
  vaerdi: T | null;
  sikkerhed: number;
}

export interface JobUdtraek {
  hvervgiver: UdtruktFelt<string>;
  honorar: UdtruktFelt<number>;
  startDato: UdtruktFelt<string>;
  slutDato: UdtruktFelt<string>;
  betalingsDato: UdtruktFelt<string>;
  destinationAdresse: UdtruktFelt<string>;
  transportmiddel: UdtruktFelt<TransportMiddel>;
  antalKm: UdtruktFelt<number>;
  antalTure: UdtruktFelt<number>;
  amBidragFritaget: UdtruktFelt<boolean>;
  erRubrik17: UdtruktFelt<boolean>;
  type: UdtruktFelt<string>;
  timerJob: UdtruktFelt<number>;
  timerTransportForberedelse: UdtruktFelt<number>;
}

export interface FradragUdtraek {
  beskrivelse: UdtruktFelt<string>;
  typeKategori: UdtruktFelt<string>;
  fakturaDato: UdtruktFelt<string>;
  fakturaBeloeb: UdtruktFelt<number>;
  fradragsProcent: UdtruktFelt<number>;
}

export interface InvesteringUdtraek {
  titel: UdtruktFelt<string>;
  beloeb: UdtruktFelt<number>;
  fakturaDato: UdtruktFelt<string>;
}

export interface BilagsAnalyse {
  klassifikation: Bilagsklassifikation;
  sikkerhed: number;
  resume: string;
  revisorNotat: string;
  job?: JobUdtraek;
  fradrag?: FradragUdtraek;
  investering?: InvesteringUdtraek;
}

/** Analysen bliver til en kladde. Intet gemmes, før brugeren godkender. */
export interface Kladde {
  id: string;
  bilag: Bilag;
  analyse: BilagsAnalyse;
  /** Sat når et bilag med samme indhold allerede findes. */
  dublet?: { bilagId: string; filnavn: string; uploadet: string };
}

/** Felter under denne sikkerhed fremhæves og skal bekræftes aktivt. */
export const SIKKERHEDSTAERSKEL = 0.75;

/**
 * Et forslag til en postering, som chatten selv har foreslået ud fra en
 * besked — samme feltform som et bilagsudtræk. Intet gemmes, før brugeren
 * godkender kortet, enten ved at klikke eller ved en utvetydig bekræftelse
 * i chatten.
 */
export interface PosteringForslag {
  klassifikation: Exclude<Bilagsklassifikation, 'UKENDT'>;
  besked: string;
  job?: JobUdtraek;
  fradrag?: FradragUdtraek;
  investering?: InvesteringUdtraek;
}

export interface ChatBesked {
  rolle: 'bruger' | 'assistent';
  indhold: string;
  kilder?: { titel: string; url: string }[];
  /** Et endnu ikke godkendt forslag, hængt på denne besked. */
  forslag?: PosteringForslag;
}
