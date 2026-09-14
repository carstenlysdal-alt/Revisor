import React, { useEffect, useState } from 'react';
import type { Job, OpsparingsTracker } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { dato, kr, pct, talFraFelt } from '../lib/format';
import { Advarsel, BeloebFelt, Felt, Knap, Sektion, Tabel, Td, Th } from './ui';

interface Props {
  beregning: SkatteBeregning;
  jobs: Job[];
  opsparing: OpsparingsTracker;
  onGem: (data: OpsparingsTracker) => Promise<unknown>;
}

export function OpsparingTrackerModule({ beregning, jobs, opsparing, onGem }: Props) {
  const [indbetalt, setIndbetalt] = useState(String(opsparing.indbetaltTilSkat || ''));
  const [opsparet, setOpsparet] = useState(String(opsparing.opsparetPrivat || ''));
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  useEffect(() => {
    setIndbetalt(String(opsparing.indbetaltTilSkat || ''));
    setOpsparet(String(opsparing.opsparetPrivat || ''));
  }, [opsparing]);

  const indbetaltTal = talFraFelt(indbetalt);
  const opsparetTal = talFraFelt(opsparet);
  const mangler = Math.max(0, beregning.samletSkatOgAM - indbetaltTal - opsparetTal);
  const daekket = beregning.samletSkatOgAM - mangler;
  const andel =
    beregning.samletSkatOgAM > 0 ? (daekket / beregning.samletSkatOgAM) * 100 : 100;

  const gem = async () => {
    setGemmer(true);
    setFejl(null);
    try {
      await onGem({ indbetaltTilSkat: indbetaltTal, opsparetPrivat: opsparetTal });
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Tallene kunne ikke gemmes.');
    } finally {
      setGemmer(false);
    }
  };

  const idag = new Date().toISOString().slice(0, 10);
  const kommende = jobs
    .filter((j) => j.betalingsDato && j.betalingsDato >= idag)
    .sort((a, b) => a.betalingsDato.localeCompare(b.betalingsDato));

  return (
    <Sektion
      titel="Sæt til side"
      beskrivelse="Restskat er det, der overrasker folk med B-indkomst. Her står, hvad året kommer til at koste, og hvor meget der allerede er dækket ind."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <table className="w-full">
            <tbody>
              <tr>
                <td className="border-b border-rule py-2">
                  Skat og AM-bidrag af årets B-indkomst
                  <span className="block text-2xs text-ink-faint">
                    Beregnet ud fra de jobs og fradrag, der er registreret nu.
                  </span>
                </td>
                <td className="tal w-40 border-b border-rule py-2 text-right">
                  {kr(beregning.samletSkatOgAM)}
                </td>
              </tr>
              <tr>
                <td className="border-b border-rule py-2">Allerede indbetalt til SKAT</td>
                <td className="tal w-40 border-b border-rule py-2 text-right">
                  −{kr(indbetaltTal)}
                </td>
              </tr>
              <tr>
                <td className="border-b border-rule py-2">Sat til side privat</td>
                <td className="tal w-40 border-b border-rule py-2 text-right">
                  −{kr(opsparetTal)}
                </td>
              </tr>
              <tr className={mangler > 0 ? 'bg-negative-ground' : 'bg-positive-ground'}>
                <td
                  className={`border-t-2 border-rule-strong py-2.5 font-semibold ${
                    mangler > 0 ? 'text-negative' : 'text-positive'
                  }`}
                >
                  {mangler > 0 ? 'Mangler at blive sat til side' : 'Du er dækket ind'}
                </td>
                <td
                  className={`tal border-t-2 border-rule-strong py-2.5 text-right font-semibold ${
                    mangler > 0 ? 'text-negative' : 'text-positive'
                  }`}
                >
                  {kr(mangler)}
                </td>
              </tr>
            </tbody>
          </table>

          <div
            className="mt-3 h-1.5 w-full bg-rule"
            role="img"
            aria-label={`${Math.round(andel)} procent af årets skat er dækket ind`}
          >
            <div
              className={`h-full ${mangler > 0 ? 'bg-negative' : 'bg-positive'}`}
              style={{ width: `${Math.min(100, Math.max(0, andel))}%` }}
            />
          </div>

          {kommende.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 font-display text-sm font-bold text-ink">
                Sæt til side, når pengene kommer ind
              </h3>
              <p className="mb-3 max-w-[64ch] text-2xs text-ink-muted">
                Den næste krone honorar beskattes med {pct(beregning.marginalskatProcent)}
                inklusive AM-bidrag. Sætter du den andel til side af hver udbetaling, kommer
                der ingen regning bagefter.
              </p>
              <Tabel minBredde={520}>
                <thead>
                  <tr>
                    <Th bredde="7rem">Betaling</Th>
                    <Th>Hvervgiver</Th>
                    <Th hoejre bredde="7rem">Honorar</Th>
                    <Th hoejre bredde="8rem">Sæt til side</Th>
                  </tr>
                </thead>
                <tbody>
                  {kommende.map((job) => (
                    <tr key={job.id}>
                      <Td tal>{dato(job.betalingsDato)}</Td>
                      <Td>{job.hvervgiver}</Td>
                      <Td hoejre tal>
                        {kr(job.honorar)}
                      </Td>
                      <Td hoejre tal className="font-semibold">
                        {kr((job.honorar * beregning.marginalskatProcent) / 100)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabel>
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-rule pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {fejl && <Advarsel titel="Tallene blev ikke gemt">{fejl}</Advarsel>}

          <Felt
            label="Indbetalt til SKAT i år"
            hjaelp="Kun beløb, der vedrører B-indkomsten, for eksempel frivillig indbetaling af restskat."
          >
            {(id) => <BeloebFelt id={id} vaerdi={indbetalt} onVaerdi={setIndbetalt} />}
          </Felt>

          <Felt label="Sat til side privat" hjaelp="Din egen opsparing til skatten.">
            {(id) => <BeloebFelt id={id} vaerdi={opsparet} onVaerdi={setOpsparet} />}
          </Felt>

          <Knap art="primaer" onClick={gem} disabled={gemmer} className="w-full justify-center">
            {gemmer ? 'Gemmer' : 'Gem tallene'}
          </Knap>
        </div>
      </div>
    </Sektion>
  );
}
