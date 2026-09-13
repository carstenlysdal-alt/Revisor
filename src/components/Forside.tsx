import React, { useState } from 'react';
import type { Fradrag, Investering, Job } from '../types';
import { dato, kr } from '../lib/format';
import { useDiktering } from '../hooks/useDiktering';
import { Badge, IkonFlise, Knap, Kort, Notatfelt, RevisorAvatar } from './ui';
import {
  ArrowRight,
  Car,
  FileText,
  Mic,
  MicOff,
  Music2,
  PiggyBank,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';

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

/** "I går · 12. mar. 2026" tæt på i dag, ellers bare datoen. */
function relativDato(iso: string): string {
  const maal = new Date(`${iso}T00:00:00`);
  const iDag = new Date();
  iDag.setHours(0, 0, 0, 0);
  const diffDage = Math.round((iDag.getTime() - maal.getTime()) / 86_400_000);
  if (diffDage === 0) return `I dag · ${dato(iso)}`;
  if (diffDage === 1) return `I går · ${dato(iso)}`;
  return dato(iso);
}

interface AktivitetsPost {
  id: string;
  ikon: React.ReactNode;
  titel: string;
  undertitel: string;
  beloeb: number;
  badgeTekst: string;
  badgeArt: 'indtaegt' | 'neutral';
  fane: string;
  sortDato: string;
}

export function Forside({
  aiKlar,
  onStilSpoergsmaal,
  onDropFil,
  onAabnScanner,
  onGaaTil,
  jobs,
  fradragListe,
  investeringer,
}: {
  aiKlar: boolean;
  onStilSpoergsmaal: (tekst: string) => void;
  onDropFil: (fil: File) => void;
  onAabnScanner: () => void;
  onGaaTil: (fane: string) => void;
  jobs: Job[];
  fradragListe: Fradrag[];
  investeringer: Investering[];
}) {
  const [tekst, setTekst] = useState('');
  const [traekkerOver, setTraekkerOver] = useState(false);
  const diktering = useDiktering(tekst, setTekst);

  const send = (valgtTekst?: string) => {
    const besked = (valgtTekst ?? tekst).trim();
    if (!besked) return;
    diktering.stop();
    onStilSpoergsmaal(besked);
    setTekst('');
  };

  const aktivitet: AktivitetsPost[] = [
    ...jobs.map((j): AktivitetsPost => ({
      id: j.id,
      ikon: <Music2 className="h-4 w-4" />,
      titel: j.hvervgiver,
      undertitel: relativDato(j.startDato),
      beloeb: j.honorar,
      badgeTekst: 'Indtægt',
      badgeArt: 'indtaegt',
      fane: 'indtaegter',
      sortDato: j.startDato,
    })),
    ...fradragListe.map((f): AktivitetsPost => ({
      id: f.id,
      ikon: <ShoppingCart className="h-4 w-4" />,
      titel: f.beskrivelse,
      undertitel: relativDato(f.fakturaDato),
      beloeb: f.fakturaBeloeb,
      badgeTekst: 'Udgift',
      badgeArt: 'neutral',
      fane: 'fradrag',
      sortDato: f.fakturaDato,
    })),
    ...investeringer.map((i): AktivitetsPost => ({
      id: i.id,
      ikon: <TrendingUp className="h-4 w-4" />,
      titel: i.titel,
      undertitel: relativDato(i.fakturaDato),
      beloeb: i.beloeb,
      badgeTekst: 'Investering',
      badgeArt: 'neutral',
      fane: 'investeringer',
      sortDato: i.fakturaDato,
    })),
  ]
    .sort((a, b) => b.sortDato.localeCompare(a.sortDato))
    .slice(0, 5);

  return (
    <div>
      <Kort className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <RevisorAvatar className="h-16 w-16 text-ink" />
          <div className="min-w-0 flex-1">
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Din AI-revisor
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight text-ink">
              {hilsen()}. Din AI-revisor er klar.
            </h1>
            <p className="mt-1.5 max-w-[62ch] text-sm text-ink-muted">
              Fortæl, hvad der er sket: et job, en udgift eller en kørsel. Du kan skrive,
              tale eller trække et bilag herned. Revisor klarer resten, og intet gemmes, før
              du har godkendt det.
            </p>

            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <div
                onDragOver={(e) => {
                  if (!aiKlar) return;
                  e.preventDefault();
                  setTraekkerOver(true);
                }}
                onDragLeave={() => setTraekkerOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setTraekkerOver(false);
                  if (!aiKlar) return;
                  const fil = e.dataTransfer.files?.[0];
                  if (fil) onDropFil(fil);
                }}
                className={`overgang rounded-[4px] ${traekkerOver ? 'ring-2 ring-ink' : ''}`}
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
              </div>
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
      </Kort>

      <div className="mt-6">
        <h2 className="font-display text-lg font-bold tracking-tight text-ink">
          Hurtige handlinger
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <IkonFlise
            ikon={<Music2 className="h-5 w-5" />}
            titel="Registrér job"
            undertekst="Fx koncert, foredrag"
            onClick={() => onGaaTil('indtaegter')}
          />
          <IkonFlise
            ikon={<FileText className="h-5 w-5" />}
            titel="Tilføj bilag"
            undertekst="Kvittering, faktura"
            onClick={onAabnScanner}
          />
          <IkonFlise
            ikon={<Car className="h-5 w-5" />}
            titel="Registrér kørsel"
            undertekst="Spor og fradrag"
            onClick={() => onGaaTil('koersel')}
          />
          <IkonFlise
            ikon={<PiggyBank className="h-5 w-5" />}
            titel="Sæt skat til side"
            undertekst="Overfør til opsparing"
            onClick={() => onGaaTil('opsparing')}
          />
        </div>
      </div>

      {aktivitet.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">
              Seneste aktivitet
            </h2>
            <button
              type="button"
              onClick={() => onGaaTil('dokumentation')}
              className="overgang flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
            >
              Se alle
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="mt-2 border-t border-rule">
            {aktivitet.map((post) => (
              <li key={`${post.fane}-${post.id}`} className="border-b border-rule">
                <button
                  type="button"
                  onClick={() => onGaaTil(post.fane)}
                  className="overgang flex w-full items-center gap-3 py-3 text-left hover:bg-sunk"
                >
                  <span aria-hidden="true" className="text-ink-faint">
                    {post.ikon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {post.titel}
                    </span>
                    <span className="block text-2xs text-ink-faint">{post.undertitel}</span>
                  </span>
                  <Badge art={post.badgeArt}>{post.badgeTekst}</Badge>
                  <span className="tal w-24 shrink-0 text-right text-sm font-medium text-ink">
                    {kr(post.beloeb)} kr.
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
