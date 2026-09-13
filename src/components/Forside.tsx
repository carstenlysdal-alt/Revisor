import React, { useState } from 'react';
import { useDiktering } from '../hooks/useDiktering';
import { Knap, Notatfelt } from './ui';
import { Mic, MicOff } from 'lucide-react';

const EKSEMPLER = [
  'Spillede for Jazzhus Montmartre i går, fik 4.500 kr., kørte selv i egen bil fra Slagelse',
  'Købt et nyt mikrofonstativ hos Thomann til 890 kr. i går',
  'Foredrag for Kolding Bibliotek, 2.000 kr., betalt som legat uden AM-bidrag',
];

function hilsen(): string {
  const time = new Date().getHours();
  if (time < 5) return 'God nat';
  if (time < 10) return 'Godmorgen';
  if (time < 18) return 'God dag';
  return 'God aften';
}

export function Forside({
  aiKlar,
  onStilSpoergsmaal,
}: {
  aiKlar: boolean;
  onStilSpoergsmaal: (tekst: string) => void;
}) {
  const [tekst, setTekst] = useState('');
  const diktering = useDiktering(tekst, setTekst);

  const send = (valgtTekst?: string) => {
    const besked = (valgtTekst ?? tekst).trim();
    if (!besked) return;
    diktering.stop();
    onStilSpoergsmaal(besked);
    setTekst('');
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{hilsen()}.</h1>

      <div className="mt-6 border-y border-rule-strong py-7">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-rule-strong font-display text-base font-bold text-ink"
          >
            R
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Revisor
            </p>
            <p className="mt-1.5 max-w-[62ch] text-base leading-snug text-ink">
              Skriv, hvad der skete — hvem, hvornår, hvor meget, og om du kørte selv. Revisor
              lægger tallene i de rigtige rubrikker med det samme, og intet gemmes, før du har
              godkendt det.
            </p>

            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Notatfelt
                vaerdi={tekst}
                onVaerdi={setTekst}
                placeholder={
                  aiKlar
                    ? 'Skriv, eller diktér: "spillede for Jazzhus, fik 3000 kr., kørte selv derover"'
                    : 'Kræver en AI-nøgle på serveren.'
                }
                disabled={!aiKlar}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <div className="mt-2.5 flex items-center justify-between gap-2">
                {diktering.understøttet ? (
                  <Knap
                    type="button"
                    onClick={diktering.lytter ? diktering.stop : diktering.start}
                    disabled={!aiKlar}
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
                <Knap art="primaer" type="submit" disabled={!aiKlar || !tekst.trim()}>
                  Spørg
                </Knap>
              </div>
            </form>
            {diktering.fejl && (
              <p role="alert" className="mt-2 text-2xs text-negative">
                {diktering.fejl}
              </p>
            )}

            {aiKlar && (
              <ul className="mt-5 space-y-1.5 border-t border-rule pt-4">
                {EKSEMPLER.map((e) => (
                  <li key={e}>
                    <button
                      type="button"
                      onClick={() => send(e)}
                      className="overgang text-left text-2xs text-ink-muted underline decoration-rule-strong underline-offset-4 hover:text-ink"
                    >
                      {e}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
