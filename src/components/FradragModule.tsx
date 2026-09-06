import React, { useMemo, useState } from 'react';
import type { Bilag, Fradrag, IndkomstAar } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { dato, kr, pct, talFraFelt } from '../lib/format';
import { api } from '../lib/api';
import {
  Advarsel,
  BeloebFelt,
  Datofelt,
  Felt,
  Knap,
  Modal,
  Notatfelt,
  MobilPost,
  MobilSum,
  Responsiv,
  Rubrik,
  Sektion,
  Sumraekke,
  Tabel,
  Td,
  Tekstfelt,
  Th,
  TomTilstand,
} from './ui';

interface Props {
  fradragListe: Fradrag[];
  bilag: Bilag[];
  indkomstAar: IndkomstAar;
  beregning: SkatteBeregning;
  onGem: (fradrag: Fradrag) => Promise<unknown>;
  onSlet: (id: string) => Promise<unknown>;
  onAabnScanner: () => void;
}

const UDEFINERET = 'Uden kategori';

const nytFradrag = (indkomstAarId: string, aar: number): Fradrag => ({
  id: `fradrag-${Date.now()}`,
  indkomstAarId,
  beskrivelse: '',
  typeKategori: '',
  fakturaDato: `${aar}-01-01`,
  fakturaBeloeb: 0,
  fradragsProcent: 100,
  fradragIDKK: 0,
  bilagIds: [],
  revisorNotat: '',
});

export function FradragModule({
  fradragListe,
  bilag,
  indkomstAar,
  beregning,
  onGem,
  onSlet,
  onAabnScanner,
}: Props) {
  const [redigerer, setRedigerer] = useState<Fradrag | null>(null);
  const [sletter, setSletter] = useState<Fradrag | null>(null);
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [beloeb, setBeloeb] = useState('');
  const [procent, setProcent] = useState('100');

  const bilagIndeks = useMemo(() => new Map(bilag.map((b) => [b.id, b])), [bilag]);

  const grupper = useMemo(() => {
    const kort = new Map<string, Fradrag[]>();
    for (const f of fradragListe) {
      const nøgle = f.typeKategori?.trim() || UDEFINERET;
      kort.set(nøgle, [...(kort.get(nøgle) ?? []), f]);
    }
    return [...kort.entries()].sort(([a], [b]) =>
      a === UDEFINERET ? 1 : b === UDEFINERET ? -1 : a.localeCompare(b, 'da')
    );
  }, [fradragListe]);

  const aabn = (fradrag: Fradrag) => {
    setFejl(null);
    setRedigerer(fradrag);
    setBeloeb(fradrag.fakturaBeloeb ? String(fradrag.fakturaBeloeb) : '');
    setProcent(String(fradrag.fradragsProcent ?? 100));
  };

  const kladdensFradrag = Math.round((talFraFelt(beloeb) * talFraFelt(procent)) / 100);

  /**
   * Hvad ville rubrik 29 stå på, hvis kladden blev gemt?
   * Loftet skal advares om, før posten gemmes, ikke bagefter.
   */
  const rubrik29EfterGem = useMemo(() => {
    const eksisterende = fradragListe
      .filter((f) => f.id !== redigerer?.id)
      .reduce((sum, f) => sum + f.fradragIDKK, 0);
    return eksisterende + kladdensFradrag + beregning.koerselsFradragRubrik29;
  }, [fradragListe, redigerer, kladdensFradrag, beregning.koerselsFradragRubrik29]);

  const overskrides = rubrik29EfterGem > beregning.maksTilladtFradragRubrik29;
  const overskud = Math.max(0, rubrik29EfterGem - beregning.maksTilladtFradragRubrik29);

  const gem = async () => {
    if (!redigerer) return;
    setFejl(null);

    if (!redigerer.beskrivelse.trim()) {
      setFejl('Skriv hvad udgiften dækker. Uden beskrivelse kan fradraget ikke dokumenteres.');
      return;
    }
    const p = talFraFelt(procent);
    if (p < 0 || p > 100) {
      setFejl('Fradragsprocenten skal ligge mellem 0 og 100.');
      return;
    }

    setGemmer(true);
    try {
      await onGem({
        ...redigerer,
        fakturaBeloeb: talFraFelt(beloeb),
        fradragsProcent: p,
        fradragIDKK: kladdensFradrag,
      });
      setRedigerer(null);
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Fradraget kunne ikke gemmes.');
    } finally {
      setGemmer(false);
    }
  };

  const laast = indkomstAar.laast;

  return (
    <Sektion
      titel="Fradrag"
      beskrivelse="Driftsomkostninger, der kan trækkes fra i rubrik 29. Er en udgift kun delvist erhvervsmæssig, sætter du selv procenten. Det skøn hæfter du for."
      handling={
        laast ? null : (
          <>
            <Knap onClick={onAabnScanner} className="hidden lg:inline-flex">
              Læs en kvittering
            </Knap>
            <Knap art="primaer" onClick={() => aabn(nytFradrag(indkomstAar.id, indkomstAar.aar))}>
              Nyt fradrag
            </Knap>
          </>
        )
      }
    >
      {beregning.rubrik29LoftOverskredet && (
        <div className="mb-4">
          <Advarsel titel="Fradragene overstiger loftet for rubrik 29">
            Du har {kr(beregning.oevrigeFradragRubrik29)} kr. i rubrik 29, men loftet er{' '}
            {kr(beregning.maksTilladtFradragRubrik29)} kr., altså B-indkomsten efter AM-bidrag.
            De sidste {kr(beregning.overskydendeFradrag)} kr. tæller ikke med, fordi rubrik 29
            ikke må give underskud i den personlige indkomst.
          </Advarsel>
        </div>
      )}

      {fradragListe.length === 0 ? (
        <TomTilstand
          besked="Der er ingen fradrag i året endnu. Opret et, eller læg en kvittering ind og lad den blive læst."
          handling={
            laast ? undefined : (
              <>
                <Knap art="primaer" onClick={() => aabn(nytFradrag(indkomstAar.id, indkomstAar.aar))}>
                  Nyt fradrag
                </Knap>
                <Knap onClick={onAabnScanner} className="hidden lg:inline-flex">
              Læs en kvittering
            </Knap>
              </>
            )
          }
        />
      ) : (
        <Responsiv
          tabel={
            <Tabel minBredde={780}>
          <thead>
            <tr>
              <Th bredde="2.5rem" />
              <Th>Omkostning</Th>
              <Th bredde="7rem">Fakturadato</Th>
              <Th hoejre bredde="8rem">Fakturabeløb</Th>
              <Th hoejre bredde="5rem">Andel</Th>
              <Th hoejre bredde="8rem">Fradrag</Th>
              <Th bredde="8rem" />
            </tr>
          </thead>
          <tbody>
            {grupper.map(([gruppe, poster]) => (
              <React.Fragment key={gruppe}>
                <tr>
                  <td colSpan={7} className="border-b border-rule pt-5 pb-1">
                    <span className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                      {gruppe}
                    </span>
                    <span className="tal ml-2 text-2xs text-ink-faint">
                      {kr(poster.reduce((s, f) => s + f.fradragIDKK, 0))} kr.
                    </span>
                  </td>
                </tr>
                {poster.map((f) => (
                  <tr key={f.id}>
                    <Td>
                      <Rubrik nr={29} aktiv />
                    </Td>
                    <Td>
                      <span className="font-medium text-ink">{f.beskrivelse}</span>
                      {f.revisorNotat && (
                        <span className="block max-w-[62ch] text-2xs text-ink-faint">
                          {f.revisorNotat}
                        </span>
                      )}
                      {f.bilagIds.map((id) => {
                        const b = bilagIndeks.get(id);
                        return b ? (
                          <a
                            key={id}
                            href={api.bilagUrl(id)}
                            target="_blank"
                            rel="noreferrer"
                            className="mr-2 text-2xs text-ink-muted underline underline-offset-2 hover:text-ink"
                          >
                            {b.filnavn}
                          </a>
                        ) : null;
                      })}
                    </Td>
                    <Td tal>{dato(f.fakturaDato)}</Td>
                    <Td hoejre tal>
                      {kr(f.fakturaBeloeb)}
                    </Td>
                    <Td hoejre tal>
                      {f.fradragsProcent} %
                    </Td>
                    <Td hoejre tal>
                      {kr(f.fradragIDKK)}
                    </Td>
                    <Td hoejre>
                      {!laast && (
                        <div className="ikke-print flex justify-end gap-1">
                          <Knap art="tekst" onClick={() => aabn(f)}>
                            Rediger
                          </Knap>
                          <Knap art="tekst" onClick={() => setSletter(f)}>
                            Slet
                          </Knap>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            <Sumraekke
              celler={[
                { indhold: 'Fradrag i alt', span: 3 },
                {
                  indhold: kr(fradragListe.reduce((s, f) => s + f.fakturaBeloeb, 0)),
                  hoejre: true,
                  tal: true,
                },
                { indhold: '' },
                { indhold: kr(beregning.fradragKatalogSum), hoejre: true, tal: true },
                { indhold: '' },
              ]}
            />
            <tr>
              <td colSpan={5} className="py-2 text-2xs text-ink-muted">
                Kørsel i egen bil eller på egen cykel, som også hører i rubrik 29
              </td>
              <td className="tal py-2 text-right text-2xs text-ink-muted">
                {kr(beregning.koerselsFradragRubrik29)}
              </td>
              <td />
            </tr>
            <Sumraekke
              celler={[
                { indhold: 'Rubrik 29 i alt', span: 5 },
                { indhold: kr(beregning.oevrigeFradragRubrik29), hoejre: true, tal: true },
                { indhold: '' },
              ]}
            />
          </tbody>
            </Tabel>
          }
          liste={
            <>
              {grupper.map(([gruppe, poster]) => (
                <React.Fragment key={gruppe}>
                  <li className="border-b border-rule pt-4 pb-1 text-2xs font-medium uppercase tracking-wide text-ink-faint">
                    {gruppe}
                  </li>
                  {poster.map((f) => (
                    <MobilPost
                      key={f.id}
                      rubrik={29}
                      titel={f.beskrivelse}
                      undertitel={
                        <>
                          {dato(f.fakturaDato)} · {kr(f.fakturaBeloeb)} kr.
                          {f.fradragsProcent !== 100 && ` · ${f.fradragsProcent} % erhverv`}
                        </>
                      }
                      beloeb={`${kr(f.fradragIDKK)} kr.`}
                      handlinger={
                        laast ? undefined : (
                          <>
                            <button
                              type="button"
                              onClick={() => aabn(f)}
                              className="text-2xs text-ink-muted underline underline-offset-4"
                            >
                              Rediger
                            </button>
                            <button
                              type="button"
                              onClick={() => setSletter(f)}
                              className="text-2xs text-negative underline underline-offset-4"
                            >
                              Slet
                            </button>
                          </>
                        )
                      }
                    />
                  ))}
                </React.Fragment>
              ))}
              {beregning.koerselsFradragRubrik29 > 0 && (
                <MobilPost
                  rubrik={29}
                  titel="Kørsel i egen bil eller på egen cykel"
                  undertitel="Beregnet ud fra jobbene"
                  beloeb={`${kr(beregning.koerselsFradragRubrik29)} kr.`}
                />
              )}
              <MobilSum
                tekst="Rubrik 29 i alt"
                beloeb={`${kr(beregning.oevrigeFradragRubrik29)} kr.`}
              />
            </>
          }
        />
      )}

      <Modal
        aaben={Boolean(redigerer)}
        onLuk={() => setRedigerer(null)}
        titel={fradragListe.some((f) => f.id === redigerer?.id) ? 'Rediger fradrag' : 'Nyt fradrag'}
        bund={
          <>
            <Knap onClick={() => setRedigerer(null)}>Annullér</Knap>
            <Knap art="primaer" onClick={gem} disabled={gemmer}>
              {gemmer ? 'Gemmer' : overskrides ? 'Gem alligevel' : 'Gem fradrag'}
            </Knap>
          </>
        }
      >
        {redigerer && (
          <div className="space-y-5">
            {fejl && <Advarsel titel="Fradraget blev ikke gemt">{fejl}</Advarsel>}

            <Felt label="Fradragsberettiget omkostning" paakraevet>
              {(id) => (
                <Tekstfelt
                  id={id}
                  value={redigerer.beskrivelse}
                  placeholder="Hvad er købt"
                  onChange={(e) => setRedigerer({ ...redigerer, beskrivelse: e.target.value })}
                />
              )}
            </Felt>

            <div className="grid gap-4 sm:grid-cols-2">
              <Felt label="Type" hjaelp="Din egen kategori. Uden type samles posten under Uden kategori.">
                {(id) => (
                  <Tekstfelt
                    id={id}
                    value={redigerer.typeKategori}
                    placeholder="Parkering, broafgift, udstyr"
                    onChange={(e) =>
                      setRedigerer({ ...redigerer, typeKategori: e.target.value })
                    }
                  />
                )}
              </Felt>
              <Felt label="Fakturadato" paakraevet>
                {(id) => (
                  <Datofelt
                    id={id}
                    value={redigerer.fakturaDato}
                    onChange={(e) =>
                      setRedigerer({ ...redigerer, fakturaDato: e.target.value })
                    }
                  />
                )}
              </Felt>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <Felt label="Fakturabeløb" paakraevet hjaelp="Hele beløbet inklusive moms.">
                {(id) => <BeloebFelt id={id} vaerdi={beloeb} onVaerdi={setBeloeb} />}
              </Felt>
              <Felt
                label="Fradragsprocent"
                paakraevet
                hjaelp="100 ved ren erhvervsmæssig brug. Bruges varen også privat, sætter du andelen selv."
              >
                {(id) => (
                  <BeloebFelt id={id} vaerdi={procent} onVaerdi={setProcent} suffiks="%" />
                )}
              </Felt>
              <div className="flex flex-col justify-end pb-1">
                <span className="text-2xs text-ink-muted">Fradrag, rubrik 29</span>
                <span className="tal text-lg font-semibold text-ink">
                  {kr(kladdensFradrag)} kr.
                </span>
              </div>
            </div>

            {overskrides && (
              <Advarsel titel="Fradraget rammer loftet for rubrik 29">
                Med dette fradrag når rubrik 29 op på {kr(rubrik29EfterGem)} kr., men loftet er{' '}
                {kr(beregning.maksTilladtFradragRubrik29)} kr., altså B-indkomsten efter
                AM-bidrag. De {kr(overskud)} kr., der ligger over, tæller ikke med i
                beregningen, fordi rubrik 29 ikke må give underskud i den personlige indkomst.
                Du kan godt gemme posten, men den giver ikke fuld effekt i år.
              </Advarsel>
            )}

            <Felt label="Note" hjaelp="Bemærkninger om den skattemæssige behandling.">
              {(id) => (
                <Notatfelt
                  id={id}
                  vaerdi={redigerer.revisorNotat ?? ''}
                  onVaerdi={(v) => setRedigerer({ ...redigerer, revisorNotat: v })}
                />
              )}
            </Felt>
          </div>
        )}
      </Modal>

      <Modal
        aaben={Boolean(sletter)}
        onLuk={() => setSletter(null)}
        titel="Slet fradraget?"
        bredde="max-w-lg"
        bund={
          <>
            <Knap onClick={() => setSletter(null)}>Behold</Knap>
            <Knap
              art="fare"
              onClick={async () => {
                if (sletter) await onSlet(sletter.id);
                setSletter(null);
              }}
            >
              Slet fradraget
            </Knap>
          </>
        }
      >
        <p className="text-xs text-ink-muted">
          {sletter?.beskrivelse} med {kr(sletter?.fradragIDKK ?? 0)} kr. i fradrag forsvinder
          fra rubrik 29. Bilaget bliver liggende i arkivet.
        </p>
      </Modal>
    </Sektion>
  );
}
