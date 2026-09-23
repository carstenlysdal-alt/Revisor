import { z } from 'zod';

/**
 * Skema for et bilagsudtræk, delt mellem udbyderne.
 *
 * Gemini kan håndhæve et skema serverside. DeepSeeks JSON-tilstand kan ikke,
 * så dér beskrives formen i prompten og valideres her bagefter. Begge veje
 * ender samme sted: et svar, der ikke kan valideres, kastes og prøves igen.
 * Der gættes aldrig på et resultat.
 */

export function normaliserTal(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const renset = v.replace(/(?:kr\.?|dkk|km|ture?|timer?|t)/gi, '').trim();
    if (!renset) return null;
    const rent = renset.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const tal = parseFloat(rent);
    return Number.isFinite(tal) ? tal : null;
  }
  return null;
}

const MAANEDER: Record<string, string> = {
  januar: '01', jan: '01',
  februar: '02', feb: '02',
  marts: '03', mar: '03',
  april: '04', apr: '04',
  maj: '05',
  juni: '06', jun: '06',
  juli: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09',
  oktober: '10', okt: '10',
  november: '11', nov: '11',
  december: '12', dec: '12',
};

export function normaliserDato(v: unknown): string | null {
  if (!v || typeof v !== 'string') return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dm = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (dm) {
    const dag = dm[1]!.padStart(2, '0');
    const mdr = dm[2]!.padStart(2, '0');
    const aar = dm[3]!;
    return `${aar}-${mdr}-${dag}`;
  }
  const dtekst = s.toLowerCase().match(/^(\d{1,2})\.?\s+([a-zæøå]+)\s+(\d{4})$/);
  const maaned = dtekst?.[2];
  if (dtekst && maaned && MAANEDER[maaned]) {
    const dag = dtekst[1]!.padStart(2, '0');
    const mdr = MAANEDER[maaned]!;
    const aar = dtekst[3]!;
    return `${aar}-${mdr}-${dag}`;
  }
  return s;
}

export function normaliserTransportmiddel(
  v: unknown
): 'NONE' | 'OWN_CAR_MC' | 'OWN_BIKE' | 'PASSENGER' | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase().replace(/[-_]/g, ' ');
  if (!s || s === 'none' || s === 'ingen' || s === 'ingen kørsel' || s === 'null') return 'NONE';
  if (
    [
      'own car mc',
      'own car',
      'car',
      'bil',
      'egen bil',
      'bilen',
      'motorcykel',
      'mc',
      'kørte selv',
      'korte selv',
    ].some((k) => s.includes(k))
  ) {
    return 'OWN_CAR_MC';
  }
  if (['own bike', 'bike', 'cykel', 'egen cykel', 'cyklede'].some((k) => s.includes(k))) {
    return 'OWN_BIKE';
  }
  if (['passenger', 'passager', 'samkørsel', 'kørte med'].some((k) => s.includes(k))) {
    return 'PASSENGER';
  }
  return null;
}

/**
 * Et funktions-kald håndhæves ikke lige så strengt som et skema-tvunget
 * svar (analyserBilag) — modellen afleverer sommetider et felt som en ren
 * værdi ("startDato": "2026-09-06") i stedet for den indpakkede form
 * ({"vaerdi": "2026-09-06", "sikkerhed": 0.8}), typisk når beskeden bærer
 * flere fakta på én gang. Uden dette kaster det hele forslaget, og
 * brugeren ser en fejl, der intet siger om hvad der gik galt.
 */
const felt = <T extends z.ZodTypeAny>(type: T) =>
  z.preprocess(
    (raa) =>
      raa !== null && typeof raa === 'object' && 'vaerdi' in raa
        ? raa
        : { vaerdi: raa, sikkerhed: 0.6 },
    z.object({
      vaerdi: type.nullish().transform((v) => v ?? null),
      sikkerhed: z.coerce
        .number()
        .nullish()
        .transform((v) => Math.min(1, Math.max(0, Number(v) || 0))),
    })
  );

const tekstfelt = felt(z.coerce.string());
const talfelt = felt(z.preprocess((v) => normaliserTal(v), z.number().nullable()));
const datofelt = felt(z.preprocess((v) => normaliserDato(v), z.coerce.string().nullable()));
const boolfelt = felt(
  z.preprocess((v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'false' || s === 'nej' || s === '0' || s === 'null') return false;
      if (s === 'true' || s === 'ja' || s === '1') return true;
    }
    if (typeof v === 'number') return v !== 0;
    return Boolean(v);
  }, z.boolean().nullable())
);

const transportmiddelfelt = z.preprocess(
  (raa) => {
    if (raa === null || raa === undefined) return { vaerdi: null, sikkerhed: 0.6 };
    if (typeof raa === 'object' && 'vaerdi' in raa) {
      const obj = raa as { vaerdi: unknown; sikkerhed?: unknown };
      return {
        vaerdi: normaliserTransportmiddel(obj.vaerdi),
        sikkerhed: obj.sikkerhed ?? 0.6,
      };
    }
    return {
      vaerdi: normaliserTransportmiddel(raa),
      sikkerhed: 0.6,
    };
  },
  z.object({
    vaerdi: z.enum(['NONE', 'OWN_CAR_MC', 'OWN_BIKE', 'PASSENGER']).nullable(),
    sikkerhed: z.coerce
      .number()
      .nullish()
      .transform((v) => Math.min(1, Math.max(0, Number(v) || 0))),
  })
);

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
    booker: tekstfelt,
    honorar: talfelt,
    betaltSkat: talfelt,
    startDato: datofelt,
    slutDato: datofelt,
    betalingsDato: datofelt,
    destinationAdresse: tekstfelt,
    transportmiddel: transportmiddelfelt,
    antalKm: talfelt,
    antalTure: talfelt,
    amBidragFritaget: boolfelt,
    erRubrik17: boolfelt,
    erBestyrelseshverv: boolfelt,
    type: tekstfelt,
    timerJob: talfelt,
    timerTransportForberedelse: talfelt,
  })
  .partial();

export const FradragUdtraekSkema = z
  .object({
    beskrivelse: tekstfelt,
    typeKategori: tekstfelt,
    fakturaDato: datofelt,
    fakturaBeloeb: talfelt,
    fradragsProcent: talfelt,
  })
  .partial();

export const InvesteringUdtraekSkema = z
  .object({
    titel: tekstfelt,
    beloeb: talfelt,
    fakturaDato: datofelt,
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
export const PosteringForslagSkema = z.preprocess(
  (raa) => {
    if (!raa || typeof raa !== 'object') return raa;
    const obj = { ...(raa as Record<string, unknown>) };
    if (!obj.klassifikation) {
      if (obj.job) obj.klassifikation = 'JOB';
      else if (obj.fradrag) obj.klassifikation = 'FRADRAG';
      else if (obj.investering) obj.klassifikation = 'INVESTERING';
      else obj.klassifikation = 'JOB';
    } else if (typeof obj.klassifikation === 'string') {
      obj.klassifikation = obj.klassifikation.toUpperCase().trim();
    }
    return obj;
  },
  z.object({
    klassifikation: z.enum(['JOB', 'FRADRAG', 'INVESTERING']),
    /** Kort, menneskelig tekst modellen selv formulerer til chatboblen. */
    besked: z.coerce.string().nullish().transform((v) => v ?? ''),
    job: JobUdtraekSkema.nullish().transform((v) => v ?? undefined),
    fradrag: FradragUdtraekSkema.nullish().transform((v) => v ?? undefined),
    investering: InvesteringUdtraekSkema.nullish().transform((v) => v ?? undefined),
  })
);

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
    booker: jsonFelt('string'),
    honorar: jsonFelt('number'),
    betaltSkat: jsonFelt('number'),
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
    erBestyrelseshverv: jsonFelt('boolean'),
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

job: hvervgiver (tekst, udbetaleren), booker (tekst, den der bookede jobbet), honorar (tal), betaltSkat (tal, kun faktisk betalt/indeholdt skat), startDato, slutDato, betalingsDato (YYYY-MM-DD), destinationAdresse (tekst), transportmiddel ("NONE" | "OWN_CAR_MC" | "OWN_BIKE" | "PASSENGER"), antalKm (tal), antalTure (tal), amBidragFritaget (true/false), erRubrik17 (true/false), erBestyrelseshverv (true/false), type (tekst), timerJob (tal), timerTransportForberedelse (tal).

fradrag: beskrivelse (tekst), typeKategori (tekst), fakturaDato (YYYY-MM-DD), fakturaBeloeb (tal inklusive moms), fradragsProcent (0 til 100).

investering: titel (tekst), beloeb (tal), fakturaDato (YYYY-MM-DD).`;
