import React from 'react';
import type { IndkomstAar } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { kr, pct } from '../lib/format';
import { Advarsel, Knap, Rubrik, Sektion } from './ui';

interface Props {
  indkomstAar: IndkomstAar;
  beregning: SkatteBeregning;
}

function Linje({
  tekst,
  beloeb,
  rubrik,
  note,
  negativ = false,
  daempet = false,
}: {
  tekst: string;
  beloeb: number;
  rubrik?: 12 | 17 | 29 | 51;
  note?: string;
  negativ?: boolean;
  daempet?: boolean;
}) {
  return (
    <tr className={daempet && beloeb === 0 ? 'text-ink-faint' : undefined}>
      <td className="w-10 border-b border-rule py-1.5 align-top">
        {rubrik && <Rubrik nr={rubrik} aktiv={beloeb !== 0} />}
      </td>
      <td className="border-b border-rule py-1.5 pr-4 align-top">
        {tekst}
        {note && <span className="block max-w-[64ch] text-2xs text-ink-faint">{note}</span>}
      </td>
      <td className="tal w-40 border-b border-rule py-1.5 text-right align-top">
        {negativ && beloeb !== 0 ? `−${kr(beloeb)}` : kr(beloeb)}
      </td>
    </tr>
  );
}

function Total({ tekst, beloeb, note }: { tekst: string; beloeb: number; note?: string }) {
  return (
    <tr className="bg-sunk font-semibold">
      <td className="border-t-2 border-rule-strong py-2" />
      <td className="border-t-2 border-rule-strong py-2 pr-4">
        {tekst}
        {note && (
          <span className="block text-2xs font-normal text-ink-muted">{note}</span>
        )}
      </td>
      <td className="tal border-t-2 border-rule-strong py-2 text-right">{kr(beloeb)}</td>
    </tr>
  );
}

export function SkatOverblikModule({ indkomstAar, beregning }: Props) {
  const { skat, satser } = beregning;

  return (
    <Sektion
      titel={`Skatteoverblik ${beregning.aar}`}
      beskrivelse={`Hvad B-indkomsten koster oven i den A-indkomst, du har oplyst. Beregnet med satserne for ${satser.aar} og en kommuneskat på ${indkomstAar.kommuneSkatteprocent.toString().replace('.', ',')} %.`}
      handling={<Knap onClick={() => window.print()}>Udskriv</Knap>}
    >
      {beregning.advarsler.length > 0 && (
        <div className="mb-5 space-y-2">
          {beregning.advarsler.map((a) => (
            <Advarsel
              key={a.kode}
              art={a.kode === 'RUBRIK_29_LOFT' ? 'negativ' : 'neutral'}
            >
              {a.tekst}
            </Advarsel>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-display text-sm font-bold text-ink">
            Indkomst og fradrag
          </h3>
          <table className="w-full">
            <tbody>
              <Linje tekst="Honorarer" beloeb={beregning.honorarerRubrik12} rubrik={12} />
              <Linje
                tekst="Gruppeliv, uddelinger og personalegoder"
                beloeb={beregning.rubrik17Indkomst}
                rubrik={17}
                daempet
              />
              <Linje
                tekst="Øvrige fradrag i personlig indkomst"
                beloeb={beregning.anvendtFradragRubrik29}
                rubrik={29}
                negativ
                note={
                  beregning.rubrik29LoftOverskredet
                    ? `Der er registreret ${kr(beregning.oevrigeFradragRubrik29)} kr., men kun ${kr(beregning.maksTilladtFradragRubrik29)} kr. kan bruges i år.`
                    : `Heraf ${kr(beregning.koerselsFradragRubrik29)} kr. kørsel i egen bil eller på egen cykel.`
                }
              />
              <Linje
                tekst={`AM-bidrag, ${satser.amBidragProcent} %`}
                beloeb={beregning.amBidrag}
                negativ
                note={`Beregnet af ${kr(beregning.amPligtigBIndkomst)} kr. AM-pligtigt honorar.`}
              />
              <Total tekst="Personlig indkomst af B-indkomsten" beloeb={beregning.personligIndkomst} />

              <tr>
                <td colSpan={3} className="pt-6" />
              </tr>

              <Linje
                tekst="Befordringsfradrag"
                beloeb={beregning.befordringsFradragRubrik51}
                rubrik={51}
                negativ
                daempet
                note="Kun kørsel registreret som passager."
              />
              <Linje
                tekst="Beskæftigelsesfradrag"
                beloeb={skat.beskaeftigelsesfradrag}
                negativ
                daempet
                note={`${satser.beskaeftigelsesfradrag.procent} % af arbejdsindkomsten, højst ${kr(satser.beskaeftigelsesfradrag.maksimum)} kr.`}
              />
              <Linje
                tekst="Jobfradrag"
                beloeb={skat.jobfradrag}
                negativ
                daempet
                note={`${satser.jobfradrag.procent} % af indkomsten over ${kr(satser.jobfradrag.bundgraense)} kr., højst ${kr(satser.jobfradrag.maksimum)} kr.`}
              />
              <Total tekst="Skattepligtig indkomst af B-indkomsten" beloeb={beregning.skattepligtigIndkomst} />
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="mb-2 font-display text-sm font-bold text-ink">Skatten af B-indkomsten</h3>
          <table className="w-full">
            <tbody>
              <Linje tekst="AM-bidrag" beloeb={beregning.amBidrag} />
              <Linje tekst={`Bundskat, ${satser.bundskatProcent} %`} beloeb={skat.bundskat} />
              <Linje
                tekst={`Kommuneskat, ${indkomstAar.kommuneSkatteprocent.toString().replace('.', ',')} %`}
                beloeb={skat.kommuneskat}
              />
              {satser.progressiveSkatter.map((lag) => (
                <Linje
                  key={lag.id}
                  tekst={`${lag.navn}, ${lag.procent} %`}
                  beloeb={
                    lag.id === 'mellemskat'
                      ? skat.mellemskat
                      : lag.id === 'topskat'
                        ? skat.topskat
                        : skat.topTopskat
                  }
                  daempet
                  note={`Af personlig indkomst over ${kr(lag.graenseEfterAM)} kr. efter AM-bidrag.`}
                />
              ))}
              <Linje
                tekst={`Kirkeskat, ${indkomstAar.kirkeskatteprocent.toString().replace('.', ',')} %`}
                beloeb={skat.kirkeskat}
                daempet
              />
              <Linje
                tekst="Nedslag for det skrå skatteloft"
                beloeb={skat.skatteloftNedslag}
                negativ
                daempet
              />
              <Linje
                tekst="Skatteværdi af personfradrag"
                beloeb={skat.personfradragVaerdi}
                negativ
                note={
                  skat.personfradragVaerdi > 0
                    ? `B-indkomsten bruger den del af personfradraget på ${kr(satser.personfradrag)} kr., som A-indkomsten ikke har brugt.`
                    : `Personfradraget på ${kr(satser.personfradrag)} kr. er allerede brugt på A-indkomsten.`
                }
              />
              <Total tekst="Beregnet skat i alt" beloeb={beregning.beregnetSkatIAlt} />

              <tr>
                <td colSpan={3} className="pt-6" />
              </tr>

              <Linje tekst="Honorarer i alt" beloeb={beregning.honorarerRubrik12 + beregning.rubrik17Indkomst} />
              <Linje tekst="Skat og AM-bidrag i alt" beloeb={beregning.samletSkatOgAM} negativ />
              <Total
                tekst="Tilbage efter skat"
                beloeb={beregning.indtaegtEfterSkat}
                note={`Effektiv skat ${pct(beregning.effektivSkatteprocent)}. Den næste krone honorar beskattes med ${pct(beregning.marginalskatProcent)}.`}
              />
            </tbody>
          </table>
        </div>
      </div>
    </Sektion>
  );
}
