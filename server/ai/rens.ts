/**
 * Rensning af tekst, en sprogmodel har skrevet.
 *
 * Enhver streng, der går fra modellens svar til et felt i grænsefladen, skal
 * herigennem. Det gælder ikke kun chatboblen: modellen formaterer et
 * hvervgivernavn lige så upålideligt som et afsnit brødtekst, og et
 * "**Musikhuset Aarhus**" i et inputfelt er en fejl, brugeren skal rette
 * manuelt hver gang.
 */

const MARKDOWN_MØNSTRE: [RegExp, string][] = [
  [/^#{1,6}\s+/gm, ''],
  [/\*\*\*(.+?)\*\*\*/g, '$1'],
  [/\*\*(.+?)\*\*/g, '$1'],
  [/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '$1'],
  [/__(.+?)__/g, '$1'],
  [/`{1,3}([^`]+)`{1,3}/g, '$1'],
  [/\[([^\]]+)\]\([^)]*\)/g, '$1'],
  [/^\s*[-*+]\s+/gm, ''],
  [/^\s*>\s?/gm, ''],
];

export function fjernMarkdown(tekst: string): string {
  return MARKDOWN_MØNSTRE.reduce((t, [mønster, erstat]) => t.replace(mønster, erstat), tekst);
}

export function fjernHtml(tekst: string): string {
  return tekst.replace(/<[^>]*>/g, '');
}

/**
 * Fjerner anførselstegn, der pakker hele værdien ind.
 *
 * Modellen pakker af og til et helt felt ind i citationstegn, som var det et
 * citat. Citater midt i en sætning er derimod legitime og røres ikke, så der
 * fjernes kun, når tegnet står både først og sidst.
 */
export function fjernOmsluttendeAnfoerselstegn(tekst: string): string {
  const t = tekst.trim();
  const par: [string, string][] = [
    ['"', '"'],
    ["'", "'"],
    ['“', '”'],
    ['”', '”'],
    ['»', '«'],
    ['«', '»'],
    ['’', '’'],
  ];
  for (const [start, slut] of par) {
    if (t.length > 1 && t.startsWith(start) && t.endsWith(slut)) {
      const inderst = t.slice(start.length, t.length - slut.length);
      // Står der flere af samme tegn inde i teksten, er det formodentlig
      // rigtige citater, og så pakker det yderste par ikke hele værdien ind.
      if (!inderst.includes(start) && !inderst.includes(slut)) return inderst.trim();
    }
  }
  return t;
}

/** Den fulde rensning. Brug denne på hvert eneste AI-udfyldt tekstfelt. */
export function rensFelt(vaerdi: unknown): string {
  if (typeof vaerdi !== 'string') return '';
  return fjernOmsluttendeAnfoerselstegn(
    fjernHtml(fjernMarkdown(vaerdi))
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
  ).trim();
}

/**
 * Rensning af længere, brugervendt prosa. Beholder linjeskift og markdown,
 * fordi teksten bliver renderet som markdown, men fjerner den omsluttende
 * citation modellen nogle gange lægger om hele svaret.
 */
export function rensProsa(vaerdi: unknown): string {
  if (typeof vaerdi !== 'string') return '';
  return fjernOmsluttendeAnfoerselstegn(vaerdi).trim();
}
