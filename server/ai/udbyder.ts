import type { BilagsAnalyse, PosteringForslag } from '../../src/types';
import type { Kilde } from './soegning';

export interface BilagsInput {
  indhold: Buffer;
  mimeType: string;
  filnavn: string;
}

export interface ChatIndgang {
  beskeder: { rolle: 'bruger' | 'assistent'; indhold: string }[];
  /** Færdigberegnede tal fra regelmotoren. Modellen regner aldrig selv. */
  beregning: unknown;
  brugWebsoegning: boolean;
  /** Det udkast, brugeren endnu ikke har godkendt, hvis der er ét. */
  aktivtForslag?: PosteringForslag | null;
}

export type ChatFase = 'laeser' | 'soeger' | 'laeser_kilder' | 'skriver';

export interface ChatSvar {
  tekst: string;
  kilder: Kilde[];
  /** Sat når modellen kaldte foreslaaPostering. Ikke gemt endnu. */
  forslag?: PosteringForslag;
  /** Sat når modellen kaldte bekraeftPostering — kun et signal, gemmer intet selv. */
  bekraeftet?: boolean;
}

export interface AiUdbyder {
  navn: string;
  /** Modelnavnene, så grænsefladen kan sige hvad der faktisk kørte. */
  modeller: { tekst: string; billede: string };
  analyserBilag(input: BilagsInput): Promise<BilagsAnalyse>;
  chat(indgang: ChatIndgang, paaFase: (fase: ChatFase) => void): Promise<ChatSvar>;
}

export class ManglendeApiNoegleError extends Error {
  constructor() {
    super(
      'Der er ikke sat en API-nøgle på serveren, så bilag kan ikke læses og ' +
        'revisor-chatten kan ikke svare. Sæt GEMINI_API_KEY eller DEEPSEEK_API_KEY ' +
        'i .env og start serveren igen.'
    );
    this.name = 'ManglendeApiNoegleError';
  }
}

/** Kun de sidste beskeder sendes med. Holder fejlrate, latency og pris nede. */
export const HISTORIK_VINDUE = 12;

/**
 * Vælger udbyder ud fra hvilken nøgle der er sat.
 *
 * Gemini står først, fordi bilagslæsning er appens kerne, og Gemini både tager
 * PDF direkte og læser fotograferede kvitteringer bedst. DEEPSEEK_API_KEY
 * alene skifter til DeepSeek, og AI_UDBYDER kan tvinge valget.
 */
export function vaelgUdbyder(): 'gemini' | 'deepseek' | null {
  const tvunget = process.env.AI_UDBYDER?.toLowerCase();
  if (tvunget === 'gemini') return process.env.GEMINI_API_KEY ? 'gemini' : null;
  if (tvunget === 'deepseek') return process.env.DEEPSEEK_API_KEY ? 'deepseek' : null;

  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  return null;
}
