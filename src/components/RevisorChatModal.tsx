import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type {
  BrugerProfil,
  ChatBesked,
  Fradrag,
  IndkomstAar,
  Investering,
  Job,
  PosteringForslag,
} from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { kr, pct } from '../lib/format';
import { laesEventStroem } from '../lib/sse';
import { KineticLoader } from './KineticLoader';
import { PosteringForslagKort } from './PosteringForslagKort';
import { Advarsel, Knap, Modal, Notatfelt, RevisorMaerke } from './ui';
import { Mic, MicOff } from 'lucide-react';
import { useDiktering } from '../hooks/useDiktering';

interface Props {
  aaben: boolean;
  onLuk: () => void;
  profil?: BrugerProfil;
  indkomstAar: IndkomstAar;
  indkomstAarListe: IndkomstAar[];
  beregning: SkatteBeregning;
  jobs?: Job[];
  aiKlar: boolean;
  onGemJob: (job: Job) => Promise<unknown>;
  onGemFradrag: (fradrag: Fradrag) => Promise<unknown>;
  onGemInvestering: (inv: Investering) => Promise<unknown>;
  /** Sat når chatten åbnes fra forsidens spørgeboks, med teksten der skal sendes med det samme. */
  startBesked?: string | null;
  onStartBeskedForbrugt?: () => void;
}

/** Faser vi faktisk kan skelne, fordi serveren melder dem fra strømmen. */
const FASETEKST: Record<string, string> = {
  laeser: 'Læser dine posteringer…',
  soeger: 'Søger på skat.dk…',
  laeser_kilder: 'Læser kilderne…',
  skriver: 'Skriver svaret…',
};

const FASER_UDEN_SOEGNING = [
  'Læser dine posteringer…',
  'Slår reglen op i beregningen…',
  'Skriver svaret…',
];

const FORSLAG = [
  'Hvor meget skal jeg sætte til side af min næste udbetaling?',
  'Hvorfor tæller mit kørselsfradrag ikke fuldt med?',
  'Hvad er forskellen på rubrik 29 og rubrik 51 for mig?',
];

export function RevisorChatModal({
  aaben,
  onLuk,
  profil,
  indkomstAar,
  indkomstAarListe,
  beregning,
  jobs,
  aiKlar,
  onGemJob,
  onGemFradrag,
  onGemInvestering,
  startBesked,
  onStartBeskedForbrugt,
}: Props) {
  const [beskeder, setBeskeder] = useState<ChatBesked[]>([]);
  const [input, setInput] = useState('');
  const [arbejder, setArbejder] = useState(false);
  const [fase, setFase] = useState<string | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [soegning, setSoegning] = useState(true);
  const diktering = useDiktering(input, setInput);
  /**
   * Kun det seneste, endnu ikke godkendte udkast er interaktivt. Et ældre
   * udkast, der er blevet erstattet af en rettelse, vises stadig som en
   * almindelig chatboble, men uden knapper — der er kun ét gyldigt kort ad
   * gangen, ellers bliver det uklart, hvilket der bekræftes.
   */
  const [aktivtForslagIndeks, setAktivtForslagIndeks] = useState<number | null>(null);
  /** Øges hver gang modellen tolker en besked som en bekræftelse af kortet. */
  const [bekraeftSignal, setBekraeftSignal] = useState(0);
  const bund = useRef<HTMLDivElement>(null);

  const aktivtForslag =
    aktivtForslagIndeks !== null ? beskeder[aktivtForslagIndeks]?.forslag ?? null : null;

  useEffect(() => {
    // Uden behavior: smooth. Ældre Safari understøtter det ikke.
    bund.current?.scrollIntoView({ block: 'end' });
  }, [beskeder, arbejder]);

  useEffect(() => {
    if (aaben) return;
    diktering.stop();
    // Samtalen skal ikke ligge og vente, næste gang chatten åbnes — hver
    // åbning er en frisk samtale, ikke en fortsættelse af den forrige.
    setBeskeder([]);
    setInput('');
    setFejl(null);
    setAktivtForslagIndeks(null);
    setBekraeftSignal(0);
    setFase(null);
    // Hookens stop-funktion ændrer identitet ved render; modaltilstanden er
    // den eneste ændring, der skal styre denne oprydning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aaben]);

  /**
   * Beregningen sendes med, så modellen kan gengive tallene i stedet for at
   * regne dem. Kun de felter, der giver mening at svare ud fra.
   */
  const kontekst = () => ({
    aar: beregning.aar,
    profil,
    navn: profil?.navn,
    bopaelsadresse: profil?.hjemmeadresse || indkomstAar.hjemmeadresse || undefined,
    hjemmeadresse: profil?.hjemmeadresse || indkomstAar.hjemmeadresse || undefined,
    kommune: profil?.kommune || indkomstAar.kommune,
    kendteHvervgivere: jobs ? Array.from(new Set(jobs.map((j) => j.hvervgiver).filter(Boolean))) : [],
    honorarerRubrik12: beregning.honorarerRubrik12,
    rubrik17: beregning.rubrik17Indkomst,
    amBidrag: beregning.amBidrag,
    fradragRubrik29: beregning.oevrigeFradragRubrik29,
    anvendtFradragRubrik29: beregning.anvendtFradragRubrik29,
    loftRubrik29: beregning.maksTilladtFradragRubrik29,
    loftOverskredet: beregning.rubrik29LoftOverskredet,
    befordringRubrik51: beregning.befordringsFradragRubrik51,
    personligIndkomst: beregning.personligIndkomst,
    beregnetSkat: beregning.beregnetSkatIAlt,
    samletSkatOgAM: beregning.samletSkatOgAM,
    tilbageEfterSkat: beregning.indtaegtEfterSkat,
    effektivSkatteprocent: beregning.effektivSkatteprocent,
    marginalskatProcent: beregning.marginalskatProcent,
    skattelinjer: beregning.skat,
  });

  const send = async (tekst: string) => {
    const spørgsmål = tekst.trim();
    if (!spørgsmål || arbejder) return;
    diktering.stop();

    const historik: ChatBesked[] = [...beskeder, { rolle: 'bruger', indhold: spørgsmål }];
    setBeskeder(historik);
    setInput('');
    setFejl(null);
    setArbejder(true);
    setFase(null);

    try {
      await laesEventStroem(
        '/api/ai/chat',
        {
          beskeder: historik.map((b) => ({ rolle: b.rolle, indhold: b.indhold })),
          beregning: kontekst(),
          brugWebsoegning: soegning,
          aktivtForslag,
        },
        (type, data) => {
          const d = data as Record<string, unknown>;
          if (type === 'status') {
            setFase(FASETEKST[String(d.fase)] ?? null);
          } else if (type === 'faerdig') {
            setBeskeder((b) => [
              ...b,
              {
                rolle: 'assistent',
                indhold: String(d.tekst ?? ''),
                kilder: (d.kilder as ChatBesked['kilder']) ?? undefined,
              },
            ]);
          } else if (type === 'forslag') {
            const forslag = d.forslag as PosteringForslag;
            setBeskeder((b) => {
              const næste = [...b, { rolle: 'assistent' as const, indhold: String(d.besked ?? forslag.besked), forslag }];
              setAktivtForslagIndeks(næste.length - 1);
              return næste;
            });
          } else if (type === 'bekraeft') {
            // Kun et signal fra modellen. Kortet gemmer det, der faktisk står
            // i det lige nu — inklusive eventuelle rettelser brugeren har
            // lavet direkte i felterne, ikke nødvendigvis det oprindelige
            // AI-forslag.
            setBekraeftSignal((n) => n + 1);
          } else if (type === 'fejl') {
            setFejl(String(d.fejl));
          }
        }
      );
    } catch (err) {
      setFejl(
        err instanceof Error
          ? err.message
          : 'Der kom ikke noget svar tilbage. Prøv igen.'
      );
    } finally {
      setArbejder(false);
      setFase(null);
    }
  };

  useEffect(() => {
    // Forsidens spørgeboks åbner chatten og leverer teksten i samme
    // handling. Forbruget nulstiller den hos App, så den ikke sendes igen,
    // hvis modalen lukkes og åbnes uden en ny forespørgsel.
    if (aaben && startBesked) {
      void send(startBesked);
      onStartBeskedForbrugt?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aaben, startBesked]);

  return (
    <Modal
      aaben={aaben}
      onLuk={onLuk}
      titel={
        <span className="flex items-center gap-2.5">
          <RevisorMaerke stoerrelse="sm" />
          Revisor
        </span>
      }
      beskrivelse={`Svarer ud fra dine egne tal for ${beregning.aar}. Beregningen kommer fra regelmotoren, ikke fra modellen.`}
      bredde="max-w-3xl"
    >
      {!aiKlar ? (
        <Advarsel titel="Chatten er slået fra">
          Der er ingen AI-nøgle på serveren. Sæt GEMINI_API_KEY eller DEEPSEEK_API_KEY i
          .env og start serveren igen, så virker både chatten og bilagslæsningen.
        </Advarsel>
      ) : (
        <div className="flex h-[60vh] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {beskeder.length === 0 && !arbejder && (
              <div className="py-6">
                <p className="mb-4 max-w-[60ch] text-xs text-ink-muted">
                  Spørg om dine egne tal eller om reglerne. Året står på{' '}
                  {kr(beregning.samletSkatOgAM)} kr. i skat og AM-bidrag, og den næste krone
                  honorar beskattes med {pct(beregning.marginalskatProcent)}.
                </p>
                <ul className="space-y-1.5">
                  {FORSLAG.map((f) => (
                    <li key={f}>
                      <button
                        type="button"
                        onClick={() => send(f)}
                        className="overgang text-left text-xs text-ink-muted underline decoration-rule-strong underline-offset-4 hover:text-ink"
                      >
                        {f}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-5 py-2">
              {beskeder.map((b, i) => (
                <div key={i} className={b.rolle === 'bruger' ? 'ml-auto max-w-[80%]' : undefined}>
                  {b.rolle === 'bruger' ? (
                    <p className="whitespace-pre-wrap text-right text-sm text-ink-muted">
                      {b.indhold}
                    </p>
                  ) : (
                    <div className="max-w-[68ch] text-sm text-ink">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => (
                            <ul className="mb-2 list-disc space-y-0.5 pl-5">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-2 list-decimal space-y-0.5 pl-5">{children}</ol>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold">{children}</strong>
                          ),
                          code: ({ children }) => (
                            <code className="tal bg-sunk px-1">{children}</code>
                          ),
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-2"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {b.indhold}
                      </ReactMarkdown>

                      {b.kilder && b.kilder.length > 0 && (
                        <ul className="mt-2 space-y-0.5 border-t border-rule pt-2">
                          {b.kilder.map((k) => (
                            <li key={k.url} className="text-2xs">
                              <a
                                href={k.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-ink-muted underline underline-offset-2 hover:text-ink"
                              >
                                {k.titel}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}

                      {b.forslag && i === aktivtForslagIndeks && (
                        <PosteringForslagKort
                          forslag={b.forslag}
                          indkomstAarId={indkomstAar.id}
                          indkomstAarListe={indkomstAarListe}
                          onGemJob={onGemJob}
                          onGemFradrag={onGemFradrag}
                          onGemInvestering={onGemInvestering}
                          bekraeftSignal={bekraeftSignal}
                          onGemt={() => setAktivtForslagIndeks(null)}
                          onForkast={() => setAktivtForslagIndeks(null)}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}

              {arbejder && (
                <KineticLoader
                  faser={soegning ? Object.values(FASETEKST) : FASER_UDEN_SOEGNING}
                  aktivFase={fase}
                />
              )}

              {fejl && <Advarsel titel="Svaret kom ikke igennem">{fejl}</Advarsel>}
              <div ref={bund} />
            </div>
          </div>

          <div className="border-t border-rule pt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <label htmlFor="chat-input" className="sr-only">
                Spørgsmål til revisoren
              </label>
              <Notatfelt
                id="chat-input"
                vaerdi={input}
                onVaerdi={setInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Skriv dit spørgsmål"
              />
              <div className="mt-2.5 flex items-center justify-between gap-2">
                {diktering.understøttet ? (
                  <Knap
                    type="button"
                    onClick={diktering.lytter ? diktering.stop : diktering.start}
                    aria-pressed={diktering.lytter}
                    className={diktering.lytter ? 'text-negative' : ''}
                  >
                    {diktering.lytter ? (
                      <MicOff className="h-3.5 w-3.5" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" />
                    )}
                    {diktering.lytter ? 'Stop' : 'Diktér'}
                  </Knap>
                ) : (
                  <span />
                )}
                <Knap art="primaer" type="submit" disabled={arbejder || !input.trim()}>
                  Send
                </Knap>
              </div>
            </form>

            {diktering.fejl && <p role="alert" className="mt-2 text-2xs text-negative">{diktering.fejl}</p>}

            <label className="mt-2 flex items-center gap-2 text-2xs text-ink-muted">
              <input
                type="checkbox"
                checked={soegning}
                onChange={(e) => setSoegning(e.target.checked)}
                className="h-3.5 w-3.5 accent-[oklch(0.21_0.008_75)]"
              />
              Slå regler op på skat.dk og retsinformation.dk, når spørgsmålet kræver det
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
