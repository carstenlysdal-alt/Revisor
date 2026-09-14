import React, { useMemo, useState } from 'react';
import type { Fradrag, IndkomstAar, Investering, Job } from '../types';
import { beregnSkat } from '../lib/tax/beregn';
import { UkendtIndkomstAarError } from '../lib/tax/satser';
import { dato, kr } from '../lib/format';
import { Advarsel, Knap, Sektion, Vaelger } from './ui';

interface Props {
  indkomstAarListe: IndkomstAar[];
  jobs: Job[];
  fradrag: Fradrag[];
  investeringer: Investering[];
}

/**
 * Ren print-typografi, uafhængig af Tabel/Th/Td.
 *
 * De almindelige tabelkomponenter har en min-width, der giver vandret scroll
 * på skærm — helt rigtigt der, men et papirark kan ikke scrolle. Her bruges i
 * stedet en fast bredde med tableLayout: fixed, så indholdet altid holder sig
 * inden for papirets margener, uanset hvor mange tegn en beskrivelse har.
 */
const printTabel: React.CSSProperties = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '8pt',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  color: 'var(--color-ink-faint)',
  borderBottom: '1px solid var(--color-rule-strong)',
  padding: '3pt 6pt 3pt 0',
  verticalAlign: 'bottom',
};

const td: React.CSSProperties = {
  fontSize: '9pt',
  borderBottom: '0.5pt solid var(--color-rule)',
  padding: '4pt 6pt 4pt 0',
  verticalAlign: 'top',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
};

const tal: React.CSSProperties = { ...td, textAlign: 'right', fontFamily: 'var(--font-mono)' };
const talTh: React.CSSProperties = { ...th, textAlign: 'right' };

function AarsRapport({
  indkomstAar,
  jobs,
  fradrag,
  investeringer,
  foerste,
}: {
  indkomstAar: IndkomstAar;
  jobs: Job[];
  fradrag: Fradrag[];
  investeringer: Investering[];
  foerste: boolean;
}) {
  let beregning: ReturnType<typeof beregnSkat> | null = null;
  let beregningsfejl: string | null = null;
  try {
    beregning = beregnSkat(indkomstAar, jobs, fradrag);
  } catch (err) {
    beregningsfejl = err instanceof UkendtIndkomstAarError ? err.message : 'Kunne ikke beregnes.';
  }

  return (
    <section
      style={{
        breakBefore: foerste ? 'auto' : 'page',
        breakInside: 'avoid-page',
      }}
    >
      <header style={{ borderBottom: '2pt solid var(--color-ink)', paddingBottom: '6pt', marginBottom: '10pt' }}>
        <h2 style={{ fontSize: '14pt', fontWeight: 800, margin: 0 }}>
          Dokumentation for indkomståret {indkomstAar.aar}
        </h2>
        <p style={{ fontSize: '8pt', color: 'var(--color-ink-muted)', margin: '2pt 0 0' }}>
          {indkomstAar.kommune || 'Kommune ikke angivet'}
          {indkomstAar.hjemmeadresse ? ` · ${indkomstAar.hjemmeadresse}` : ''}
        </p>
      </header>

      {beregning && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10pt',
            marginBottom: '14pt',
            breakInside: 'avoid',
          }}
        >
          {[
            ['Honorarer i alt', beregning.honorarerRubrik12 + beregning.rubrik17Indkomst],
            ['Fradrag, rubrik 29', beregning.anvendtFradragRubrik29],
            ['Skat og AM-bidrag', beregning.samletSkatOgAM],
            ['Tilbage efter skat', beregning.indtaegtEfterSkat],
          ].map(([label, beloeb]) => (
            <div key={label as string}>
              <p style={{ fontSize: '7pt', textTransform: 'uppercase', color: 'var(--color-ink-faint)', margin: 0 }}>
                {label}
              </p>
              <p style={{ fontSize: '12pt', fontWeight: 700, fontFamily: 'var(--font-mono)', margin: '1pt 0 0' }}>
                {kr(beloeb as number)} kr.
              </p>
            </div>
          ))}
        </div>
      )}

      {beregningsfejl && (
        <p style={{ fontSize: '9pt', color: 'var(--color-negative)' }}>{beregningsfejl}</p>
      )}

      <h3 style={{ fontSize: '10pt', fontWeight: 700, marginTop: '16pt', marginBottom: '4pt' }}>
        Honorarjobs — rubrik 12/17
      </h3>
      {jobs.length === 0 ? (
        <p style={{ fontSize: '9pt', color: 'var(--color-ink-faint)' }}>Ingen jobs registreret.</p>
      ) : (
        <table style={printTabel}>
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '29%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>Dato</th>
              <th style={th}>Hvervgiver</th>
              <th style={th}>Rubrik</th>
              <th style={talTh}>Honorar</th>
              <th style={talTh}>Kørsel</th>
              <th style={th}>Bilag</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const linje = beregning?.koersel.linjer.find((l) => l.jobId === j.id);
              return (
                <tr key={j.id} style={{ breakInside: 'avoid' }}>
                  <td style={td}>{dato(j.startDato)}</td>
                  <td style={td}>{j.hvervgiver}</td>
                  <td style={td}>{j.erRubrik17 ? '17' : '12'}</td>
                  <td style={tal}>{kr(j.honorar)}</td>
                  <td style={tal}>{linje && linje.fradrag > 0 ? kr(linje.fradrag) : '–'}</td>
                  <td style={{ ...td, fontSize: '7.5pt', color: 'var(--color-ink-faint)' }}>
                    {j.bilagIds.length > 0 ? `${j.bilagIds.length} vedhæftet` : '–'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3 style={{ fontSize: '10pt', fontWeight: 700, marginTop: '16pt', marginBottom: '4pt' }}>
        Fradrag — rubrik 29
      </h3>
      {fradrag.length === 0 ? (
        <p style={{ fontSize: '9pt', color: 'var(--color-ink-faint)' }}>Ingen fradrag registreret.</p>
      ) : (
        <table style={printTabel}>
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '37%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={th}>Dato</th>
              <th style={th}>Beskrivelse</th>
              <th style={th}>Type</th>
              <th style={talTh}>Fakturabeløb</th>
              <th style={talTh}>Andel</th>
              <th style={talTh}>Fradrag</th>
            </tr>
          </thead>
          <tbody>
            {fradrag.map((f) => (
              <tr key={f.id} style={{ breakInside: 'avoid' }}>
                <td style={td}>{dato(f.fakturaDato)}</td>
                <td style={td}>{f.beskrivelse}</td>
                <td style={{ ...td, color: 'var(--color-ink-faint)' }}>{f.typeKategori || '–'}</td>
                <td style={tal}>{kr(f.fakturaBeloeb)}</td>
                <td style={tal}>{f.fradragsProcent} %</td>
                <td style={tal}>{kr(f.fradragIDKK)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {investeringer.length > 0 && (
        <>
          <h3 style={{ fontSize: '10pt', fontWeight: 700, marginTop: '16pt', marginBottom: '4pt' }}>
            Investeringer
          </h3>
          <table style={printTabel}>
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '65%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th}>Dato</th>
                <th style={th}>Investering</th>
                <th style={talTh}>Beløb</th>
              </tr>
            </thead>
            <tbody>
              {investeringer.map((i) => (
                <tr key={i.id} style={{ breakInside: 'avoid' }}>
                  <td style={td}>{dato(i.fakturaDato)}</td>
                  <td style={td}>{i.titel}</td>
                  <td style={tal}>{kr(i.beloeb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {beregning && (
        <>
          <h3 style={{ fontSize: '10pt', fontWeight: 700, marginTop: '16pt', marginBottom: '4pt' }}>
            Rubrikker til årsopgørelsen
          </h3>
          <table style={printTabel}>
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '68%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <tbody>
              {[
                ['12', 'Honorarer', beregning.honorarerRubrik12],
                ['17', 'Gruppeliv, uddelinger, personalegoder', beregning.rubrik17Indkomst],
                ['29', 'Øvrige fradrag i personlig indkomst', beregning.anvendtFradragRubrik29],
                ['51', 'Befordring', beregning.befordringsFradragRubrik51],
              ].map(([nr, tekst, beloeb]) => (
                <tr key={nr as string} style={{ breakInside: 'avoid' }}>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{nr}</td>
                  <td style={td}>{tekst}</td>
                  <td style={tal}>{kr(beloeb as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p style={{ fontSize: '7pt', color: 'var(--color-ink-faint)', marginTop: '14pt' }}>
        Genereret af Revisor. Tallene er brugerens eget beslutningsgrundlag, ikke en officiel
        årsopgørelse — sammenhold med skat.dk.
      </p>
    </section>
  );
}

export function DokumentationModule({ indkomstAarListe, jobs, fradrag, investeringer }: Props) {
  const [valgtAarId, setValgtAarId] = useState<string>('alle');

  const sorteret = useMemo(
    () => [...indkomstAarListe].sort((a, b) => a.aar - b.aar),
    [indkomstAarListe]
  );

  const scope = valgtAarId === 'alle' ? sorteret : sorteret.filter((a) => a.id === valgtAarId);

  return (
    <Sektion
      titel="Dokumentation"
      beskrivelse="Én samlet, printvenlig opgørelse over dine honorarjobs, fradrag og investeringer — til revisor, bank eller SKAT. Vælg et enkelt år eller alle på én gang."
      handling={
        <>
          <Vaelger value={valgtAarId} onChange={(e) => setValgtAarId(e.target.value)} className="w-auto">
            <option value="alle">Alle indkomstår</option>
            {sorteret.map((a) => (
              <option key={a.id} value={a.id}>
                {a.aar}
              </option>
            ))}
          </Vaelger>
          <Knap art="primaer" onClick={() => window.print()}>
            Udskriv / gem som PDF
          </Knap>
        </>
      }
    >
      {sorteret.length === 0 ? (
        <Advarsel art="neutral" titel="Der er ikke noget at eksportere endnu">
          Opret mindst ét indkomstår med jobs eller fradrag, før der er en opgørelse at printe.
        </Advarsel>
      ) : (
        <>
          <p className="ikke-print mb-4 max-w-[64ch] text-2xs text-ink-muted">
            Forhåndsvisningen herunder følger sideopsætningen. Brug "Udskriv" for at gemme som
            PDF eller sende til en printer — hvert år starter på en ny side.
          </p>

          <div
            className="border border-rule-strong bg-surface p-6 print:border-0 print:p-0"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {scope.map((aar, i) => (
              <AarsRapport
                key={aar.id}
                indkomstAar={aar}
                jobs={jobs.filter((j) => j.indkomstAarId === aar.id)}
                fradrag={fradrag.filter((f) => f.indkomstAarId === aar.id)}
                investeringer={investeringer.filter((inv) => inv.indkomstAarId === aar.id)}
                foerste={i === 0}
              />
            ))}
          </div>
        </>
      )}
    </Sektion>
  );
}
