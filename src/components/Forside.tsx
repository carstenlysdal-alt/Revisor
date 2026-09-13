import React, { useState } from 'react';
import type { IndkomstAar } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { kr } from '../lib/format';
import { useDiktering } from '../hooks/useDiktering';
import { Knap, Notatfelt } from './ui';
import { Mic, MicOff } from 'lucide-react';

interface Gruppe {
  titel: string;
  elementer: { id: string; navn: string; beskrivelse: string }[];
}

const GRUPPER: Gruppe[] = [
  {
    titel: 'Indtægt og fradrag',
    elementer: [
      { id: 'jobs', navn: 'Jobs og kørsel', beskrivelse: 'Honorarer, rubrik 12 og 17' },
      { id: 'fradrag', navn: 'Fradrag', beskrivelse: 'Driftsomkostninger, rubrik 29' },
      { id: 'investeringer', navn: 'Investeringer', beskrivelse: 'Anlægsaktiver' },
    ],
  },
  {
    titel: 'Skat',
    elementer: [
      { id: 'overblik', navn: 'Skatteoverblik', beskrivelse: 'Beregningen for året' },
      { id: 'aarsopgoerelse', navn: 'Årsopgørelse', beskrivelse: 'Rubrik for rubrik' },
      { id: 'opsparing', navn: 'Sæt til side', beskrivelse: 'Det du skal have liggende' },
    ],
  },
  {
    titel: 'Andet',
    elementer: [
      { id: 'statistik', navn: 'Statistik', beskrivelse: 'Udvikling over tid' },
      { id: 'dokumentation', navn: 'Dokumentation', beskrivelse: 'Bilag og noter, samlet' },
      { id: 'aar', navn: 'Indkomstår', beskrivelse: 'Opret, lås, skift år' },
    ],
  },
];

function hilsen(): string {
  const time = new Date().getHours();
  if (time < 5) return 'God nat';
  if (time < 10) return 'Godmorgen';
  if (time < 18) return 'God dag';
  return 'God aften';
}

export function Forside({
  indkomstAar,
  beregning,
  aiKlar,
  onStilSpoergsmaal,
  onGaaTil,
}: {
  indkomstAar: IndkomstAar;
  beregning: SkatteBeregning;
  aiKlar: boolean;
  onStilSpoergsmaal: (tekst: string) => void;
  onGaaTil: (fane: string) => void;
}) {
  const [tekst, setTekst] = useState('');
  const diktering = useDiktering(tekst, setTekst);

  const send = () => {
    const besked = tekst.trim();
    if (!besked) return;
    diktering.stop();
    onStilSpoergsmaal(besked);
    setTekst('');
  };

  return (
    <div className="max-w-[70ch]">
      <p className="text-2xs uppercase tracking-wide text-ink-faint">
        Indkomstår {indkomstAar.aar}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
        {hilsen()}.
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Året står på <span className="tal font-medium text-ink">{kr(beregning.samletSkatOgAM)} kr.</span> i
        skat og AM-bidrag, og den næste krone honorar beskattes med{' '}
        <span className="tal font-medium text-ink">
          {beregning.marginalskatProcent.toFixed(1).replace('.', ',')} %
        </span>
        .
      </p>

      <div className="mt-8 border-y border-rule-strong py-6">
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-rule-strong font-display text-sm font-bold text-ink"
          >
            R
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Revisor
            </p>
            <form
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
                    ? 'Skriv, eller diktér: "spillede for Jazzhus, fik 3000 kr."'
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
          </div>
        </div>
      </div>

      <nav aria-label="Moduler" className="mt-8">
        {GRUPPER.map((gruppe) => (
          <div key={gruppe.titel} className="mb-7 last:mb-0">
            <h2 className="mb-1 text-2xs font-medium uppercase tracking-wide text-ink-faint">
              {gruppe.titel}
            </h2>
            <ul>
              {gruppe.elementer.map((e) => (
                <li key={e.id} className="border-b border-rule">
                  <button
                    type="button"
                    onClick={() => onGaaTil(e.id)}
                    className="overgang flex w-full items-baseline justify-between gap-4 py-2.5 text-left hover:text-ink"
                  >
                    <span className="text-sm font-medium text-ink">{e.navn}</span>
                    <span className="shrink-0 text-2xs text-ink-faint">{e.beskrivelse}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
