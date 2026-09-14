import { opretGeminiUdbyder } from './gemini';
import { opretDeepseekUdbyder } from './deepseek';
import { ManglendeApiNoegleError, vaelgUdbyder, type AiUdbyder } from './udbyder';

let cache: AiUdbyder | null = null;
let cachetValg: string | null = null;

export function harAiUdbyder(): boolean {
  return vaelgUdbyder() !== null;
}

export function getUdbyder(): AiUdbyder {
  const valg = vaelgUdbyder();
  if (!valg) throw new ManglendeApiNoegleError();

  if (!cache || cachetValg !== valg) {
    cache = valg === 'gemini' ? opretGeminiUdbyder() : opretDeepseekUdbyder();
    cachetValg = valg;
  }

  return cache;
}

export function udbyderStatus() {
  const valg = vaelgUdbyder();
  if (!valg) return { klar: false as const, udbyder: null, modeller: null };
  const u = getUdbyder();
  return { klar: true as const, udbyder: u.navn, modeller: u.modeller };
}
