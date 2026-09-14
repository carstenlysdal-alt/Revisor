import React, { useMemo } from 'react';
import type { Job } from '../types';
import { kr } from '../lib/format';
import { Knap, Sektion, Tabel, Td, Th, TomTilstand } from './ui';

interface Props {
  jobs: Job[];
}

const UDEN_TYPE = 'Uden type';
const UGEDAGE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const MAANEDER = [
  'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'December',
];

interface Raekke {
  navn: string;
  honorar: number;
  timerJob: number;
  timerTransport: number;
  antal: number;
}

/** Vandret søjle. Bevidst uden diagrambibliotek: en linje med bredde er nok. */
function Soejle({ andel }: { andel: number }) {
  return (
    <div className="h-1 w-full bg-rule" aria-hidden="true">
      <div className="h-full bg-ink" style={{ width: `${Math.min(100, andel)}%` }} />
    </div>
  );
}

function Fordeling({
  titel,
  raekker,
  visTimeloen = false,
}: {
  titel: string;
  raekker: Raekke[];
  visTimeloen?: boolean;
}) {
  const total = raekker.reduce((s, r) => s + r.honorar, 0);
  if (raekker.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-bold text-ink">{titel}</h3>
      <Tabel minBredde={visTimeloen ? 640 : 460}>
        <thead>
          <tr>
            <Th>{titel.includes('type') ? 'Type' : titel.includes('måned') ? 'Måned' : 'Dag'}</Th>
            <Th bredde="30%" />
            <Th hoejre bredde="6rem">Andel</Th>
            <Th hoejre bredde="8rem">Honorar</Th>
            {visTimeloen && (
              <>
                <Th hoejre bredde="6rem">Timer</Th>
                <Th hoejre bredde="8rem">Timeløn</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {raekker.map((r) => {
            const timerIAlt = r.timerJob + r.timerTransport;
            return (
              <tr key={r.navn}>
                <Td>
                  {r.navn}
                  <span className="block text-2xs text-ink-faint">
                    {r.antal} {r.antal === 1 ? 'job' : 'jobs'}
                  </span>
                </Td>
                <Td>
                  <div className="pt-2">
                    <Soejle andel={total > 0 ? (r.honorar / total) * 100 : 0} />
                  </div>
                </Td>
                <Td hoejre tal>
                  {total > 0 ? `${Math.round((r.honorar / total) * 100)} %` : '–'}
                </Td>
                <Td hoejre tal>
                  {kr(r.honorar)}
                </Td>
                {visTimeloen && (
                  <>
                    <Td hoejre tal>
                      {timerIAlt > 0 ? timerIAlt.toLocaleString('da-DK') : '–'}
                    </Td>
                    <Td hoejre tal>
                      {timerIAlt > 0 ? kr(r.honorar / timerIAlt) : '–'}
                    </Td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </Tabel>
    </div>
  );
}

const saml = (jobs: Job[], noegle: (job: Job) => string): Raekke[] => {
  const kort = new Map<string, Raekke>();
  for (const job of jobs) {
    const navn = noegle(job);
    const r = kort.get(navn) ?? {
      navn,
      honorar: 0,
      timerJob: 0,
      timerTransport: 0,
      antal: 0,
    };
    r.honorar += Number(job.honorar) || 0;
    r.timerJob += Number(job.timerJob) || 0;
    r.timerTransport += Number(job.timerTransportForberedelse) || 0;
    r.antal += 1;
    kort.set(navn, r);
  }
  return [...kort.values()];
};

export function StatistikModule({ jobs }: Props) {
  const prType = useMemo(
    () =>
      saml(jobs, (j) => j.type?.trim() || UDEN_TYPE).sort((a, b) => b.honorar - a.honorar),
    [jobs]
  );

  const prUgedag = useMemo(() => {
    const rækker = saml(jobs, (j) => {
      const d = new Date(`${j.startDato}T12:00:00Z`);
      // getUTCDay giver 0 for søndag. Danske uger begynder om mandagen.
      return UGEDAGE[(d.getUTCDay() + 6) % 7] ?? UDEN_TYPE;
    });
    return UGEDAGE.map((dag) => rækker.find((r) => r.navn === dag)).filter(
      (r): r is Raekke => Boolean(r)
    );
  }, [jobs]);

  const prMaaned = useMemo(() => {
    const rækker = saml(jobs, (j) => MAANEDER[Number(j.startDato.slice(5, 7)) - 1] ?? UDEN_TYPE);
    return MAANEDER.map((m) => rækker.find((r) => r.navn === m)).filter(
      (r): r is Raekke => Boolean(r)
    );
  }, [jobs]);

  if (jobs.length === 0) {
    return (
      <Sektion titel="Statistik" beskrivelse="Fordelingen af årets honorarer og timer.">
        <TomTilstand besked="Statistikken bygger på de jobs, du har registreret. Opret et par jobs, så er der noget at se på." />
      </Sektion>
    );
  }

  const medTimer = jobs.some((j) => j.timerJob || j.timerTransportForberedelse);

  return (
    <Sektion
      titel="Statistik"
      beskrivelse={
        medTimer
          ? 'Fordelingen af årets honorarer og timer. Timelønnen regnes af både arbejdstid og forberedelse og transport.'
          : 'Fordelingen af årets honorarer. Udfylder du timer på jobbene, kommer timelønnen med her.'
      }
      handling={<Knap onClick={() => window.print()}>Udskriv</Knap>}
    >
      <div className="space-y-10">
        <Fordeling titel="Honorar pr. type" raekker={prType} visTimeloen={medTimer} />
        <Fordeling titel="Honorar pr. måned" raekker={prMaaned} />
        <Fordeling titel="Honorar pr. ugedag" raekker={prUgedag} />
      </div>
    </Sektion>
  );
}
