import OpenAI from 'openai';
import type { BilagsAnalyse } from '../../src/types';
import { ANALYSE_SYSTEMPROMPT, chatSystemprompt } from './prompts';
import { BilagsAnalyseSkema, SKEMABESKRIVELSE } from './skema';
import { rensAnalyse } from './normaliser';
import { udtraekPdfTekst, PdfUdenTekstError } from './pdf';
import { soeg, type Kilde } from './soegning';
import {
  HISTORIK_VINDUE,
  type AiUdbyder,
  type BilagsInput,
  type ChatFase,
  type ChatIndgang,
  type ChatSvar,
} from './udbyder';

const BASIS_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const TEKSTMODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const BILLEDMODEL = process.env.DEEPSEEK_VISION_MODEL || 'deepseek-v4-flash-vision-exp';

/** DeepSeeks multimodale endpoint tager kun disse formater. Ikke PDF. */
const BILLEDFORMATER = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function opretDeepseekUdbyder(): AiUdbyder {
  const klient = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: BASIS_URL,
  });

  return {
    navn: 'deepseek',
    modeller: { tekst: TEKSTMODEL, billede: BILLEDMODEL },

    async analyserBilag(input: BilagsInput): Promise<BilagsAnalyse> {
      const erBillede = BILLEDFORMATER.includes(input.mimeType);

      if (!erBillede && input.mimeType !== 'application/pdf') {
        throw new Error(
          `${input.mimeType} kan ikke læses. Brug PDF, JPG, PNG, GIF eller WEBP.`
        );
      }

      // DeepSeek tager ikke PDF-dokumenter, så teksten trækkes ud her og
      // sendes videre som tekst. Er PDF'en et scannet billede uden tekstlag,
      // kaster udtrækket, og brugeren får det at vide i stedet for et gæt.
      const brugerTekst = erBillede
        ? `Filnavn: ${input.filnavn}\n\nLæs bilaget på billedet og udtræk oplysningerne. Sæt null i hvert felt, du ikke kan læse. Svar med json.`
        : `Filnavn: ${input.filnavn}\n\nHer er teksten fra bilaget:\n\n"""\n${await udtraekPdfTekst(
            input.indhold
          )}\n"""\n\nUdtræk oplysningerne. Sæt null i hvert felt, der ikke står i teksten. Svar med json.`;

      const indhold: OpenAI.Chat.ChatCompletionContentPart[] = erBillede
        ? [
            { type: 'text', text: brugerTekst },
            {
              type: 'image_url',
              image_url: {
                url: `data:${input.mimeType};base64,${input.indhold.toString('base64')}`,
              },
            },
          ]
        : [{ type: 'text', text: brugerTekst }];

      let sidsteFejl: unknown;

      for (let forsoeg = 1; forsoeg <= 4; forsoeg++) {
        try {
          const svar = await klient.chat.completions.create({
            model: erBillede ? BILLEDMODEL : TEKSTMODEL,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: `${ANALYSE_SYSTEMPROMPT}\n\n${SKEMABESKRIVELSE}` },
              { role: 'user', content: indhold },
            ],
          });

          // JSON-tilstanden returnerer af og til gyldigt udseende, men tomt
          // indhold: en streng af blanktegn med finish_reason "stop". Den er
          // sand i JavaScript, så et almindeligt !content-tjek fanger den ikke.
          const raa = svar.choices[0]?.message?.content;
          if (!raa || raa.trim().length === 0) {
            throw new Error('Svaret indeholdt ingen data.');
          }

          return rensAnalyse(BilagsAnalyseSkema.parse(JSON.parse(raa)));
        } catch (err) {
          sidsteFejl = err;
          // En PDF uden tekstlag bliver ikke bedre af at prøve igen.
          if (err instanceof PdfUdenTekstError) throw err;
          if (err instanceof OpenAI.AuthenticationError) throw err;
          if (forsoeg < 4) await new Promise((r) => setTimeout(r, 400 * forsoeg));
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

      const svar = await klient.chat.completions.create({
        model: TEKSTMODEL,
        messages: [
          { role: 'system', content: chatSystemprompt(indgang.beregning, kilder) },
          ...indgang.beskeder.slice(-HISTORIK_VINDUE).map((b) => ({
            role: b.rolle === 'bruger' ? ('user' as const) : ('assistant' as const),
            content: b.indhold,
          })),
        ],
      });

      return {
        tekst: (svar.choices[0]?.message?.content ?? '').trim(),
        kilder: kilder ?? [],
      };
    },
  };
}
