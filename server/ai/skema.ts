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

export const JobUdtraekSkema = z.object({
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
});

export const FradragUdtraekSkema = z.object({
  beskrivelse: tekstfelt,
  typeKategori: tekstfelt,
  fakturaDato: tekstfelt,
  fakturaBeloeb: talfelt,
  fradragsProcent: talfelt,
});

export const InvesteringUdtraekSkema = z.object({
  titel: tekstfelt,
  beloeb: talfelt,
  fakturaDato: tekstfelt,
});

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
