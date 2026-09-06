import React from 'react';
import type { IndkomstAar } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { kr } from '../lib/format';
import { Advarsel, Knap, Rubrik, Sektion, Tabel, Td, Th } from './ui';

interface Props {
  indkomstAar: IndkomstAar;
  beregning: SkatteBeregning;
}

export function AarsopgoerelseModule({ indkomstAar, beregning }: Props) {
  const rubrikker: {
    nr: 12 | 17 | 29 | 51;
    navn: string;
    beloeb: number;
    forklaring: string;
  }[] = [
    {
      nr: 12,
      navn: 'Honorarer, vederlag af forskellig art',
      beloeb: beregning.honorarerRubrik12,
      forklaring: 'Summen af alle honorarjobs i året.',
    },
    {
      nr: 17,
      navn: 'Gruppelivsforsikring, uddelinger, personalegoder',
      beloeb: beregning.rubrik17Indkomst,
      forklaring: 'Jobs, du har markeret som hørende til rubrik 17.',
    },
    {
      nr: 29,
      navn: 'Øvrige fradrag i personlig indkomst',
      beloeb: beregning.anvendtFradragRubrik29,
      forklaring:
        'Driftsomkostninger plus kørsel i egen bil eller på egen cykel. Beløbet kan ikke overstige B-indkomsten efter AM-bidrag.',
    },
    {
      nr: 51,
      navn: 'Befordring',
      beloeb: beregning.befordringsFradragRubrik51,
      forklaring: 'Kun kørsel registreret som passager.',
    },
  ];

  return (
    <Sektion
      titel={`Årsopgørelse ${beregning.aar}`}
      beskrivelse="Tallene, som de skal stå på årsopgørelsen på skat.dk. Sammenlign dem med det, der allerede er indberettet."
      handling={<Knap onClick={() => window.print()}>Udskriv</Knap>}
    >
      <Tabel minBredde={620}>
        <thead>
          <tr>
            <Th bredde="4rem">Rubrik</Th>
            <Th>Tekst på årsopgørelsen</Th>
            <Th hoejre bredde="10rem">Beløb</Th>
          </tr>
        </thead>
        <tbody>
          {rubrikker.map((r) => (
            <tr key={r.nr}>
              <Td>
                <Rubrik nr={r.nr} aktiv={r.beloeb !== 0} />
              </Td>
              <Td>
                <span className={r.beloeb !== 0 ? 'font-medium text-ink' : 'text-ink-muted'}>
                  {r.navn}
                </span>
                <span className="block max-w-[64ch] text-2xs text-ink-faint">
                  {r.forklaring}
                </span>
              </Td>
              <Td hoejre tal className={r.beloeb === 0 ? 'text-ink-faint' : undefined}>
                {kr(r.beloeb)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabel>

      <div className="mt-6 space-y-3">
        <Advarsel art="neutral" titel="Hvis et beløb ikke står, hvor du forventer">
          Mangler beløbet i rubrik 12 på den officielle årsopgørelse, skal det i stedet stå i
          rubrik 15. Mangler rubrik 17, skal det findes i rubrik 20. Hvilken rubrik der bruges,
          afhænger af, hvordan hvervgiveren har indberettet.
        </Advarsel>

        <Advarsel art="neutral" titel="Hvis der er indberettet for meget">
          Står der et højere beløb i rubrik 12 eller 17, end du selv har registreret, kan appen
          ikke rette det. Indberetningen kommer fra hvervgiveren, så den skal rettes af dem
          eller af SKAT.
        </Advarsel>

        {indkomstAar.laast && (
          <Advarsel art="positiv" titel="Året er låst">
            Der kan ikke ændres i posterne, før du låser året op igen.
          </Advarsel>
        )}
      </div>
    </Sektion>
  );
}
