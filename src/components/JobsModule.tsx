import React, { useMemo, useState } from 'react';
import type { Bilag, IndkomstAar, Job, TransportMiddel } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { betalingKrydserAarsskifte } from '../lib/tax/beregn';
import { beregnKoerselForJob } from '../lib/tax/koersel';
import { dato, idag, kr, talFraFelt, timer } from '../lib/format';
import { api } from '../lib/api';
import { createGoogleCalendarUrl, hentIcsFil } from '../utils/calendarExport';
import {
  Advarsel,
  Afkrydsning,
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
  Vaelger,
} from './ui';

interface Props {
  jobs: Job[];
  bilag: Bilag[];
  indkomstAar: IndkomstAar;
  beregning: SkatteBeregning;
  onGem: (job: Job) => Promise<unknown>;
  onSlet: (id: string) => Promise<unknown>;
  onAabnScanner: () => void;
}

const TRANSPORT: { vaerdi: TransportMiddel; navn: string; hjaelp: string }[] = [
  {
    vaerdi: 'NONE',
    navn: 'Ingen kørsel i eget transportmiddel',
    hjaelp:
      'Har du haft dokumenterede udgifter til bus, tog, færge eller fly, hører de under Fradrag i stedet.',
  },
  {
    vaerdi: 'OWN_CAR_MC',
    navn: 'Egen bil eller motorcykel',
    hjaelp:
      'Fradraget lander i rubrik 29 og ikke i rubrik 51. Skatteværdien er højere i rubrik 29, og det er den rigtige placering for erhvervsmæssig kørsel.',
  },
  {
    vaerdi: 'OWN_BIKE',
    navn: 'Egen cykel, knallert eller EU-knallert',
    hjaelp: 'Samme placering som bil, altså rubrik 29, men med en lavere sats.',
  },
  {
    vaerdi: 'PASSENGER',
    navn: 'Passager i bil eller på motorcykel',
    hjaelp:
      'Du har ikke selv kørt og har ingen dokumenteret udgift. Det giver et lavere fradrag, og det er den eneste mulighed, der lander i rubrik 51.',
  },
];

const nytJob = (indkomstAarId: string, aar: number): Job => ({
  id: `job-${Date.now()}`,
  indkomstAarId,
  hvervgiver: '',
  honorar: 0,
  startDato: `${aar}-01-01`,
  slutDato: `${aar}-01-01`,
  betalingsDato: '',
  transportmiddel: 'NONE',
  antalKm: 0,
  antalTure: 1,
  destinationAdresse: '',
  amBidragFritaget: false,
  erRubrik17: false,
  type: '',
  bilagIds: [],
  noter: '',
});

export function JobsModule({
  jobs,
  bilag,
  indkomstAar,
  beregning,
  onGem,
  onSlet,
  onAabnScanner,
}: Props) {
  const [redigerer, setRedigerer] = useState<Job | null>(null);
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [sletter, setSletter] = useState<Job | null>(null);

  const [honorar, setHonorar] = useState('');
  const [km, setKm] = useState('');
  const [ture, setTure] = useState('1');
  const [timerJob, setTimerJob] = useState('');
  const [timerTransport, setTimerTransport] = useState('');
  const [visMere, setVisMere] = useState(false);

  const bilagIndeks = useMemo(
    () => new Map(bilag.map((b) => [b.id, b])),
    [bilag]
  );
  const koerselPrJob = useMemo(
    () => new Map(beregning.koersel.linjer.map((l) => [l.jobId, l])),
    [beregning]
  );

  const aabn = (job: Job, kopi = false) => {
    setFejl(null);
    const post = kopi
      ? { ...job, id: `job-${Date.now()}`, bilagIds: [], betalingsDato: '' }
      : job;
    setRedigerer(post);
    setHonorar(post.honorar ? String(post.honorar) : '');
    setKm(post.antalKm ? String(post.antalKm) : '');
    setTure(String(post.antalTure || 1));
    setTimerJob(post.timerJob ? String(post.timerJob) : '');
    setTimerTransport(post.timerTransportForberedelse ? String(post.timerTransportForberedelse) : '');
    setVisMere(Boolean(post.type || post.timerJob || post.amBidragFritaget || post.erRubrik17));
  };

  const kladdensKoersel = useMemo(() => {
    if (!redigerer) return 0;
    try {
      return beregnKoerselForJob(
        {
          id: redigerer.id,
          transportmiddel: redigerer.transportmiddel,
          antalKm: talFraFelt(km),
          antalTure: talFraFelt(ture),
          startDato: redigerer.startDato,
        },
        beregning.satser
      );
    } catch {
      return 0;
    }
  }, [redigerer, km, ture, beregning.satser]);

  const gem = async () => {
    if (!redigerer) return;
    setFejl(null);

    if (!redigerer.hvervgiver.trim()) {
      setFejl('Skriv hvem der har hyret dig. Uden hvervgiver kan posten ikke dokumenteres.');
      return;
    }
    if (redigerer.slutDato < redigerer.startDato) {
      setFejl('Slutdatoen ligger før startdatoen.');
      return;
    }
    if (Number(redigerer.startDato.slice(0, 4)) !== indkomstAar.aar) {
      setFejl(
        `Startdatoen ligger i ${redigerer.startDato.slice(0, 4)}, men du står i indkomståret ${indkomstAar.aar}. Et job hører til det år, arbejdet er udført i.`
      );
      return;
    }

    setGemmer(true);
    try {
      await onGem({
        ...redigerer,
        honorar: talFraFelt(honorar),
        antalKm: talFraFelt(km),
        antalTure: Math.max(0, Math.round(talFraFelt(ture))),
        timerJob: talFraFelt(timerJob) || undefined,
        timerTransportForberedelse: talFraFelt(timerTransport) || undefined,
      });
      setRedigerer(null);
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Jobbet kunne ikke gemmes.');
    } finally {
      setGemmer(false);
    }
  };

  const valgtTransport = TRANSPORT.find((t) => t.vaerdi === redigerer?.transportmiddel);
  const laast = indkomstAar.laast;

  return (
    <Sektion
      titel="Jobs og kørsel"
      beskrivelse={`Honorarer havner i rubrik 12 på årsopgørelsen. Kørsel i egen bil eller på egen cykel havner i rubrik 29, kørsel som passager i rubrik 51. Satserne for ${beregning.satser.aar} bruges automatisk.`}
      handling={
        laast ? null : (
          <>
            <Knap onClick={onAabnScanner} className="hidden lg:inline-flex">
              Læs et bilag
            </Knap>
            <Knap art="primaer" onClick={() => aabn(nytJob(indkomstAar.id, indkomstAar.aar))}>
              Nyt job
            </Knap>
          </>
        )
      }
    >
      {jobs.length === 0 ? (
        <TomTilstand
          besked="Der er ingen jobs i året endnu. Opret det første, eller læg en honorarkontrakt ind og lad den blive læst."
          handling={
            laast ? undefined : (
              <>
                <Knap art="primaer" onClick={() => aabn(nytJob(indkomstAar.id, indkomstAar.aar))}>
                  Nyt job
                </Knap>
                <Knap onClick={onAabnScanner} className="hidden lg:inline-flex">
              Læs et bilag
            </Knap>
              </>
            )
          }
        />
      ) : (
        <Responsiv
          tabel={
            <Tabel minBredde={860}>
          <thead>
            <tr>
              <Th bredde="2.5rem" />
              <Th>Hvervgiver</Th>
              <Th bredde="7rem">Dato</Th>
              <Th bredde="7rem">Betaling</Th>
              <Th hoejre bredde="8rem">Honorar</Th>
              <Th hoejre bredde="9rem">Kørsel</Th>
              <Th bredde="13rem" />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const linje = koerselPrJob.get(job.id);
              const krydser = betalingKrydserAarsskifte(job);
              return (
                <tr key={job.id}>
                  <Td>
                    <Rubrik nr={job.erRubrik17 ? 17 : 12} aktiv />
                  </Td>
                  <Td>
                    <span className="font-medium text-ink">{job.hvervgiver}</span>
                    <span className="block text-2xs text-ink-faint">
                      {[
                        job.type,
                        job.amBidragFritaget ? 'Fritaget for AM-bidrag' : null,
                        job.timerJob ? timer(job.timerJob) : null,
                        job.erEksempel ? 'eksempel' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {job.bilagIds.length > 0 && (
                      <span className="mt-0.5 block text-2xs">
                        {job.bilagIds.map((id) => {
                          const b = bilagIndeks.get(id);
                          return b ? (
                            <a
                              key={id}
                              href={api.bilagUrl(id)}
                              target="_blank"
                              rel="noreferrer"
                              className="mr-2 text-ink-muted underline underline-offset-2 hover:text-ink"
                            >
                              {b.filnavn}
                            </a>
                          ) : null;
                        })}
                      </span>
                    )}
                  </Td>
                  <Td tal>{dato(job.startDato)}</Td>
                  <Td tal>
                    {dato(job.betalingsDato) || <span className="text-ink-faint">–</span>}
                    {krydser && (
                      <span className="block font-sans text-2xs text-ink-faint">
                        udbetales i {job.betalingsDato.slice(0, 4)}
                      </span>
                    )}
                  </Td>
                  <Td hoejre tal>
                    {kr(job.honorar)}
                  </Td>
                  <Td hoejre tal>
                    {linje && linje.fradrag > 0 ? (
                      <>
                        {kr(linje.fradrag)}
                        <span className="block font-sans text-2xs text-ink-faint">
                          {linje.kmIAlt.toLocaleString('da-DK')} km
                          {linje.kmOverAarsgraense > 0 &&
                            `, heraf ${linje.kmOverAarsgraense.toLocaleString('da-DK')} over 20.000`}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-faint">–</span>
                    )}
                  </Td>
                  <Td hoejre>
                    <div className="ikke-print flex justify-end gap-1">
                      <Knap
                        art="tekst"
                        onClick={() => hentIcsFil(job, beregning.marginalskatProcent)}
                        title="Hent en kalenderfil, der kan åbnes i Google, Apple og Outlook"
                      >
                        Kalender
                      </Knap>
                      {!laast && (
                        <>
                          <Knap art="tekst" onClick={() => aabn(job, true)}>
                            Kopiér
                          </Knap>
                          <Knap art="tekst" onClick={() => aabn(job)}>
                            Rediger
                          </Knap>
                          <Knap art="tekst" onClick={() => setSletter(job)}>
                            Slet
                          </Knap>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
            <Sumraekke
              celler={[
                { indhold: `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`, span: 4 },
                { indhold: kr(beregning.honorarerRubrik12 + beregning.rubrik17Indkomst), hoejre: true, tal: true },
                {
                  indhold: kr(
                    beregning.koerselsFradragRubrik29 + beregning.befordringsFradragRubrik51
                  ),
                  hoejre: true,
                  tal: true,
                },
                { indhold: '' },
              ]}
            />
          </tbody>
            </Tabel>
          }
          liste={
            <>
              {jobs.map((job) => {
                const linje = koerselPrJob.get(job.id);
                return (
                  <MobilPost
                    key={job.id}
                    rubrik={job.erRubrik17 ? 17 : 12}
                    titel={job.hvervgiver}
                    undertitel={
                      <>
                        {dato(job.startDato)}
                        {job.betalingsDato && ` · betales ${dato(job.betalingsDato)}`}
                        {job.type && ` · ${job.type}`}
                        {job.amBidragFritaget && ' · fritaget for AM-bidrag'}
                      </>
                    }
                    beloeb={`${kr(job.honorar)} kr.`}
                    beloebNote={
                      linje && linje.fradrag > 0
                        ? `+ ${kr(linje.fradrag)} kr. kørsel`
                        : undefined
                    }
                    handlinger={
                      laast ? undefined : (
                        <>
                          <button
                            type="button"
                            onClick={() => aabn(job)}
                            className="text-2xs text-ink-muted underline underline-offset-4"
                          >
                            Rediger
                          </button>
                          <button
                            type="button"
                            onClick={() => setSletter(job)}
                            className="text-2xs text-negative underline underline-offset-4"
                          >
                            Slet
                          </button>
                        </>
                      )
                    }
                  />
                );
              })}
              <MobilSum
                tekst={`${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} i alt`}
                beloeb={`${kr(beregning.honorarerRubrik12 + beregning.rubrik17Indkomst)} kr.`}
              />
            </>
          }
        />
      )}

      <Modal
        aaben={Boolean(redigerer)}
        onLuk={() => setRedigerer(null)}
        titel={jobs.some((j) => j.id === redigerer?.id) ? 'Rediger job' : 'Nyt job'}
        bund={
          <>
            <Knap onClick={() => setRedigerer(null)}>Annullér</Knap>
            <Knap art="primaer" onClick={gem} disabled={gemmer}>
              {gemmer ? 'Gemmer' : 'Gem job'}
            </Knap>
          </>
        }
      >
        {redigerer && (
          <div className="space-y-5">
            {fejl && <Advarsel titel="Jobbet blev ikke gemt">{fejl}</Advarsel>}

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Felt label="Hvervgiver" paakraevet>
                {(id) => (
                  <Tekstfelt
                    id={id}
                    value={redigerer.hvervgiver}
                    placeholder="Hvem har hyret dig"
                    onChange={(e) => setRedigerer({ ...redigerer, hvervgiver: e.target.value })}
                  />
                )}
              </Felt>
              <Felt label="Honorar" paakraevet hjaelp="Beløbet før AM-bidrag og skat.">
                {(id) => <BeloebFelt id={id} vaerdi={honorar} onVaerdi={setHonorar} />}
              </Felt>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Felt label="Startdato" paakraevet hjaelp="Afgør hvilket år jobbet hører til.">
                {(id) => (
                  <Datofelt
                    id={id}
                    value={redigerer.startDato}
                    onChange={(e) => {
                      const startDato = e.target.value;
                      setRedigerer({
                        ...redigerer,
                        startDato,
                        slutDato:
                          redigerer.slutDato < startDato ? startDato : redigerer.slutDato,
                      });
                    }}
                  />
                )}
              </Felt>
              <Felt label="Slutdato" paakraevet>
                {(id) => (
                  <Datofelt
                    id={id}
                    value={redigerer.slutDato}
                    onChange={(e) => setRedigerer({ ...redigerer, slutDato: e.target.value })}
                  />
                )}
              </Felt>
              <Felt label="Betalingsdato" hjaelp="Hvornår pengene faktisk kommer ind.">
                {(id) => (
                  <Datofelt
                    id={id}
                    value={redigerer.betalingsDato}
                    onChange={(e) =>
                      setRedigerer({ ...redigerer, betalingsDato: e.target.value })
                    }
                  />
                )}
              </Felt>
            </div>

            {betalingKrydserAarsskifte(redigerer) && (
              <Advarsel art="neutral" titel="Betalingen falder i et andet år">
                Jobbet bliver liggende i {redigerer.startDato.slice(0, 4)}, fordi arbejdet er
                udført der. Det er året for arbejdet, ikke året for udbetalingen, der afgør
                hvor honoraret skal stå.
              </Advarsel>
            )}

            <div className="border-t border-rule pt-4">
              <Felt label="Transportmiddel" paakraevet hjaelp={valgtTransport?.hjaelp}>
                {(id) => (
                  <Vaelger
                    id={id}
                    value={redigerer.transportmiddel}
                    onChange={(e) =>
                      setRedigerer({
                        ...redigerer,
                        transportmiddel: e.target.value as TransportMiddel,
                      })
                    }
                  >
                    {TRANSPORT.map((t) => (
                      <option key={t.vaerdi} value={t.vaerdi}>
                        {t.navn}
                      </option>
                    ))}
                  </Vaelger>
                )}
              </Felt>

              {redigerer.transportmiddel !== 'NONE' && (
                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                  <Felt label="Kilometer pr. tur" hjaelp="Hele strækningen, som den køres.">
                    {(id) => <BeloebFelt id={id} vaerdi={km} onVaerdi={setKm} suffiks="km" />}
                  </Felt>
                  <Felt label="Antal ture">
                    {(id) => <BeloebFelt id={id} vaerdi={ture} onVaerdi={setTure} suffiks="" />}
                  </Felt>
                  <div className="flex flex-col justify-end pb-1">
                    <span className="text-2xs text-ink-muted">
                      Fradrag, rubrik {redigerer.transportmiddel === 'PASSENGER' ? 51 : 29}
                    </span>
                    <span className="tal text-lg font-semibold text-ink">
                      {kr(kladdensKoersel)} kr.
                    </span>
                  </div>
                </div>
              )}

              {redigerer.transportmiddel !== 'NONE' && (
                <div className="mt-4">
                  <Felt label="Adresse for jobbet">
                    {(id) => (
                      <Tekstfelt
                        id={id}
                        value={redigerer.destinationAdresse ?? ''}
                        placeholder="Spillested eller mødested"
                        onChange={(e) =>
                          setRedigerer({ ...redigerer, destinationAdresse: e.target.value })
                        }
                      />
                    )}
                  </Felt>
                </div>
              )}
            </div>

            {jobs.some((j) => j.id === redigerer.id) && (
              <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
                <span className="text-2xs text-ink-muted">Læg jobbet i kalenderen:</span>
                <Knap
                  art="tekst"
                  onClick={() => hentIcsFil(redigerer, beregning.marginalskatProcent)}
                >
                  Hent kalenderfil
                </Knap>
                <a
                  href={createGoogleCalendarUrl(redigerer, beregning.marginalskatProcent)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-ink-muted underline underline-offset-4 hover:text-ink"
                >
                  Åbn i Google Kalender
                </a>
              </div>
            )}

            <div className="border-t border-rule pt-4">
              <Knap art="tekst" onClick={() => setVisMere(!visMere)}>
                {visMere ? 'Skjul de valgfrie felter' : 'Vis flere felter'}
              </Knap>

              {visMere && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Felt label="Timer på selve jobbet">
                      {(id) => (
                        <BeloebFelt id={id} vaerdi={timerJob} onVaerdi={setTimerJob} suffiks="t" />
                      )}
                    </Felt>
                    <Felt label="Timer på forberedelse og transport">
                      {(id) => (
                        <BeloebFelt
                          id={id}
                          vaerdi={timerTransport}
                          onVaerdi={setTimerTransport}
                          suffiks="t"
                        />
                      )}
                    </Felt>
                    <Felt label="Type" hjaelp="Din egen kategori. Bruges i statistikken.">
                      {(id) => (
                        <Tekstfelt
                          id={id}
                          value={redigerer.type ?? ''}
                          placeholder="Musik, foredrag, konsulent"
                          onChange={(e) => setRedigerer({ ...redigerer, type: e.target.value })}
                        />
                      )}
                    </Felt>
                  </div>

                  <Afkrydsning
                    label="Der skal ikke betales AM-bidrag af dette honorar"
                    hjaelp="Gælder blandt andet biblioteksafgift, Copydan, Gramex, legater og kunststøtte."
                    checked={redigerer.amBidragFritaget}
                    onChange={(e) =>
                      setRedigerer({ ...redigerer, amBidragFritaget: e.target.checked })
                    }
                  />
                  <Afkrydsning
                    label="Beløbet hører til i rubrik 17 i stedet for rubrik 12"
                    hjaelp="Gruppelivsforsikring gennem fagforening, uddelinger og visse personalegoder."
                    checked={Boolean(redigerer.erRubrik17)}
                    onChange={(e) =>
                      setRedigerer({ ...redigerer, erRubrik17: e.target.checked })
                    }
                  />

                  <Felt label="Noter">
                    {(id) => (
                      <Notatfelt
                        id={id}
                        vaerdi={redigerer.noter ?? ''}
                        onVaerdi={(v) => setRedigerer({ ...redigerer, noter: v })}
                      />
                    )}
                  </Felt>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        aaben={Boolean(sletter)}
        onLuk={() => setSletter(null)}
        titel="Slet jobbet?"
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
              Slet jobbet
            </Knap>
          </>
        }
      >
        <p className="text-xs text-ink-muted">
          {sletter?.hvervgiver} på {kr(sletter?.honorar ?? 0)} kr. forsvinder fra rubrik{' '}
          {sletter?.erRubrik17 ? 17 : 12} og fra skatteberegningen. Bilag bliver liggende i
          arkivet.
        </p>
      </Modal>
    </Sektion>
  );
}
