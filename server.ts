import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Support parsing large base64 payloads for receipts and contract attachments
app.use(express.json({ limit: '25mb' }));

// Lazy initializer for Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Bilag / Dokument Analyse Endpoint (Kontrakt, honorarnota, kvittering, faktura)
app.post('/api/gemini/analyze-bilag', async (req, res) => {
  try {
    const { fileData, mimeType, fileName, textContent } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API nøgle mangler på serveren. Indstil venligst GEMINI_API_KEY i Secrets.',
      });
    }

    const systemInstruction = `Du er en erfaren dansk revisor og AI-specialist i dansk skattelovgivning for B-indkomstmodtagere, freelancere, musikere og honorarmodtagere.
Din opgave er at analysere et uploadet bilag (kvittering, faktura, honoraraftale, spillekontrakt, udbetalingsspecifikation eller mail).

Du skal:
1. Klassificere dokumentet som:
   - "JOB" (hvis det er en honoraraftale, kontrakt, engagement, koncert eller aftale om betalt arbejde for en hvervgiver)
   - "FRADRAG" (hvis det er en driftsomkostning, kvittering på fx transport, parkering, broafgift, hotel, instrumenter, software, grej etc.)
   - "INVESTERING" (hvis det er et større indkøb af anlægsaktiv/udstyr)
   - "UNKNOWN" (hvis det ikke kan tydes)

2. Udtrække strukturerede data:
   For JOB:
   - hvervgiver (navn på arrangør, kunde, spillested, arbejdsgiver)
   - honorar (beløb i DKK før skat og AM-bidrag)
   - startDato & slutDato (format YYYY-MM-DD)
   - betalingsDato (forventet eller faktisk udbetaling i YYYY-MM-DD)
   - lokationAdresse (spillested, by eller adresse hvor jobbet udføres, til kørselsberegning)
   - amBidragFritaget (true hvis det er royalty, copydan, gramex, biblioteksafgift, hæderslegat eller kunststøtte; ellers false)
   - transportmiddel ("CAR", "BIKE", "PASSENGER", "NONE") - hvis der omtales kørsel/transport
   - type (fx "Musik", "Foredrag", "Konsulent", "Teater")

   For FRADRAG:
   - beskrivelse (hvad er købt)
   - typeKategori ("Transport", "Parkering", "Broafgift", "Udstyr", "Hotel/Forplejning", "Software", "Andet")
   - fakturaDato (YYYY-MM-DD)
   - fakturaBeloeb (i DKK inkl. moms)
   - forslagFradragsprocent (100 for 100% erhverv; 50-75 hvis blandet privat/erhverv som computer, telefon)
   - begrundelse (kort revisorbemærkning om skattemæssig behandling i rubrik 29)

   For INVESTERING:
   - titel (navn på aktiv)
   - beloeb (DKK inkl moms)
   - fakturaDato (YYYY-MM-DD)

3. Angiv konfidens (0.0 til 1.0) og revisorNotat på dansk.`;

    const contents: any[] = [];

    if (fileData && mimeType) {
      contents.push({
        inlineData: {
          mimeType,
          data: fileData,
        },
      });
    }

    const promptText = `Analyser dette bilag / dokument (${fileName || 'ukendt fil'}).
${textContent ? `Ekstra uddrag / tekst: "${textContent}"` : ''}
Uddrag samtlige oplysninger præcist i henhold til dansk skattepraksis.`;

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: {
              type: Type.STRING,
              description: 'JOB, FRADRAG, INVESTERING, or UNKNOWN',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0',
            },
            summary: {
              type: Type.STRING,
              description: 'Kort resumé af bilaget på dansk',
            },
            job: {
              type: Type.OBJECT,
              properties: {
                hvervgiver: { type: Type.STRING },
                honorar: { type: Type.NUMBER },
                startDato: { type: Type.STRING },
                slutDato: { type: Type.STRING },
                betalingsDato: { type: Type.STRING },
                lokationAdresse: { type: Type.STRING },
                transportmiddel: { type: Type.STRING },
                amBidragFritaget: { type: Type.BOOLEAN },
                type: { type: Type.STRING },
                timerJob: { type: Type.NUMBER },
                timerTransportForberedelse: { type: Type.NUMBER },
              },
            },
            fradrag: {
              type: Type.OBJECT,
              properties: {
                beskrivelse: { type: Type.STRING },
                typeKategori: { type: Type.STRING },
                fakturaDato: { type: Type.STRING },
                fakturaBeloeb: { type: Type.NUMBER },
                forslagFradragsprocent: { type: Type.NUMBER },
                begrundelse: { type: Type.STRING },
              },
            },
            investering: {
              type: Type.OBJECT,
              properties: {
                titel: { type: Type.STRING },
                beloeb: { type: Type.NUMBER },
                fakturaDato: { type: Type.STRING },
              },
            },
            revisorNotat: {
              type: Type.STRING,
              description: 'Professionelt råd fra revisor AI angående skat, rubrik og dokumentation',
            },
          },
          required: ['classification', 'confidence', 'summary', 'revisorNotat'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error analyzing bilag:', err);
    res.status(500).json({
      error: 'Fejl under bilagsanalyse',
      details: err?.message || String(err),
    });
  }
});

// Revisor AI Rådgivnings Chat
app.post('/api/gemini/revisor-chat', async (req, res) => {
  try {
    const { messages, contextData } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API nøgle mangler. Indstil GEMINI_API_KEY i Secrets.',
      });
    }

    const systemInstruction = `Du er en statsautoriseret revisor og skatterådgiver med speciale i dansk B-indkomst, honorarløn, kunstnere, musikere og enkeltmandsvirksomheder.
Du kender de præcise regler for:
- Rubrik 12 (B-indkomst / honorarer med AM-bidrag)
- Rubrik 17 (Legater, visse personalegoder)
- Rubrik 29 (Øvrige fradrag i personlig indkomst - driftsomkostninger som udstyr, kørsel i egen bil/cykel efter statens takster, broafgift, parkering)
- Rubrik 51 (Befordringsfradrag - kun hvis passager)
- Forretningsregel: Rubrik 29 må ALDRIG give underskud i personlig indkomst (fradrag kan ikke overstige B-indkomst efter AM-bidrag).
- AM-bidrag på 8%
- Hvor meget der skal sættes til side til skat (typisk 38-42% af B-indkomst efter AM-bidrag)

Vigtigt: Du skal besvare på flydende, pædagogisk dansk. Vær altid præcis og henvend dig direkte til brugeren. Hvis brugeren har aktuelle tal, kan du referere til disse:
Aktuel kontekst: ${JSON.stringify(contextData || {})}`;

    const formattedContents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
      },
    });

    res.json({
      reply: response.text || 'Beklager, kunne ikke generere svar.',
    });
  } catch (err: any) {
    console.error('Error in revisor chat:', err);
    res.status(500).json({
      error: 'Fejl under revisor-chat',
      details: err?.message || String(err),
    });
  }
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Revisor AI server running at http://localhost:${PORT}`);
  });
}

startServer();
