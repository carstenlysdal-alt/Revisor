import React, { useState } from 'react';
import type { IndkomstAar } from '../types';
import { KOMMUNENAVNE, GENNEMSNIT, getKommuneSatser } from '../lib/tax/kommuner';
import { TILGAENGELIGE_AAR } from '../lib/tax/satser';
import { kr, talFraFelt } from '../lib/format';
import {
  Advarsel,
  Afkrydsning,
  BeloebFelt,
  Felt,
  Knap,
  Modal,
  Sektion,
  Tabel,
  Td,
  Tekstfelt,
  Th,
  TomTilstand,
  Vaelger,
} from './ui';

interface Props {
  indkomstAarListe: IndkomstAar[];
  aktivtAarId: string | null;
  antalPoster: (indkomstAarId: string) => { jobs: number; fradrag: number; investeringer: number };
  onGem: (aar: IndkomstAar) => Promise<unknown>;
  onSlet: (id: string) => Promise<unknown>;
  onVaelg: (id: string) => void;
  onIndlaesEksempel: () => void;
}

const tomtAar = (aar: number): IndkomstAar => ({
  id: `aar-${aar}-${Date.now()}`,
  aar,
  hjemmeadresse: '',
  kommune: '',
  kommuneSkatteprocent: 0,
  kirkeskatteprocent: 0,
  forventetAIndkomst: 0,
  forventetPensionSUDagpenge: 0,
  forventedeFradragAIndkomst: 0,
  medlemFolkekirken: false,
  enligForsoerger: false,
  laast: false,
});

export function IndkomstAarModule({
  indkomstAarListe,
  aktivtAarId,
  antalPoster,
  onGem,
  onSlet,
  onVaelg,
  onIndlaesEksempel,
}: Props) {
  const [redigerer, setRedigerer] = useState<IndkomstAar | null>(null);
  const [sletter, setSletter] = useState<IndkomstAar | null>(null);
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  // Beløbsfelter holdes som tekst, så de kan tømmes.
  const [aIndkomst, setAIndkomst] = useState('');
  const [pension, setPension] = useState('');
  const [aFradrag, setAFradrag] = useState('');
  const [kommuneskat, setKommuneskat] = useState('');
  const [kirkeskat, setKirkeskat] = useState('');

  const brugteAar = new Set(indkomstAarListe.map((a) => a.aar));
  const ledigeAar = TILGAENGELIGE_AAR.filter((a) => !brugteAar.has(a));

  const aabn = (aar: IndkomstAar) => {
    setFejl(null);
    setRedigerer(aar);
    setAIndkomst(aar.forventetAIndkomst ? String(aar.forventetAIndkomst) : '');
    setPension(aar.forventetPensionSUDagpenge ? String(aar.forventetPensionSUDagpenge) : '');
    setAFradrag(aar.forventedeFradragAIndkomst ? String(aar.forventedeFradragAIndkomst) : '');
    setKommuneskat(aar.kommuneSkatteprocent ? String(aar.kommuneSkatteprocent) : '');
    setKirkeskat(aar.kirkeskatteprocent ? String(aar.kirkeskatteprocent) : '');
  };

  const vaelgKommune = (navn: string) => {
    if (!redigerer) return;
    const satser = getKommuneSatser(navn, redigerer.aar);
    setRedigerer({ ...redigerer, kommune: navn });
    if (satser.kommuneskat !== null) setKommuneskat(String(satser.kommuneskat));
    if (satser.kirkeskat !== null) setKirkeskat(String(satser.kirkeskat));
  };

  const gem = async () => {
    if (!redigerer) return;
    setFejl(null);

    const procent = talFraFelt(kommuneskat);
    if (procent <= 0 || procent > 40) {
      setFejl('Kommuneskatteprocenten skal være et tal mellem 0 og 40. Den står på forskudsopgørelsen.');
      return;
    }

    setGemmer(true);
    try {
      await onGem({
        ...redigerer,
        kommuneSkatteprocent: procent,
        kirkeskatteprocent: talFraFelt(kirkeskat),
        forventetAIndkomst: talFraFelt(aIndkomst),
        forventetPensionSUDagpenge: talFraFelt(pension),
        forventedeFradragAIndkomst: talFraFelt(aFradrag),
      });
      setRedigerer(null);
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Året kunne ikke gemmes.');
    } finally {
      setGemmer(false);
    }
  };

  const bekraeftSlet = async () => {
    if (!sletter) return;
    await onSlet(sletter.id);
    setSletter(null);
  };

  const satserForValgtKommune =
    redigerer && redigerer.kommune
      ? getKommuneSatser(redigerer.kommune, redigerer.aar)
      : null;

  return (
    <Sektion
      titel="Indkomstår"
      beskrivelse="Året styrer, hvilke satser der regnes med, og hvilken kommuneskat der bruges. Alt andet i appen hænger på et indkomstår."
      handling={
        ledigeAar.length > 0 ? (
          <Knap art="primaer" onClick={() => aabn(tomtAar(ledigeAar[ledigeAar.length - 1]))}>
            Nyt indkomstår
          </Knap>
        ) : null
      }
    >
      {indkomstAarListe.length === 0 ? (
        <TomTilstand
          besked="Der er ikke oprettet noget indkomstår endnu. Opret det år, du vil registrere honorarer for, så følger resten efter."
          handling={
            <>
              <Knap art="primaer" onClick={() => aabn(tomtAar(ledigeAar[ledigeAar.length - 1] ?? TILGAENGELIGE_AAR[0]))}>
                Opret indkomstår
              </Knap>
              <Knap art="tekst" onClick={onIndlaesEksempel}>
                Indlæs eksempeldata i stedet
              </Knap>
            </>
          }
        />
      ) : (
        <Tabel minBredde={720}>
          <thead>
            <tr>
              <Th bredde="6rem">År</Th>
              <Th>Kommune</Th>
              <Th hoejre>Kommuneskat</Th>
              <Th hoejre>Kirkeskat</Th>
              <Th hoejre>Poster</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {indkomstAarListe.map((aar) => {
              const antal = antalPoster(aar.id);
              const aktiv = aar.id === aktivtAarId;
              return (
                <tr key={aar.id} className={aktiv ? 'bg-sunk' : undefined}>
                  <Td tal>
                    <span className={aktiv ? 'font-semibold text-ink' : ''}>{aar.aar}</span>
                    {aar.laast && (
                      <span className="ml-2 text-2xs font-sans text-ink-faint">låst</span>
                    )}
                  </Td>
                  <Td>
                    {aar.kommune || <span className="text-ink-faint">ikke valgt</span>}
                    {aar.hjemmeadresse && (
                      <span className="block text-2xs text-ink-faint">{aar.hjemmeadresse}</span>
                    )}
                  </Td>
                  <Td hoejre tal>
                    {aar.kommuneSkatteprocent
                      ? `${aar.kommuneSkatteprocent.toString().replace('.', ',')} %`
                      : '–'}
                  </Td>
                  <Td hoejre tal>
                    {aar.medlemFolkekirken
                      ? `${aar.kirkeskatteprocent.toString().replace('.', ',')} %`
                      : '–'}
                  </Td>
                  <Td hoejre tal>
                    {antal.jobs + antal.fradrag + antal.investeringer}
                  </Td>
                  <Td hoejre>
                    <div className="ikke-print flex justify-end gap-1">
                      {!aktiv && (
                        <Knap art="tekst" onClick={() => onVaelg(aar.id)}>
                          Vis
                        </Knap>
                      )}
                      <Knap art="tekst" onClick={() => aabn(aar)}>
                        Rediger
                      </Knap>
                      <Knap
                        art="tekst"
                        onClick={() => onGem({ ...aar, laast: !aar.laast })}
                      >
                        {aar.laast ? 'Lås op' : 'Lås'}
                      </Knap>
                      <Knap art="tekst" onClick={() => setSletter(aar)}>
                        Slet
                      </Knap>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Tabel>
      )}

      <Modal
        aaben={Boolean(redigerer)}
        onLuk={() => setRedigerer(null)}
        titel={
          indkomstAarListe.some((a) => a.id === redigerer?.id)
            ? `Rediger indkomståret ${redigerer?.aar}`
            : 'Nyt indkomstår'
        }
        beskrivelse="A-indkomsten bruges ikke til at beregne din lønskat. Den fortæller kun, hvor B-indkomsten lægger sig oven på, så personfradrag og progression fordeler sig rigtigt."
        bund={
          <>
            <Knap onClick={() => setRedigerer(null)}>Annullér</Knap>
            <Knap art="primaer" onClick={gem} disabled={gemmer}>
              {gemmer ? 'Gemmer' : 'Gem indkomstår'}
            </Knap>
          </>
        }
      >
        {redigerer && (
          <div className="space-y-5">
            {fejl && <Advarsel titel="Året blev ikke gemt">{fejl}</Advarsel>}

            <div className="grid gap-4 sm:grid-cols-2">
              <Felt label="Indkomstår" paakraevet>
                {(id) => (
                  <Vaelger
                    id={id}
                    value={redigerer.aar}
                    onChange={(e) =>
                      setRedigerer({ ...redigerer, aar: Number(e.target.value) })
                    }
                  >
                    {TILGAENGELIGE_AAR.map((a) => (
                      <option key={a} value={a} disabled={brugteAar.has(a) && a !== redigerer.aar}>
                        {a}
                        {brugteAar.has(a) && a !== redigerer.aar ? ' (findes allerede)' : ''}
                      </option>
                    ))}
                  </Vaelger>
                )}
              </Felt>

              <Felt
                label="Bopælskommune"
                paakraevet
                hjaelp="Kommunen bestemmer kommuneskatten og kirkeskatten."
              >
                {(id) => (
                  <Vaelger
                    id={id}
                    value={redigerer.kommune}
                    onChange={(e) => vaelgKommune(e.target.value)}
                  >
                    <option value="">Vælg kommune</option>
                    {KOMMUNENAVNE.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Vaelger>
                )}
              </Felt>
            </div>

            {redigerer.kommune && satserForValgtKommune?.kommuneskat === null && (
              <Advarsel art="neutral" titel="Satsen for din kommune er ikke bekræftet">
                Appen har ikke en bekræftet kommuneskatteprocent for {redigerer.kommune} i{' '}
                {redigerer.aar}, og et gæt ville være umuligt at opdage senere. Indtast den
                fra din forskudsopgørelse, hvor din egen sats står. Landsgennemsnittet ligger
                omkring {GENNEMSNIT[redigerer.aar]?.kommuneskat.toString().replace('.', ',')} %.
              </Advarsel>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Felt label="Kommuneskat i procent" paakraevet>
                {(id) => (
                  <BeloebFelt id={id} vaerdi={kommuneskat} onVaerdi={setKommuneskat} suffiks="%" />
                )}
              </Felt>
              <Felt
                label="Kirkeskat i procent"
                hjaelp="Bruges kun, hvis du er medlem af folkekirken."
              >
                {(id) => (
                  <BeloebFelt
                    id={id}
                    vaerdi={kirkeskat}
                    onVaerdi={setKirkeskat}
                    suffiks="%"
                    disabled={!redigerer.medlemFolkekirken}
                  />
                )}
              </Felt>
            </div>

            <Felt
              label="Hjemmeadresse"
              hjaelp="Bruges som udgangspunkt, når du regner kørsel ud."
            >
              {(id) => (
                <Tekstfelt
                  id={id}
                  value={redigerer.hjemmeadresse}
                  placeholder="Vejnavn og nummer, postnummer og by"
                  onChange={(e) =>
                    setRedigerer({ ...redigerer, hjemmeadresse: e.target.value })
                  }
                />
              )}
            </Felt>

            <div className="grid gap-4 sm:grid-cols-3">
              <Felt
                label="Forventet A-indkomst"
                hjaelp="Brutto for hele året, før AM-bidrag."
              >
                {(id) => <BeloebFelt id={id} vaerdi={aIndkomst} onVaerdi={setAIndkomst} />}
              </Felt>
              <Felt label="Pension, SU og dagpenge" hjaelp="Brutto for hele året.">
                {(id) => <BeloebFelt id={id} vaerdi={pension} onVaerdi={setPension} />}
              </Felt>
              <Felt
                label="Fradrag i A-indkomsten"
                hjaelp="Ikke fradrag for B-indkomst. Er man i tvivl, er 0 det forsigtige valg."
              >
                {(id) => <BeloebFelt id={id} vaerdi={aFradrag} onVaerdi={setAFradrag} />}
              </Felt>
            </div>

            <div className="space-y-3 border-t border-rule pt-4">
              <Afkrydsning
                label="Medlem af folkekirken"
                checked={redigerer.medlemFolkekirken}
                onChange={(e) =>
                  setRedigerer({ ...redigerer, medlemFolkekirken: e.target.checked })
                }
              />
              <Afkrydsning
                label="Enlig forsørger"
                checked={redigerer.enligForsoerger}
                onChange={(e) =>
                  setRedigerer({ ...redigerer, enligForsoerger: e.target.checked })
                }
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        aaben={Boolean(sletter)}
        onLuk={() => setSletter(null)}
        titel={`Slet indkomståret ${sletter?.aar}?`}
        bredde="max-w-lg"
        bund={
          <>
            <Knap onClick={() => setSletter(null)}>Behold året</Knap>
            <Knap art="fare" onClick={bekraeftSlet}>
              Slet året og alle poster
            </Knap>
          </>
        }
      >
        {sletter && (
          <Advarsel titel="Det kan ikke fortrydes">
            {(() => {
              const a = antalPoster(sletter.id);
              const dele = [
                a.jobs && `${a.jobs} ${a.jobs === 1 ? 'job' : 'jobs'}`,
                a.fradrag && `${a.fradrag} ${a.fradrag === 1 ? 'fradrag' : 'fradrag'}`,
                a.investeringer &&
                  `${a.investeringer} ${a.investeringer === 1 ? 'investering' : 'investeringer'}`,
              ].filter(Boolean) as string[];

              return dele.length === 0
                ? 'Året er tomt, så der forsvinder ingen posteringer med det.'
                : `Sammen med året sletter du ${dele.join(', ')}. Bilagene bliver liggende i arkivet, men de mister deres tilknytning.`;
            })()}
          </Advarsel>
        )}
      </Modal>
    </Sektion>
  );
}
