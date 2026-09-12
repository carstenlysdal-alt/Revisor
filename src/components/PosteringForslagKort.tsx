import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Fradrag,
  IndkomstAar,
  Investering,
  Job,
  PosteringForslag,
  TransportMiddel,
} from '../types';
import { SIKKERHEDSTAERSKEL } from '../types';
import { kr } from '../lib/format';
import {
  byggFradragFraKladde,
  byggInvesteringFraKladde,
  byggJobFraKladde,
  findIndkomstAarTilKladde,
  kanGemmeKladde,
  kladdeFraUdtraek,
  kladdeTal,
  usikkertFelt,
  type KladdeFlag,
  type KladdeTekst,
} from '../lib/posteringKladde';
import { Afkrydsning, BeloebFelt, Datofelt, Felt, Knap, Tekstfelt, Vaelger } from './ui';

interface Props {
  forslag: PosteringForslag;
  indkomstAarId: string;
  indkomstAarListe: IndkomstAar[];
  onGemJob: (job: Job) => Promise<unknown>;
  onGemFradrag: (fradrag: Fradrag) => Promise<unknown>;
  onGemInvestering: (inv: Investering) => Promise<unknown>;
  /** Kaldes efter en vellykket gemning, så den overordnede chat kan rydde op. */
  onGemt: () => void;
  onForkast: () => void;
  /**
   * Øges af chatten, når modellen tolker brugerens seneste besked som en
   * utvetydig bekræftelse af dette kort ("ja", "godkend"). Kortet reagerer
   * ved at gemme det, der faktisk står i felterne lige nu — ikke nødvendigvis
   * det oprindelige AI-forslag, hvis brugeren selv har rettet noget.
   */
  bekraeftSignal: number;
}

const RUBRIK_LABEL: Record<PosteringForslag['klassifikation'], string> = {
  JOB: 'Honorarjob',
  FRADRAG: 'Fradrag, rubrik 29',
  INVESTERING: 'Investering, arkiv',
};

const sik = (
  gruppe: Record<string, { sikkerhed?: number }> | undefined,
  navn: string
): number | undefined => gruppe?.[navn]?.sikkerhed;

function UsikkerMærke({ sikkerhed }: { sikkerhed: number | undefined }) {
  if (!usikkertFelt(sikkerhed, SIKKERHEDSTAERSKEL)) return null;
  return <span className="ml-1.5 text-2xs font-normal text-negative">usikker, kontrollér</span>;
}

/**
 * Kladdekortet, chatten viser inline, når den foreslår en postering.
 *
 * Genbruger nøjagtig den samme byggelogik som bilagsscanneren
 * (src/lib/posteringKladde.ts), så en rettelse i den logik gælder begge
 * steder. Kortet er selv autoritativt for hvad der bliver gemt — hverken en
 * tekstbekræftelse eller et klik gemmer noget, der ikke står i kortets egne
 * felter i det øjeblik der klikkes.
 */
export function PosteringForslagKort({
  forslag,
  indkomstAarId,
  indkomstAarListe,
  onGemJob,
  onGemFradrag,
  onGemInvestering,
  onGemt,
  onForkast,
  bekraeftSignal,
}: Props) {
  const forberedt = useMemo(
    () =>
      kladdeFraUdtraek({
        job: forslag.job as never,
        fradrag: forslag.fradrag as never,
        investering: forslag.investering as never,
      }),
    [forslag]
  );

  const [tekst, setTekst] = useState<KladdeTekst>(forberedt.tekst);
  const [flag, setFlag] = useState<KladdeFlag>(forberedt.flag);
  const [valgtIndkomstAarId, setValgtIndkomstAarId] = useState(() =>
    findIndkomstAarTilKladde(
      forslag.klassifikation,
      forberedt.tekst,
      indkomstAarListe,
      indkomstAarId
    )
  );
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  const kanGemme = kanGemmeKladde(forslag.klassifikation, tekst);

  // Første render tæller ikke som en bekræftelse — kun en ændring i signalet,
  // efter kortet allerede er vist, betyder at chatten har set en bekræftelse.
  const forrigeSignal = useRef(bekraeftSignal);
  useEffect(() => {
    if (bekraeftSignal !== forrigeSignal.current) {
      forrigeSignal.current = bekraeftSignal;
      if (kanGemme) void godkend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bekraeftSignal]);

  const godkend = async () => {
    setGemmer(true);
    setFejl(null);
    try {
      if (forslag.klassifikation === 'JOB') {
        const nyt = byggJobFraKladde(tekst, flag, valgtIndkomstAarId, []);
        await onGemJob({ id: `job-${Date.now()}`, ...nyt });
      } else if (forslag.klassifikation === 'FRADRAG') {
        const nyt = byggFradragFraKladde(tekst, valgtIndkomstAarId, []);
        await onGemFradrag({ id: `fradrag-${Date.now()}`, ...nyt });
      } else {
        const nyt = byggInvesteringFraKladde(tekst, valgtIndkomstAarId, []);
        await onGemInvestering({ id: `inv-${Date.now()}`, ...nyt });
      }
      onGemt();
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Posten kunne ikke gemmes.');
    } finally {
      setGemmer(false);
    }
  };

  return (
    <div className="mt-2 max-w-[68ch] border border-rule-strong bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
          {RUBRIK_LABEL[forslag.klassifikation]}
        </span>
        <button
          type="button"
          onClick={onForkast}
          className="text-2xs text-ink-faint underline underline-offset-4 hover:text-ink"
        >
          Forkast
        </button>
      </div>

      <Felt
        label="Indkomstår"
        hjaelp="Valgt automatisk ud fra datoen; kontrollér før du gemmer."
        paakraevet
      >
        {(id) => (
          <Vaelger
            id={id}
            value={valgtIndkomstAarId}
            onChange={(e) => setValgtIndkomstAarId(e.target.value)}
          >
            {[...indkomstAarListe]
              .sort((a, b) => b.aar - a.aar)
              .map((aar) => (
                <option key={aar.id} value={aar.id}>{aar.aar}</option>
              ))}
          </Vaelger>
        )}
      </Felt>

      {forslag.klassifikation === 'JOB' && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Felt label="Hvervgiver" paakraevet>
              {(id) => (
                <>
                  <Tekstfelt
                    id={id}
                    value={tekst.hvervgiver ?? ''}
                    onChange={(e) => setTekst({ ...tekst, hvervgiver: e.target.value })}
                  />
                  <UsikkerMærke sikkerhed={sik(forslag.job as never, 'hvervgiver')} />
                </>
              )}
            </Felt>
            <Felt label="Honorar" paakraevet>
              {(id) => (
                <>
                  <BeloebFelt
                    id={id}
                    vaerdi={tekst.honorar ?? ''}
                    onVaerdi={(v) => setTekst({ ...tekst, honorar: v })}
                  />
                  <UsikkerMærke sikkerhed={sik(forslag.job as never, 'honorar')} />
                </>
              )}
            </Felt>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Felt label="Startdato" paakraevet>
              {(id) => (
                <Datofelt
                  id={id}
                  value={tekst.startDato ?? ''}
                  onChange={(e) => setTekst({ ...tekst, startDato: e.target.value })}
                />
              )}
            </Felt>
            <Felt label="Betalingsdato">
              {(id) => (
                <Datofelt
                  id={id}
                  value={tekst.betalingsDato ?? ''}
                  onChange={(e) => setTekst({ ...tekst, betalingsDato: e.target.value })}
                />
              )}
            </Felt>
            <Felt label="Transportmiddel">
              {(id) => (
                <Vaelger
                  id={id}
                  value={tekst.transportmiddel || 'NONE'}
                  onChange={(e) =>
                    setTekst({ ...tekst, transportmiddel: e.target.value as TransportMiddel })
                  }
                >
                  <option value="NONE">Ingen kørsel</option>
                  <option value="OWN_CAR_MC">Egen bil, rubrik 29</option>
                  <option value="OWN_BIKE">Egen cykel, rubrik 29</option>
                  <option value="PASSENGER">Passager, rubrik 51</option>
                </Vaelger>
              )}
            </Felt>
          </div>
          {tekst.transportmiddel && tekst.transportmiddel !== 'NONE' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Felt label="Kilometer pr. tur">
                {(id) => (
                  <BeloebFelt
                    id={id}
                    vaerdi={tekst.antalKm ?? ''}
                    onVaerdi={(v) => setTekst({ ...tekst, antalKm: v })}
                    suffiks="km"
                  />
                )}
              </Felt>
              <Felt label="Antal ture">
                {(id) => (
                  <BeloebFelt
                    id={id}
                    vaerdi={tekst.antalTure ?? '1'}
                    onVaerdi={(v) => setTekst({ ...tekst, antalTure: v })}
                    suffiks=""
                  />
                )}
              </Felt>
            </div>
          )}
          <Afkrydsning
            label="Fritaget for AM-bidrag"
            checked={Boolean(flag.amBidragFritaget)}
            onChange={(e) => setFlag({ ...flag, amBidragFritaget: e.target.checked })}
          />
        </div>
      )}

      {forslag.klassifikation === 'FRADRAG' && (
        <div className="space-y-3">
          <Felt label="Omkostning" paakraevet>
            {(id) => (
              <>
                <Tekstfelt
                  id={id}
                  value={tekst.beskrivelse ?? ''}
                  onChange={(e) => setTekst({ ...tekst, beskrivelse: e.target.value })}
                />
                <UsikkerMærke sikkerhed={sik(forslag.fradrag as never, 'beskrivelse')} />
              </>
            )}
          </Felt>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Felt label="Fakturadato" paakraevet>
              {(id) => (
                <Datofelt
                  id={id}
                  value={tekst.fakturaDato ?? ''}
                  onChange={(e) => setTekst({ ...tekst, fakturaDato: e.target.value })}
                />
              )}
            </Felt>
            <Felt label="Beløb" paakraevet>
              {(id) => (
                <BeloebFelt
                  id={id}
                  vaerdi={tekst.fakturaBeloeb ?? ''}
                  onVaerdi={(v) => setTekst({ ...tekst, fakturaBeloeb: v })}
                />
              )}
            </Felt>
            <div className="flex flex-col justify-end pb-1">
              <span className="text-2xs text-ink-muted">Fradrag</span>
              <span className="tal text-sm font-semibold text-ink">
                {kr(
                  (kladdeTal(tekst, 'fakturaBeloeb') *
                    (tekst.fradragsProcent === '' ? 100 : kladdeTal(tekst, 'fradragsProcent'))) /
                    100
                )}{' '}
                kr.
              </span>
            </div>
          </div>
        </div>
      )}

      {forslag.klassifikation === 'INVESTERING' && (
        <div className="space-y-3">
          <Felt label="Investering" paakraevet>
            {(id) => (
              <Tekstfelt
                id={id}
                value={tekst.titel ?? ''}
                onChange={(e) => setTekst({ ...tekst, titel: e.target.value })}
              />
            )}
          </Felt>
          <div className="grid gap-3 sm:grid-cols-2">
            <Felt label="Fakturadato" paakraevet>
              {(id) => (
                <Datofelt
                  id={id}
                  value={tekst.fakturaDato ?? ''}
                  onChange={(e) => setTekst({ ...tekst, fakturaDato: e.target.value })}
                />
              )}
            </Felt>
            <Felt label="Beløb" paakraevet>
              {(id) => (
                <BeloebFelt
                  id={id}
                  vaerdi={tekst.beloeb ?? ''}
                  onVaerdi={(v) => setTekst({ ...tekst, beloeb: v })}
                />
              )}
            </Felt>
          </div>
        </div>
      )}

      {fejl && <p className="mt-3 text-2xs text-negative">{fejl}</p>}

      <div className="mt-4 flex justify-end gap-2 border-t border-rule pt-3">
        <Knap art="primaer" onClick={godkend} disabled={gemmer || !kanGemme}>
          {gemmer ? 'Gemmer' : 'Godkend og opret'}
        </Knap>
      </div>
    </div>
  );
}
