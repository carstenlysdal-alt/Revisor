export class PdfUdenTekstError extends Error {
  constructor() {
    super(
      'PDF-filen indeholder ingen tekst, den er formentlig et scannet billede. ' +
        'Tag et billede af bilaget i stedet, eller opret posten manuelt.'
    );
    this.name = 'PdfUdenTekstError';
  }
}

type PdfParse = (data: Buffer) => Promise<{ text: string }>;

let indlaest: PdfParse | null = null;

/**
 * Henter pdf-parse på tværs af modulformater.
 *
 * Udvikling kører som ES-moduler gennem tsx, mens produktionsbundtet er CJS.
 * En dynamisk import virker begge steder, hvor createRequire(import.meta.url)
 * kun virker det ene.
 */
async function hentPdfParse(): Promise<PdfParse> {
  if (indlaest) return indlaest;
  const modul = (await import('pdf-parse')) as unknown as
    | PdfParse
    | { default: PdfParse };
  indlaest = typeof modul === 'function' ? modul : modul.default;
  return indlaest;
}

/**
 * Trækker teksten ud af en PDF.
 *
 * Bruges kun af udbydere, der ikke selv kan læse et PDF-dokument. Gemini tager
 * filen direkte, også scannede sider, og går uden om denne vej.
 */
export async function udtraekPdfTekst(indhold: Buffer): Promise<string> {
  const pdfParse = await hentPdfParse();
  const resultat = await pdfParse(indhold);
  const tekst = (resultat.text || '').trim();

  // Et scannet dokument uden tekstlag giver typisk kun sideskift tilbage.
  if (tekst.replace(/\s/g, '').length < 20) throw new PdfUdenTekstError();

  // Klip meget lange dokumenter, men sig det i teksten frem for at gøre det
  // stiltiende. En kontrakt på tredive sider har det væsentlige forrest.
  const MAKS = 40_000;
  return tekst.length > MAKS
    ? `${tekst.slice(0, MAKS)}\n\n[Dokumentet er længere end der er plads til. Kun begyndelsen er læst.]`
    : tekst;
}
