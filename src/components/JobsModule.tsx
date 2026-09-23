import { useEffect, useMemo, useRef, useState } from 'react';
import type { Bilag, BrugerProfil, Fradrag, IndkomstAar, Job, TransportMiddel } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { betalingKrydserAarsskifte } from '../lib/tax/beregn';
import { beregnKoerselForJob } from '../lib/tax/koersel';
import { dato, idag, kr, talFraFelt, timer } from '../lib/format';
import { api } from '../lib/api';
import { createGoogleCalendarUrl, hentIcsFil } from '../utils/calendarExport';
import { Sparkles } from 'lucide-react';
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
import { AdresseInput } from './AdresseInput';

interface Props {
  jobs: Job[];
  fradragListe: Fradrag[];
  bilag: Bilag[];
  indkomstAar: IndkomstAar;
  profil?: BrugerProfil;
  beregning: SkatteBeregning;
  onGem: (job: Job) => Promise<unknown>;
  onSlet: (id: string) => Promise<unknown>;
  onAabnScanner: () => void;
  onAabnChat?: (startBesked?: string) => void;
  visning?: 'indtaegter' | 'koersel';
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
      'Fradraget lander i rubrik 29 og ikke i rubrik 51. Skatteværdien er højere i rubrik 29, og det er den rigtige placering for erhvervsmæssig kørsel til et honorarjob. Gælder ikke for bestyrelseshverv, se nedenfor.',
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
      'Du har ikke selv kørt og har ingen dokumenteret udgift. Det giver det almindelige befordringsfradrag i rubrik 51.',
  },
];

const nyKoersel = (indkomstAarId: string, aar: number): Job => {
  const dag = idag();
  const d = dag.startsWith(String(aar)) ? dag : `${aar}-01-01`;
  return {
    id: `koersel-${Date.now()}`,
    indkomstAarId,
    hvervgiver: '',
    tilknyttetJob: '',
    honorar: 0,
    startDato: d,
    slutDato: d,
    betalingsDato: '',
    transportmiddel: 'OWN_CAR_MC',
    antalKm: 0,
    antalTure: 1,
    destinationAdresse: '',
    amBidragFritaget: false,
    erRubrik17: false,
    type: '',
    bilagIds: [],
    noter: '',
  };
};

const nytJob = (indkomstAarId: string, aar: number, standardBooker?: string): Job => {
  const dag = idag();
  const d = dag.startsWith(String(aar)) ? dag : `${aar}-01-01`;
  return {
    id: `job-${Date.now()}`,
    indkomstAarId,
    hvervgiver: '',
    booker: standardBooker?.trim() || '',
    tilknyttetJob: '',
    honorar: 0,
    startDato: d,
    slutDato: d,
    betalingsDato: '',
    betaltSkat: 0,
    transportmiddel: 'NONE',
    antalKm: 0,
    antalTure: 1,
    destinationAdresse: '',
    amBidragFritaget: false,
    erRubrik17: false,
    type: '',
    bilagIds: [],
    noter: '',
  };
};

export function JobsModule({
  jobs,
  fradragListe,
  bilag,
  indkomstAar,
  profil,
  beregning,
  onGem,
  onSlet,
  onAabnScanner,
  onAabnChat,
  visning = 'indtaegter',
}: Props) {
  const bopael = profil?.hjemmeadresse?.trim() || indkomstAar.hjemmeadresse?.trim() || '';
  const [redigerer, setRedigerer] = useState<Job | null>(null);
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [sletter, setSletter] = useState<Job | null>(null);

  const [honorar, setHonorar] = useState('');
  const [betaltSkat, setBetaltSkat] = useState('');
  const [km, setKm] = useState('');
  const [ture, setTure] = useState('1');
  const [timerJob, setTimerJob] = useState('');
  const [timerTransport, setTimerTransport] = useState('');
  const [visMere, setVisMere] = useState(false);
  const [rutestatusKlar, setRutestatusKlar] = useState(false);
  const [beregnerAfstand, setBeregnerAfstand] = useState(false);
  const [afstandFejl, setAfstandFejl] = useState<string | null>(null);
  const [beregnetInfo, setBeregnetInfo] = useState<string | null>(null);
  const [turRetur, setTurRetur] = useState(true);
  const [mellemstationer, setMellemstationer] = useState<string[]>([]);
  const sidsteBeregningRef = useRef<{ enkeltTurKm: number; turReturKm: number } | null>(null);

  useEffect(() => {
    api
      .rutestatus()
      .then((s) => setRutestatusKlar(s.klar))
      .catch(() => setRutestatusKlar(false));
  }, []);

  const beregnAfstand = async (overstyrTurRetur?: boolean) => {
    if (!redigerer) return;
    const aktivTurRetur = overstyrTurRetur !== undefined ? overstyrTurRetur : turRetur;
    setAfstandFejl(null);
    setBeregnetInfo(null);
    setBeregnerAfstand(true);
    try {
      const stops = mellemstationer.map((s) => s.trim()).filter(Boolean);
      const res = await api.beregnAfstand(
        bopael,
        redigerer.destinationAdresse ?? '',
        {
          mellemstationer: stops,
          turRetur: aktivTurRetur,
        }
      );
      setKm(String(res.km));
      sidsteBeregningRef.current = {
        enkeltTurKm: res.enkeltTurKm ?? (aktivTurRetur ? Math.round((res.km / 2) * 10) / 10 : res.km),
        turReturKm: aktivTurRetur ? res.km : Math.round((res.enkeltTurKm ?? res.km) * 2 * 10) / 10,
      };
      if (res.fundetAdresse && res.fundetAdresse !== redigerer.destinationAdresse) {
        setRedigerer({ ...redigerer, destinationAdresse: res.fundetAdresse });
      }
      const stopsTxt =
        stops.length > 0
          ? ` (via ${stops.length} mellemstation${stops.length > 1 ? 'er' : ''})`
          : '';
      const turTxt = aktivTurRetur
        ? `Beregnet: ${res.km} km tur/retur${res.enkeltTurKm ? ` (${res.enkeltTurKm} km hver vej)` : ''}${stopsTxt}`
        : `Beregnet: ${res.km} km enkelt tur${stopsTxt}`;
      setBeregnetInfo(turTxt);
    } catch (err) {
      setAfstandFejl(err instanceof Error ? err.message : 'Afstanden kunne ikke beregnes.');
    } finally {
      setBeregnerAfstand(false);
    }
  };

  const skiftTurRetur = (nyTurRetur: boolean) => {
    setTurRetur(nyTurRetur);

    const nuvaerendeKm = talFraFelt(km);

    if (nuvaerendeKm > 0) {
      let nytKm: number;
      if (
        sidsteBeregningRef.current &&
        (nuvaerendeKm === sidsteBeregningRef.current.turReturKm ||
          nuvaerendeKm === sidsteBeregningRef.current.enkeltTurKm)
      ) {
        nytKm = nyTurRetur
          ? sidsteBeregningRef.current.turReturKm
          : sidsteBeregningRef.current.enkeltTurKm;
      } else {
        nytKm = nyTurRetur
          ? Math.round(nuvaerendeKm * 2 * 10) / 10
          : Math.round((nuvaerendeKm / 2) * 10) / 10;
      }

      setKm(String(nytKm));

      if (beregnetInfo) {
        const enkelt = nyTurRetur ? Math.round((nytKm / 2) * 10) / 10 : nytKm;
        const stops = mellemstationer.map((s) => s.trim()).filter(Boolean);
        const stopsTxt =
          stops.length > 0
            ? ` (via ${stops.length} mellemstation${stops.length > 1 ? 'er' : ''})`
            : '';
        setBeregnetInfo(
          nyTurRetur
            ? `Beregnet: ${nytKm} km tur/retur (${enkelt} km hver vej)${stopsTxt}`
            : `Beregnet: ${nytKm} km enkelt tur${stopsTxt}`
        );
      }
    } else if (redigerer?.destinationAdresse?.trim()) {
      void beregnAfstand(nyTurRetur);
    }
  };

  const unikkeJobNavne = useMemo(() => {
    const navne = new Set<string>();
    for (const j of jobs) {
      if (j.tilknyttetJob?.trim()) navne.add(j.tilknyttetJob.trim());
      if (j.honorar > 0 && j.hvervgiver?.trim()) navne.add(j.hvervgiver.trim());
    }
    return Array.from(navne);
  }, [jobs]);

  const bilagIndeks = useMemo(
    () => new Map(bilag.map((b) => [b.id, b])),
    [bilag]
  );
  const koerselPrJob = useMemo(
    () => new Map(beregning.koersel.linjer.map((l) => [l.jobId, l])),
    [beregning]
  );
  const fradragPrJob = useMemo(() => {
    const kort = new Map<string, Fradrag[]>();
    for (const f of fradragListe) {
      if (!f.jobId) continue;
      kort.set(f.jobId, [...(kort.get(f.jobId) ?? []), f]);
    }
    return kort;
  }, [fradragListe]);

  const jobNavn = (job: Job) => job.hvervgiver?.trim() || job.booker?.trim() || 'Job uden navn';
  const jobFradrag = (job: Job) =>
    (koerselPrJob.get(job.id)?.fradrag ?? 0) +
    (fradragPrJob.get(job.id) ?? []).reduce((sum, f) => sum + f.fradragIDKK, 0);

  const aabn = (job: Job, kopi = false) => {
    setFejl(null);
    setAfstandFejl(null);
    setBeregnetInfo(null);
    const post = kopi
      ? { ...job, id: `job-${Date.now()}`, bilagIds: [], betalingsDato: '' }
      : { ...job, bilagIds: job.bilagIds ?? [] };
    setRedigerer(post);
    setHonorar(post.honorar ? String(post.honorar) : '');
    setBetaltSkat(post.betaltSkat ? String(post.betaltSkat) : '');
    setKm(post.antalKm ? String(post.antalKm) : '');
    setTure(String(post.antalTure || 1));
    setTimerJob(post.timerJob ? String(post.timerJob) : '');
    setTimerTransport(post.timerTransportForberedelse ? String(post.timerTransportForberedelse) : '');
    setVisMere(Boolean(post.type || post.timerJob || post.amBidragFritaget || post.erRubrik17));
    setTurRetur(post.turRetur !== undefined ? post.turRetur : true);
    setMellemstationer(post.mellemstationer ? [...post.mellemstationer] : []);
  };

  const kladdensKoersel = useMemo(() => {
    if (!redigerer) return 0;
    try {
      return beregnKoerselForJob(
        {
          id: redigerer.id,
          hvervgiver: redigerer.hvervgiver,
          transportmiddel: redigerer.transportmiddel,
          antalKm: talFraFelt(km),
          antalTure: talFraFelt(ture),
          startDato: redigerer.startDato,
          erBestyrelseshverv: redigerer.erBestyrelseshverv,
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

    const erKoersel = visning === 'koersel';

    if (erKoersel) {
      if (!redigerer.hvervgiver.trim()) {
        setFejl('Skriv en anledning eller et formål med kørslen (f.eks. Øver).');
        return;
      }
    } else {
      if (!redigerer.hvervgiver.trim() && !redigerer.booker?.trim()) {
        setFejl('Skriv mindst en hvervgiver eller booker, så jobbet kan identificeres.');
        return;
      }
    }

    if (redigerer.slutDato < redigerer.startDato) {
      setFejl('Slutdatoen ligger før startdatoen.');
      return;
    }
    const relevantDato = redigerer.slutDato || redigerer.startDato;
    if (Number(relevantDato.slice(0, 4)) !== indkomstAar.aar) {
      setFejl(
        `Datoen ligger i ${relevantDato.slice(0, 4)}, men du står i indkomståret ${indkomstAar.aar}.`
      );
      return;
    }

    setGemmer(true);
    try {
      await onGem({
        ...redigerer,
        tilknyttetJob: redigerer.tilknyttetJob?.trim() || undefined,
        honorar: talFraFelt(honorar),
        betaltSkat: talFraFelt(betaltSkat),
        antalKm: talFraFelt(km),
        antalTure: Math.max(0, Math.round(talFraFelt(ture))),
        timerJob: talFraFelt(timerJob) || undefined,
        timerTransportForberedelse: talFraFelt(timerTransport) || undefined,
        mellemstationer: mellemstationer.map((s) => s.trim()).filter(Boolean),
        turRetur,
        bilagIds: redigerer.bilagIds ?? [],
      });
      setRedigerer(null);
    } catch (err) {
      setFejl(
        err instanceof Error
          ? err.message
          : erKoersel
            ? 'Kørslen kunne ikke gemmes.'
            : 'Jobbet kunne ikke gemmes.'
      );
    } finally {
      setGemmer(false);
    }
  };

  const valgtTransport = TRANSPORT.find((t) => t.vaerdi === redigerer?.transportmiddel);
  const laast = indkomstAar.laast;

  const koerselRubrik = (job: Job): 29 | 51 =>
    job.transportmiddel === 'PASSENGER' || job.erBestyrelseshverv ? 51 : 29;
  const koerselJobs = jobs.filter((j) => j.transportmiddel !== 'NONE');
  const indtaegterJobs = jobs.filter(
    (j) => (j.honorar && j.honorar > 0) || j.erRubrik17 || j.transportmiddel === 'NONE'
  );
  const visteJobs = visning === 'koersel' ? koerselJobs : indtaegterJobs;

  const handlingKnap =
    visning === 'koersel' ? (
      <Knap art="primaer" onClick={() => aabn(nyKoersel(indkomstAar.id, indkomstAar.aar))}>
        Opret kørsel
      </Knap>
    ) : (
      <Knap art="primaer" onClick={() => aabn(nytJob(indkomstAar.id, indkomstAar.aar, profil?.fastBooker ?? profil?.fastHvervgiver))}>
        Nyt job
      </Knap>
    );

  const læsBilagKnap = (
    <Knap onClick={onAabnScanner} className="hidden lg:inline-flex">
      Læs et bilag
    </Knap>
  );

  const aiKnap = onAabnChat ? (
    <Knap
      art="sekundaer"
      onClick={() =>
        onAabnChat(
          visning === 'koersel'
            ? 'Jeg har et spørgsmål om regler for kørsel (rubrik 29 / rubrik 51) og kørselsfradrag:'
            : 'Jeg har et spørgsmål om indtægter, honorarer (rubrik 12) eller B-indkomst:'
        )
      }
      aria-label="Spørg Revisor AI"
      title="Spørg Revisor AI"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Spørg Revisor</span>
    </Knap>
  ) : null;

  return (
    <Sektion
      titel={visning === 'koersel' ? 'Kørsel' : 'Indtægter'}
      beskrivelse={
        visning === 'koersel'
          ? `Kørsel i egen bil eller på egen cykel til jobs, øvere eller andre erhvervsmæssige aktiviteter havner i rubrik 29 — næsten altid en bedre skatteværdi end befordringsfradraget i rubrik 51. Bestyrelseshverv uden kørselsgodtgørelse bruger i stedet rubrik 51. Adressen tager udgangspunkt i din egen hjemmeadresse, sat under Indkomstår.`
          : `Honorarer havner normalt i rubrik 12 på årsopgørelsen. Satserne for ${beregning.satser.aar} bruges automatisk.`
      }
      handling={laast ? null : <>{aiKnap}{læsBilagKnap}{handlingKnap}</>}
    >
      {visteJobs.length === 0 ? (
        <TomTilstand
          besked={
            visning === 'koersel'
              ? 'Der er ikke registreret kørsel endnu. Opret en kørsel for at registrere ture til f.eks. øvere, prøver, møder eller jobs.'
              : 'Der er ingen jobs i året endnu. Opret det første, eller læg en honorarkontrakt ind og lad den blive læst.'
          }
          handling={laast ? undefined : <>{handlingKnap}{læsBilagKnap}{aiKnap}</>}
        />
      ) : visning === 'koersel' ? (
        <Responsiv
          tabel={
            <Tabel minBredde={780}>
              <thead>
                <tr>
                  <Th bredde="2.5rem" />
                  <Th>Anledning / Job</Th>
                  <Th>Transportmiddel</Th>
                  <Th bredde="9rem">Adresse</Th>
                  <Th hoejre bredde="6rem">Km i alt</Th>
                  <Th hoejre bredde="9rem">Fradrag</Th>
                  <Th bredde="9rem" />
                </tr>
              </thead>
              <tbody>
                {visteJobs.map((job) => {
                  const linje = koerselPrJob.get(job.id);
                  return (
                    <tr key={job.id}>
                      <Td>
                        <Rubrik nr={koerselRubrik(job)} aktiv />
                      </Td>
                      <Td>
                        <span className="font-medium text-ink">{job.hvervgiver}</span>
                        <span className="block text-2xs text-ink-faint">
                          {[
                            job.tilknyttetJob ? `Job: ${job.tilknyttetJob}` : null,
                            dato(job.startDato),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </Td>
                      <Td>{TRANSPORT.find((t) => t.vaerdi === job.transportmiddel)?.navn}</Td>
                      <Td className="text-2xs text-ink-muted">{job.destinationAdresse || '–'}</Td>
                      <Td hoejre tal>
                        {linje ? linje.kmIAlt.toLocaleString('da-DK') : job.antalKm * job.antalTure}
                      </Td>
                      <Td hoejre tal>{kr(linje?.fradrag ?? 0)}</Td>
                      <Td hoejre>
                        {!laast && (
                          <div className="ikke-print flex justify-end gap-1">
                            <Knap art="tekst" onClick={() => aabn(job)}>
                              Rediger
                            </Knap>
                            <Knap art="tekst" onClick={() => setSletter(job)}>
                              Slet
                            </Knap>
                          </div>
                        )}
                      </Td>
                    </tr>
                  );
                })}
                <Sumraekke
                  celler={[
                    {
                      indhold: `${visteJobs.length} ${visteJobs.length === 1 ? 'tur' : 'ture'}`,
                      span: 4,
                    },
                    {
                      indhold: visteJobs
                        .reduce((s, j) => s + (koerselPrJob.get(j.id)?.kmIAlt ?? 0), 0)
                        .toLocaleString('da-DK'),
                      hoejre: true,
                      tal: true,
                    },
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
              {visteJobs.map((job) => {
                const linje = koerselPrJob.get(job.id);
                return (
                  <MobilPost
                    key={job.id}
                    rubrik={koerselRubrik(job)}
                    titel={job.hvervgiver}
                    undertitel={
                      <>
                        {job.tilknyttetJob && `${job.tilknyttetJob} · `}
                        {TRANSPORT.find((t) => t.vaerdi === job.transportmiddel)?.navn}
                        {job.destinationAdresse && ` · ${job.destinationAdresse}`}
                      </>
                    }
                    beloeb={`${kr(linje?.fradrag ?? 0)} kr.`}
                    beloebNote={linje ? `${linje.kmIAlt.toLocaleString('da-DK')} km` : undefined}
                    handlinger={
                      laast ? undefined : (
                        <div className="flex items-center gap-3">
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
                        </div>
                      )
                    }
                  />
                );
              })}
              <MobilSum
                tekst={`${visteJobs.length} ${visteJobs.length === 1 ? 'tur' : 'ture'} i alt`}
                beloeb={`${kr(beregning.koerselsFradragRubrik29 + beregning.befordringsFradragRubrik51)} kr.`}
              />
            </>
          }
        />
      ) : (
        <Responsiv
          tabel={
            <Tabel minBredde={1040}>
          <thead>
            <tr>
              <Th bredde="2.5rem" />
              <Th>Hvervgiver / booker</Th>
              <Th bredde="7rem">Dato</Th>
              <Th bredde="7rem">Betaling</Th>
              <Th hoejre bredde="8rem">Honorar</Th>
              <Th hoejre bredde="7rem">Skat betalt</Th>
              <Th hoejre bredde="8rem">Fradrag</Th>
              <Th bredde="12rem" />
            </tr>
          </thead>
          <tbody>
            {visteJobs.map((job) => {
              const krydser = betalingKrydserAarsskifte(job);
              return (
                <tr key={job.id}>
                  <Td>
                    <Rubrik nr={job.erRubrik17 ? 17 : 12} aktiv />
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => aabn(job)}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {jobNavn(job)}
                    </button>
                    <span className="block text-2xs text-ink-faint">
                      {[
                        job.hvervgiver && job.booker ? `Booket af ${job.booker}` : null,
                        !job.hvervgiver && job.booker ? 'Ingen særskilt hvervgiver' : null,
                        job.type,
                        job.amBidragFritaget ? 'Fritaget for AM-bidrag' : null,
                        job.timerJob ? timer(job.timerJob) : null,
                        job.erEksempel ? 'eksempel' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {(job.bilagIds?.length ?? 0) > 0 && (
                      <span className="mt-0.5 block text-2xs">
                        {(job.bilagIds ?? []).map((id) => {
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
                  <Td hoejre tal>{kr(job.betaltSkat ?? 0)}</Td>
                  <Td hoejre tal>
                    <button
                      type="button"
                      onClick={() => aabn(job)}
                      className="underline underline-offset-4 hover:text-ink"
                      title="Se kørsel og øvrige udgifter for jobbet"
                    >
                      {kr(jobFradrag(job))}
                    </button>
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
                { indhold: `${visteJobs.length} ${visteJobs.length === 1 ? 'job' : 'jobs'}`, span: 4 },
                { indhold: kr(beregning.honorarerRubrik12 + beregning.rubrik17Indkomst), hoejre: true, tal: true },
                { indhold: kr(visteJobs.reduce((sum, j) => sum + (j.betaltSkat ?? 0), 0)), hoejre: true, tal: true },
                { indhold: kr(visteJobs.reduce((sum, j) => sum + jobFradrag(j), 0)), hoejre: true, tal: true },
                { indhold: '' },
              ]}
            />
          </tbody>
            </Tabel>
          }
          liste={
            <>
              {visteJobs.map((job) => {
                return (
                  <MobilPost
                    key={job.id}
                    rubrik={job.erRubrik17 ? 17 : 12}
                    titel={jobNavn(job)}
                    undertitel={
                      <>
                        {dato(job.startDato)}
                        {job.betalingsDato && ` · betales ${dato(job.betalingsDato)}`}
                        {job.type && ` · ${job.type}`}
                        {job.hvervgiver && job.booker && ` · booket af ${job.booker}`}
                        {job.amBidragFritaget && ' · fritaget for AM-bidrag'}
                      </>
                    }
                    beloeb={`${kr(job.honorar)} kr.`}
                    beloebNote={
                      `${kr(job.betaltSkat ?? 0)} kr. skat · ${kr(jobFradrag(job))} kr. fradrag`
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
                tekst={`${visteJobs.length} ${visteJobs.length === 1 ? 'job' : 'jobs'} i alt`}
                beloeb={`${kr(beregning.honorarerRubrik12 + beregning.rubrik17Indkomst)} kr.`}
              />
            </>
          }
        />
      )}

      <Modal
        aaben={Boolean(redigerer)}
        onLuk={() => setRedigerer(null)}
        titel={
          jobs.some((j) => j.id === redigerer?.id)
            ? laast
              ? visning === 'koersel'
                ? 'Kørselsdetaljer'
                : 'Jobdetaljer'
              : visning === 'koersel'
              ? 'Rediger kørsel'
              : 'Rediger job'
            : visning === 'koersel'
              ? 'Opret kørsel'
              : 'Nyt job'
        }
        bund={
          laast ? (
            <Knap onClick={() => setRedigerer(null)}>Luk</Knap>
          ) : (
            <>
              <Knap onClick={() => setRedigerer(null)}>Annullér</Knap>
              <Knap art="primaer" onClick={gem} disabled={gemmer}>
                {gemmer ? 'Gemmer' : visning === 'koersel' ? 'Gem kørsel' : 'Gem job'}
              </Knap>
            </>
          )
        }
      >
        {redigerer && (
          <div className="space-y-5">
            {fejl && (
              <Advarsel titel={visning === 'koersel' ? 'Kørslen blev ikke gemt' : 'Jobbet blev ikke gemt'}>
                {fejl}
              </Advarsel>
            )}

            {onAabnChat && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onAabnChat(
                      visning === 'koersel'
                        ? 'Hjælp mig med regler for kørsel og befordringsfradrag:'
                        : 'Hjælp mig med at vurdere dette job og dets skattemæssige behandling:'
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-2xs text-ink-muted hover:text-ink underline underline-offset-4"
                >
                  <Sparkles className="h-3.5 w-3.5 text-ink-muted" />
                  <span>Spørg Revisor AI om råd</span>
                </button>
              </div>
            )}

            {visning === 'koersel' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                  <Felt
                    label="Anledning / formål"
                    paakraevet
                    hjaelp="Hvad kørte du til? F.eks. en øver, bandprøve eller et spillested."
                  >
                    {(id) => (
                      <Tekstfelt
                        id={id}
                        value={redigerer.hvervgiver}
                        placeholder="F.eks. Øver, bandprøve, møde eller spillested"
                        onChange={(e) => setRedigerer({ ...redigerer, hvervgiver: e.target.value })}
                      />
                    )}
                  </Felt>
                  <Felt
                    label="Job"
                    hjaelp="Ikke obligatorisk. Udfyld hvis kørslen hører til et bestemt job."
                  >
                    {(id) => (
                      <>
                        <Tekstfelt
                          id={id}
                          value={redigerer.tilknyttetJob ?? ''}
                          placeholder="F.eks. Vega Musikhus (valgfrit)"
                          list="eksisterende-jobs-liste"
                          onChange={(e) =>
                            setRedigerer({ ...redigerer, tilknyttetJob: e.target.value })
                          }
                        />
                        {unikkeJobNavne.length > 0 && (
                          <datalist id="eksisterende-jobs-liste">
                            {unikkeJobNavne.map((navn) => (
                              <option key={navn} value={navn} />
                            ))}
                          </datalist>
                        )}
                      </>
                    )}
                  </Felt>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Felt label="Dato for kørslen" paakraevet>
                    {(id) => (
                      <Datofelt
                        id={id}
                        value={redigerer.startDato}
                        onChange={(e) => {
                          const d = e.target.value;
                          setRedigerer({
                            ...redigerer,
                            startDato: d,
                            slutDato: d,
                          });
                        }}
                      />
                    )}
                  </Felt>
                  <Felt
                    label="Honorar (valgfrit)"
                    hjaelp="Udfyldes kun, hvis du modtager særskilt honorar for denne kørsel."
                  >
                    {(id) => <BeloebFelt id={id} vaerdi={honorar} onVaerdi={setHonorar} />}
                  </Felt>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Felt label="Hvervgiver" hjaelp="Den virksomhed eller person, der udbetaler honoraret.">
                    {(id) => (
                      <Tekstfelt
                        id={id}
                        value={redigerer.hvervgiver}
                        placeholder="Hvem har hyret dig"
                        onChange={(e) => setRedigerer({ ...redigerer, hvervgiver: e.target.value })}
                      />
                    )}
                  </Felt>
                  <Felt label="Booker" hjaelp="Bureau, agent eller person, der bookede jobbet, hvis det er en anden.">
                    {(id) => (
                      <Tekstfelt
                        id={id}
                        value={redigerer.booker ?? ''}
                        placeholder="Hvem bookede jobbet"
                        onChange={(e) => setRedigerer({ ...redigerer, booker: e.target.value })}
                      />
                    )}
                  </Felt>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Felt label="Honorar" paakraevet hjaelp="Beløbet før AM-bidrag og skat.">
                    {(id) => <BeloebFelt id={id} vaerdi={honorar} onVaerdi={setHonorar} />}
                  </Felt>
                  <Felt label="Betalt skat for jobbet" hjaelp="Den faktiske B-skat eller skat, du henfører til netop dette job.">
                    {(id) => <BeloebFelt id={id} vaerdi={betaltSkat} onVaerdi={setBetaltSkat} />}
                  </Felt>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Felt label="Startdato" paakraevet>
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
                  <Felt
                    label="Slutdato"
                    paakraevet
                    hjaelp="Bruges som standard for retserhvervelsesåret ved et almindeligt afsluttet job."
                  >
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
                    Betalingsdatoen afgør ikke i sig selv indkomståret. Som udgangspunkt bruges
                    året, hvor du fik endelig ret til honoraret; for et almindeligt afsluttet job
                    vil det normalt være slutåret.
                  </Advarsel>
                )}

                {jobs.some((j) => j.id === redigerer.id) && (
                  <div className="border-t border-rule pt-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-sm font-semibold text-ink">Fradrag på jobbet</h3>
                      <span className="tal text-sm font-semibold text-ink">{kr(jobFradrag(redigerer))} kr.</span>
                    </div>
                    <div className="mt-2 divide-y divide-rule border-y border-rule text-xs">
                      {(koerselPrJob.get(redigerer.id)?.fradrag ?? 0) > 0 && (
                        <div className="flex justify-between gap-4 py-2">
                          <span>
                            Kørsel · {(koerselPrJob.get(redigerer.id)?.kmIAlt ?? 0).toLocaleString('da-DK')} km
                          </span>
                          <span className="tal">{kr(koerselPrJob.get(redigerer.id)?.fradrag ?? 0)} kr.</span>
                        </div>
                      )}
                      {(fradragPrJob.get(redigerer.id) ?? []).map((f) => (
                        <div key={f.id} className="flex justify-between gap-4 py-2">
                          <span>
                            {f.beskrivelse}
                            <span className="ml-1 text-ink-faint">· {f.typeKategori || 'Udgift'} · {dato(f.fakturaDato)}</span>
                          </span>
                          <span className="tal">{kr(f.fradragIDKK)} kr.</span>
                        </div>
                      ))}
                      {jobFradrag(redigerer) === 0 && (
                        <p className="py-2 text-ink-muted">Der er endnu ingen kørsel eller øvrige udgifter knyttet til jobbet.</p>
                      )}
                    </div>
                    <p className="mt-2 text-2xs text-ink-muted">
                      Parkering, bro og andre udgifter knyttes til jobbet under Udgifter & fradrag.
                    </p>
                  </div>
                )}
              </>
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
                <div className="mt-4 space-y-3 border-t border-rule pt-4">
                  <Felt
                    label={visning === 'koersel' ? 'Adresse for kørslen' : 'Adresse for jobbet'}
                    hjaelp={
                      !bopael
                        ? 'Sæt en hjemmeadresse i din profil for at kunne beregne afstanden herfra.'
                        : undefined
                    }
                  >
                    {(id) => (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <AdresseInput
                            id={id}
                            value={redigerer.destinationAdresse ?? ''}
                            placeholder={
                              visning === 'koersel'
                                ? 'Øvelokale, spillested eller adresse'
                                : 'Spillested, øvelokale eller adresse'
                            }
                            onChange={(vaerdi) =>
                              setRedigerer({ ...redigerer, destinationAdresse: vaerdi })
                            }
                          />
                        </div>
                        {rutestatusKlar && (
                          <Knap
                            onClick={() => beregnAfstand()}
                            disabled={
                              beregnerAfstand ||
                              !bopael ||
                              !redigerer.destinationAdresse?.trim()
                            }
                            title="Foreslår kilometertallet ud fra bopæl og destination. Du kan altid rette det bagefter."
                          >
                            {beregnerAfstand ? 'Beregner…' : 'Beregn afstand'}
                          </Knap>
                        )}
                      </div>
                    )}
                  </Felt>

                  {mellemstationer.length > 0 && (
                    <div className="space-y-2 border-l-2 border-rule-strong pl-3">
                      <span className="text-2xs font-medium text-ink-muted">
                        Mellemstationer undervejs:
                      </span>
                      {mellemstationer.map((stop, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1">
                            <AdresseInput
                              value={stop}
                              placeholder={`Mellemstation ${idx + 1} (f.eks. øvelokale eller opsamling)`}
                              onChange={(vaerdi) => {
                                const kopi = [...mellemstationer];
                                kopi[idx] = vaerdi;
                                setMellemstationer(kopi);
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const kopi = mellemstationer.filter((_, i) => i !== idx);
                              setMellemstationer(kopi);
                            }}
                            className="text-xs text-ink-faint hover:text-negative"
                            title="Fjern mellemstation"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Afkrydsning
                      label="Tur/retur (retur til bopæl)"
                      checked={turRetur}
                      onChange={(e) => skiftTurRetur(e.target.checked)}
                    />
                    <button
                      type="button"
                      onClick={() => setMellemstationer([...mellemstationer, ''])}
                      className="text-2xs text-ink-muted underline underline-offset-4 hover:text-ink"
                    >
                      + Tilføj mellemstation
                    </button>
                  </div>

                  {beregnetInfo && (
                    <p className="text-2xs font-medium text-positive">{beregnetInfo}</p>
                  )}
                  {afstandFejl && (
                    <p className="text-2xs text-negative">{afstandFejl}</p>
                  )}

                  <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                    <Felt
                      label="Kilometer pr. tur"
                      hjaelp={turRetur ? 'Hele strækningen (tur/retur).' : 'Enkelt tur.'}
                    >
                      {(id) => <BeloebFelt id={id} vaerdi={km} onVaerdi={setKm} suffiks="km" />}
                    </Felt>
                    <Felt label="Antal ture">
                      {(id) => <BeloebFelt id={id} vaerdi={ture} onVaerdi={setTure} suffiks="" />}
                    </Felt>
                    <div className="flex flex-col justify-end pb-1">
                      <span className="text-2xs text-ink-muted">
                        Fradrag, rubrik{' '}
                        {redigerer.transportmiddel === 'PASSENGER' || redigerer.erBestyrelseshverv
                          ? 51
                          : 29}
                      </span>
                      <span className="tal text-lg font-semibold text-ink">
                        {kr(kladdensKoersel)} kr.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(redigerer.transportmiddel === 'OWN_CAR_MC' ||
                redigerer.transportmiddel === 'OWN_BIKE') && (
                <div className="mt-4">
                  <Afkrydsning
                    label="Bestyrelses-, udvalgs- eller kommissionshverv uden modtaget skattefri kørselsgodtgørelse"
                    hjaelp="Modsat kunstnere og musikere er bestyrelsesmedlemmer henvist til det almindelige befordringsfradrag, hvis de ikke får kørepenge fra virksomheden. Fradraget lander derfor i rubrik 51, ikke rubrik 29, med bundgrænse på 24 km."
                    checked={Boolean(redigerer.erBestyrelseshverv)}
                    onChange={(e) =>
                      setRedigerer({ ...redigerer, erBestyrelseshverv: e.target.checked })
                    }
                  />
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
                    hjaelp="Gælder fx biblioteksafgift, rettighedsbetalinger og legater uden krav om en konkret modydelse. Markér ikke almindelige honorarer."
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
        titel={visning === 'koersel' ? 'Slet kørslen?' : 'Slet jobbet?'}
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
              {visning === 'koersel' ? 'Slet kørslen' : 'Slet jobbet'}
            </Knap>
          </>
        }
      >
        <p className="text-xs text-ink-muted">
          {visning === 'koersel' ? (
            <>
              Kørslen &quot;{sletter?.hvervgiver}&quot; fjernes fra kørselsopgørelsen og
              skatteberegningen. Bilag bliver liggende i arkivet.
            </>
          ) : (
            <>
              {sletter?.hvervgiver} på {kr(sletter?.honorar ?? 0)} kr. forsvinder fra rubrik{' '}
              {sletter?.erRubrik17 ? 17 : 12} og fra skatteberegningen. Bilag bliver liggende i
              arkivet.
            </>
          )}
        </p>
      </Modal>
    </Sektion>
  );
}
