import { z } from 'zod';

/**
 * Skema for et bilagsudtræk, delt mellem udbyderne.
 *
 * Gemini kan håndhæve et skema serverside. DeepSeeks JSON-tilstand kan ikke,
 * så dér beskrives formen i prompten og valideres her bagefter. Begge veje
 * ender samme sted: et svar, der ikke kan valideres, kastes og prøves igen.
 * Der gættes aldrig på et resultat.
 */

const felt = <T extends z.ZodTypeAny>(type: T) =>
  z.object({
    vaerdi: type.nullish().transform((v) => v ?? null),
    sikkerhed: z.coerce
      .number()
      .nullish()
      .transform((v) => Math.min(1, Math.max(0, Number(v) || 0))),
  });

const tekstfelt = felt(z.coerce.string());
const talfelt = felt(z.coerce.number());
const boolfelt = felt(z.coerce.boolean());

/**
 * .partial() gør hvert felt valgfrit, ikke kun dets vaerdi nullable.
 *
 * Geminis skema-håndhævede JSON-svar (analyserBilag) udfylder typisk alle
 * felter i skemaet, men et funktions-kald i chatten (foreslaaPostering)
 * håndhæves ikke på samme måde — modellen kan sende kun de felter, den
 * faktisk har noget at sige om. Et manglende felt skal opføres sig som et
 * felt med vaerdi: null, ikke crashe hele chatsvaret.
 */
export const JobUdtraekSkema = z
  .object({
    hvervgiver: tekstfelt,
    honorar: talfelt,
    startDato: tekstfelt,
    slutDato: tekstfelt,
    betalingsDato: tekstfelt,
    destinationAdresse: tekstfelt,
    transportmiddel: felt(z.enum(['NONE', 'OWN_CAR_MC', 'OWN_BIKE', 'PASSENGER'])),
    antalKm: talfelt,
    antalTure: talfelt,
    amBidragFritaget: boolfelt,
    erRubrik17: boolfelt,
    type: tekstfelt,
    timerJob: talfelt,
    timerTransportForberedelse: talfelt,
  })
  .partial();

export const FradragUdtraekSkema = z
  .object({
    beskrivelse: tekstfelt,
    typeKategori: tekstfelt,
    fakturaDato: tekstfelt,
    fakturaBeloeb: talfelt,
    fradragsProcent: talfelt,
  })
  .partial();

export const InvesteringUdtraekSkema = z
  .object({
    titel: tekstfelt,
    beloeb: talfelt,
    fakturaDato: tekstfelt,
  })
  .partial();

export const BilagsAnalyseSkema = z.object({
  klassifikation: z.enum(['JOB', 'FRADRAG', 'INVESTERING', 'UKENDT']),
  sikkerhed: z.coerce
    .number()
    .nullish()
    .transform((v) => Math.min(1, Math.max(0, Number(v) || 0))),
  resume: z.coerce.string().nullish().transform((v) => v ?? ''),
  revisorNotat: z.coerce.string().nullish().transform((v) => v ?? ''),
  job: JobUdtraekSkema.nullish().transform((v) => v ?? undefined),
  fradrag: FradragUdtraekSkema.nullish().transform((v) => v ?? undefined),
  investering: InvesteringUdtraekSkema.nullish().transform((v) => v ?? undefined),
});

export type RaaBilagsAnalyse = z.infer<typeof BilagsAnalyseSkema>;

/**
 * Et forslag til en postering, foreslået af chatten via værktøjet
 * foreslaaPostering — samme feltgrupper som bilagsudtrækket, minus alt der
 * kun giver mening for et fysisk bilag (resume, UKENDT).
 */
export const PosteringForslagSkema = z.object({
  klassifikation: z.enum(['JOB', 'FRADRAG', 'INVESTERING']),
  /** Kort, menneskelig tekst modellen selv formulerer til chatboblen. */
  besked: z.coerce.string().nullish().transform((v) => v ?? ''),
  job: JobUdtraekSkema.nullish().transform((v) => v ?? undefined),
  fradrag: FradragUdtraekSkema.nullish().transform((v) => v ?? undefined),
  investering: InvesteringUdtraekSkema.nullish().transform((v) => v ?? undefined),
});

export type RaaPosteringForslag = z.infer<typeof PosteringForslagSkema>;

/**
 * JSON-skema (til OpenAI-kompatible tool-parametre, fx DeepSeek) for de tre
 * feltgrupper. Genbruger ikke Zod-skemaet direkte, fordi tool-parametre skal
 * være et almindeligt JSON Schema-objekt, ikke en Zod-instans — men de to skal
 * holdes i takt manuelt, ligesom SKEMABESKRIVELSE allerede gør for analysen.
 */
const jsonFelt = (type: 'string' | 'number' | 'boolean') => ({
  type: 'object' as const,
  properties: {
    vaerdi: { type: [type, 'null'] },
    sikkerhed: { type: 'number', description: '0 til 1' },
  },
});

export const JOB_JSON_SKEMA = {
  type: 'object' as const,
  properties: {
    hvervgiver: jsonFelt('string'),
    honorar: jsonFelt('number'),
    startDato: jsonFelt('string'),
    slutDato: jsonFelt('string'),
    betalingsDato: jsonFelt('string'),
    destinationAdresse: jsonFelt('string'),
    transportmiddel: {
      type: 'object' as const,
      properties: {
        vaerdi: { type: ['string', 'null'], enum: ['NONE', 'OWN_CAR_MC', 'OWN_BIKE', 'PASSENGER', null] },
        sikkerhed: { type: 'number' },
      },
    },
    antalKm: jsonFelt('number'),
    antalTure: jsonFelt('number'),
    amBidragFritaget: jsonFelt('boolean'),
    erRubrik17: jsonFelt('boolean'),
    type: jsonFelt('string'),
    timerJob: jsonFelt('number'),
    timerTransportForberedelse: jsonFelt('number'),
  },
};

export const FRADRAG_JSON_SKEMA = {
  type: 'object' as const,
  properties: {
    beskrivelse: jsonFelt('string'),
    typeKategori: jsonFelt('string'),
    fakturaDato: jsonFelt('string'),
    fakturaBeloeb: jsonFelt('number'),
    fradragsProcent: jsonFelt('number'),
  },
};

export const INVESTERING_JSON_SKEMA = {
  type: 'object' as const,
  properties: {
    titel: jsonFelt('string'),
    beloeb: jsonFelt('number'),
    fakturaDato: jsonFelt('string'),
  },
};

/** Formen beskrevet i ord, til udbydere der ikke kan håndhæve et skema. */
export const SKEMABESKRIVELSE = `Svar med ét JSON-objekt og intet andet. Objektet har denne form:

{
  "klassifikation": "JOB" | "FRADRAG" | "INVESTERING" | "UKENDT",
  "sikkerhed": tal mellem 0 og 1,
  "resume": kort beskrivelse på dansk,
  "revisorNotat": bemærkning om skattemæssig behandling på dansk,
  "job": kun ved JOB, ellers null,
  "fradrag": kun ved FRADRAG, ellers null,
  "investering": kun ved INVESTERING, ellers null
}

Hvert felt inde i job, fradrag og investering har formen {"vaerdi": ..., "sikkerhed": tal mellem 0 og 1}.

job: hvervgiver (tekst), honorar (tal), startDato, slutDato, betalingsDato (YYYY-MM-DD), destinationAdresse (tekst), transportmiddel ("NONE" | "OWN_CAR_MC" | "OWN_BIKE" | "PASSENGER"), antalKm (tal), antalTure (tal), amBidragFritaget (true/false), erRubrik17 (true/false), type (tekst), timerJob (tal), timerTransportForberedelse (tal).

fradrag: beskrivelse (tekst), typeKategori (tekst), fakturaDato (YYYY-MM-DD), fakturaBeloeb (tal inklusive moms), fradragsProcent (0 til 100).

investering: titel (tekst), beloeb (tal), fakturaDato (YYYY-MM-DD).`;
