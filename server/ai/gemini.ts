import { GoogleGenAI, Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';
import type { BilagsAnalyse } from '../../src/types';
import { ANALYSE_SYSTEMPROMPT, chatSystemprompt } from './prompts';
import { BilagsAnalyseSkema, PosteringForslagSkema } from './skema';
import { rensAnalyse, rensPosteringForslag } from './normaliser';
import { soeg, type Kilde } from './soegning';
import {
  HISTORIK_VINDUE,
  type AiUdbyder,
  type BilagsInput,
  type ChatFase,
  type ChatIndgang,
  type ChatSvar,
} from './udbyder';

const TEKSTMODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const BILLEDMODEL = process.env.GEMINI_VISION_MODEL || TEKSTMODEL;

/** Gemini kan håndhæve skemaet serverside, så svaret altid har den rigtige form. */
const felt = (type: Type) => ({
  type: Type.OBJECT,
  properties: {
    vaerdi: { type, nullable: true },
    sikkerhed: { type: Type.NUMBER },
  },
  required: ['vaerdi', 'sikkerhed'],
});

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    klassifikation: { type: Type.STRING, enum: ['JOB', 'FRADRAG', 'INVESTERING', 'UKENDT'] },
    sikkerhed: { type: Type.NUMBER },
    resume: { type: Type.STRING },
    revisorNotat: { type: Type.STRING },
    job: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        hvervgiver: felt(Type.STRING),
        honorar: felt(Type.NUMBER),
        startDato: felt(Type.STRING),
        slutDato: felt(Type.STRING),
        betalingsDato: felt(Type.STRING),
        destinationAdresse: felt(Type.STRING),
        transportmiddel: felt(Type.STRING),
        antalKm: felt(Type.NUMBER),
        antalTure: felt(Type.NUMBER),
        amBidragFritaget: felt(Type.BOOLEAN),
        erRubrik17: felt(Type.BOOLEAN),
        type: felt(Type.STRING),
        timerJob: felt(Type.NUMBER),
        timerTransportForberedelse: felt(Type.NUMBER),
      },
    },
    fradrag: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        beskrivelse: felt(Type.STRING),
        typeKategori: felt(Type.STRING),
        fakturaDato: felt(Type.STRING),
        fakturaBeloeb: felt(Type.NUMBER),
        fradragsProcent: felt(Type.NUMBER),
      },
    },
    investering: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        titel: felt(Type.STRING),
        beloeb: felt(Type.NUMBER),
        fakturaDato: felt(Type.STRING),
      },
    },
  },
  required: ['klassifikation', 'sikkerhed', 'resume', 'revisorNotat'],
};

/** Samme feltgrupper som RESPONSE_SCHEMA, genbrugt til værktøjets parametre. */
const JOB_FELTER = {
  hvervgiver: felt(Type.STRING),
  honorar: felt(Type.NUMBER),
  startDato: felt(Type.STRING),
  slutDato: felt(Type.STRING),
  betalingsDato: felt(Type.STRING),
  destinationAdresse: felt(Type.STRING),
  transportmiddel: felt(Type.STRING),
  antalKm: felt(Type.NUMBER),
  antalTure: felt(Type.NUMBER),
  amBidragFritaget: felt(Type.BOOLEAN),
  erRubrik17: felt(Type.BOOLEAN),
  type: felt(Type.STRING),
  timerJob: felt(Type.NUMBER),
  timerTransportForberedelse: felt(Type.NUMBER),
};

const FRADRAG_FELTER = {
  beskrivelse: felt(Type.STRING),
  typeKategori: felt(Type.STRING),
  fakturaDato: felt(Type.STRING),
  fakturaBeloeb: felt(Type.NUMBER),
  fradragsProcent: felt(Type.NUMBER),
};

const INVESTERING_FELTER = {
  titel: felt(Type.STRING),
  beloeb: felt(Type.NUMBER),
  fakturaDato: felt(Type.STRING),
};

const FORESLAA_POSTERING: FunctionDeclaration = {
  name: 'foreslaaPostering',
  description:
    'Opretter eller retter et udkast til en postering (honorarjob, fradrag eller investering) ud fra brugerens besked. Gemmer intet — brugeren skal selv godkende udkastet bagefter.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      klassifikation: { type: Type.STRING, enum: ['JOB', 'FRADRAG', 'INVESTERING'] },
      besked: {
        type: Type.STRING,
        description: 'Kort, dansk tekst til chatboblen, der opsummerer udkastet.',
      },
      job: { type: Type.OBJECT, nullable: true, properties: JOB_FELTER },
      fradrag: { type: Type.OBJECT, nullable: true, properties: FRADRAG_FELTER },
      investering: { type: Type.OBJECT, nullable: true, properties: INVESTERING_FELTER },
    },
    required: ['klassifikation', 'besked'],
  },
};

const BEKRAEFT_POSTERING: FunctionDeclaration = {
  name: 'bekraeftPostering',
  description:
    'Bekræfter og beder brugerfladen gemme det udkast, der allerede er vist. Kaldes kun ved en utvetydig bekræftelse fra brugeren. Gemmer intet selv.',
  parameters: { type: Type.OBJECT, properties: {} },
};

export function opretGeminiUdbyder(): AiUdbyder {
  const klient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  return {
    navn: 'gemini',
    modeller: { tekst: TEKSTMODEL, billede: BILLEDMODEL },

    async analyserBilag(input: BilagsInput): Promise<BilagsAnalyse> {
      // Gemini tager PDF direkte, også scannede sider, så der er ingen grund
      // til at trække teksten ud først.
      const model = input.mimeType.startsWith('image/') ? BILLEDMODEL : TEKSTMODEL;

      let sidsteFejl: unknown;
      for (let forsoeg = 1; forsoeg <= 3; forsoeg++) {
        try {
          const svar = await klient.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: input.mimeType,
                      data: input.indhold.toString('base64'),
                    },
                  },
                  {
                    text: `Filnavn: ${input.filnavn}\n\nLæs bilaget og udtræk oplysningerne. Sæt null i hvert felt, du ikke kan læse ud af bilaget.`,
                  },
                ],
              },
            ],
            config: {
              systemInstruction: ANALYSE_SYSTEMPROMPT,
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
            },
          });

          const raa = (svar.text ?? '').trim();
          if (!raa) throw new Error('Svaret var tomt.');

          return rensAnalyse(BilagsAnalyseSkema.parse(JSON.parse(raa)));
        } catch (err) {
          sidsteFejl = err;
          // En afvist nøgle eller en opbrugt kvote bliver ikke bedre af at
          // prøve igen. Kun tilfældige fejl er værd at gentage.
          const besked = err instanceof Error ? err.message : '';
          if (/api[_ -]?key|unauthenticat|permission|denied|401|403|quota/i.test(besked)) {
            throw err;
          }
          if (forsoeg < 3) await new Promise((r) => setTimeout(r, 400 * forsoeg));
        }
      }

      throw sidsteFejl instanceof Error ? sidsteFejl : new Error('Bilaget kunne ikke læses.');
    },

    async chat(indgang: ChatIndgang, paaFase: (fase: ChatFase) => void): Promise<ChatSvar> {
      paaFase('laeser');

      let kilder: Kilde[] | null = null;
      if (indgang.brugWebsoegning) {
        const sidste = [...indgang.beskeder].reverse().find((b) => b.rolle === 'bruger');
        if (sidste) {
          paaFase('soeger');
          kilder = await soeg(sidste.indhold);
          paaFase('laeser_kilder');
        }
      }

      paaFase('skriver');

      const svar = await klient.models.generateContent({
        model: TEKSTMODEL,
        contents: indgang.beskeder.slice(-HISTORIK_VINDUE).map((b) => ({
          role: b.rolle === 'bruger' ? 'user' : 'model',
          parts: [{ text: b.indhold }],
        })),
        config: {
          systemInstruction: chatSystemprompt(
            indgang.beregning,
            kilder,
            indgang.aktivtForslag ?? null
          ),
          tools: [{ functionDeclarations: [FORESLAA_POSTERING, BEKRAEFT_POSTERING] }],
        },
      });

      const kald = svar.functionCalls?.[0];
      if (kald?.name === 'bekraeftPostering') {
        return { tekst: '', kilder: kilder ?? [], bekraeftet: true };
      }
      if (kald?.name === 'foreslaaPostering') {
        const forslag = rensPosteringForslag(PosteringForslagSkema.parse(kald.args ?? {}));
        return { tekst: forslag.besked, kilder: kilder ?? [], forslag };
      }

      return { tekst: (svar.text ?? '').trim(), kilder: kilder ?? [] };
    },
  };
}
