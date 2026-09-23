import React, { useEffect, useMemo, useState } from 'react';
import { useRevisorData } from './hooks/useRevisorData';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { useUrlState } from './hooks/useUrlState';
import { api } from './lib/api';
import { beregnSkat, type SkatteBeregning } from './lib/tax/beregn';
import { UkendtIndkomstAarError } from './lib/tax/satser';
import { byggEksempeldata } from './data/eksempeldata';
import { IndkomstAarModule } from './components/IndkomstAarModule';
import { JobsModule } from './components/JobsModule';
import { FradragModule } from './components/FradragModule';
import { InvesteringerModule } from './components/InvesteringerModule';
import { SkatOverblikModule } from './components/SkatOverblikModule';
import { AarsopgoerelseModule } from './components/AarsopgoerelseModule';
import { OpsparingTrackerModule } from './components/OpsparingTrackerModule';
import { StatistikModule } from './components/StatistikModule';
import { DokumentationModule } from './components/DokumentationModule';
import { Forside } from './components/Forside';
import { GlobalSidebar } from './components/GlobalSidebar';
import { AiBilagScannerModal } from './components/AiBilagScannerModal';
import { RevisorChatModal } from './components/RevisorChatModal';
import { ProfilModal } from './components/ProfilModal';
import {
  BarChart2,
  Briefcase,
  Building2,
  Calculator,
  Car,
  FileCheck,
  FileText,
  Home,
  Receipt,
  Sparkles,
  User,
} from 'lucide-react';
import { Advarsel, Knap, RevisorMaerke } from './components/ui';
import { kr } from './lib/format';

function MobilOverblik({
  beregning,
  afsat,
  onGaaTil,
}: {
  beregning: SkatteBeregning;
  afsat: number;
  onGaaTil: (fane: string) => void;
}) {
  const mangler = Math.max(0, beregning.samletSkatOgAM - afsat);

  return (
    <div className="ikke-print mb-6 lg:hidden">
      <dl className="grid grid-cols-3 border-y border-rule">
        <div className="border-r border-rule py-2.5 pr-3">
          <dt className="text-2xs uppercase tracking-wide text-ink-faint">Skat i alt</dt>
          <dd className="tal mt-0.5 text-sm font-semibold text-ink">
            {kr(beregning.samletSkatOgAM)}
            <span className="ml-1 text-2xs font-normal text-ink-faint">kr.</span>
          </dd>
        </div>
        <div className="border-r border-rule py-2.5 pl-3 pr-3">
          <dt className="text-2xs uppercase tracking-wide text-ink-faint">Sat til side</dt>
          <dd className="tal mt-0.5 text-sm font-semibold text-ink">
            {kr(afsat)}
            <span className="ml-1 text-2xs font-normal text-ink-faint">kr.</span>
          </dd>
        </div>
        <div className="py-2.5 pl-3">
          <dt className="text-2xs uppercase tracking-wide text-ink-faint">Mangler</dt>
          <dd
            className={`tal mt-0.5 text-sm font-semibold ${
              mangler > 0 ? 'text-negative' : 'text-positive'
            }`}
          >
            {kr(mangler)}
            <span className="ml-1 text-2xs font-normal text-ink-faint">kr.</span>
          </dd>
        </div>
      </dl>
      {mangler > 0 && (
        <button
          type="button"
          onClick={() => onGaaTil('opsparing')}
          className="mt-1.5 text-2xs text-negative underline underline-offset-4"
        >
          Se hvad der skal sættes til side
        </button>
      )}
    </div>
  );
}

/** Daglig drift: det, der løbende registreres. */
const FANER_DRIFT = [
  { id: 'forside', navn: 'Forside', ikon: Home },
  { id: 'indtaegter', navn: 'Indtægter', ikon: Briefcase },
  { id: 'fradrag', navn: 'Udgifter & fradrag', ikon: Receipt },
  { id: 'koersel', navn: 'Kørsel', ikon: Car },
  { id: 'investeringer', navn: 'Investeringer', ikon: Building2 },
];

/** Samlet overblik: det, der ser tilbage på hele året. */
const FANER_OVERBLIK = [
  { id: 'overblik', navn: 'Skatteoverblik', ikon: Calculator },
  { id: 'aarsopgoerelse', navn: 'Årsopgørelse', ikon: FileCheck },
  { id: 'statistik', navn: 'Statistik', ikon: BarChart2 },
  { id: 'dokumentation', navn: 'Dokumentation', ikon: FileText },
];

function FaneKnap({
  fane,
  aktiv,
  onNaviger,
}: {
  fane: { id: string; navn: string; ikon?: React.ComponentType<{ className?: string }> };
  aktiv: boolean;
  onNaviger: (naeste: { fane: string }) => void;
}) {
  const Ikon = fane.ikon;
  return (
    <li>
      <button
        type="button"
        onClick={() => onNaviger({ fane: fane.id })}
        aria-current={aktiv ? 'page' : undefined}
        className={`overgang inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs ${
          aktiv
            ? 'border-ink font-semibold text-ink'
            : 'border-transparent text-ink-muted hover:text-ink'
        }`}
      >
        {Ikon && <Ikon className="h-3.5 w-3.5 shrink-0" />}
        <span>{fane.navn}</span>
      </button>
    </li>
  );
}

export default function App() {
  const auth = useAuth();
  const d = useRevisorData(auth.tilstand === 'aaben');
  const { visning, naviger } = useUrlState('forside');
  const [ai, setAi] = useState<{
    klar: boolean;
    udbyder: string | null;
    modeller: { tekst: string; billede: string } | null;
  }>({ klar: false, udbyder: null, modeller: null });
  const aiKlar = ai.klar;
  const [scannerAaben, setScannerAaben] = useState(false);
  const [scannerStartFil, setScannerStartFil] = useState<File | null>(null);
  const [chatAaben, setChatAaben] = useState(false);
  const [chatStartBesked, setChatStartBesked] = useState<string | null>(null);
  const [besked, setBesked] = useState<string | null>(null);
  const [handlingsfejl, setHandlingsfejl] = useState<string | null>(null);
  const [profilAaben, setProfilAaben] = useState(false);

  /** Forsidens spørgeboks åbner chatten og sender teksten med det samme. */
  const stilSpoergsmaal = (tekst = '') => {
    setChatStartBesked(tekst);
    setChatAaben(true);
  };

  /** Et bilag trukket ind på forsiden åbner scanneren og læser det med det samme. */
  const traekBilagInd = (fil: File) => {
    setScannerStartFil(fil);
    setScannerAaben(true);
  };

  const gaaTilFane = (fane: string) => {
    const ren = fane.toLowerCase().replace(/^[#/]+/, '').trim();
    if (ren === 'profil' || ren === 'min-profil' || ren === 'stamdata') {
      setProfilAaben(true);
      return;
    }
    naviger({ fane: ren });
  };

  useEffect(() => {
    // Statustjekket ligger bag login. Køres det kun ved allerførste mount, når
    // brugeren endnu ikke er logget ind, fejler kaldet med 401 og bliver aldrig
    // hentet igen — AI-funktionerne fremstår slået fra resten af sessionen, selv
    // med en gyldig nøgle på serveren.
    if (auth.tilstand !== 'aaben') return;
    api
      .aiStatus()
      .then(setAi)
      .catch(() => setAi({ klar: false, udbyder: null, modeller: null }));
  }, [auth.tilstand]);

  const visBesked = (tekst: string) => {
    setBesked(tekst);
    window.setTimeout(() => setBesked(null), 3500);
  };

  /** Fanger en fejl fra en skrivning, så tallet ikke ser gemt ud uden at være det. */
  const medFejlhaandtering =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      setHandlingsfejl(null);
      try {
        return await fn(...a);
      } catch (err) {
        setHandlingsfejl(
          err instanceof Error ? err.message : 'Handlingen kunne ikke gennemføres.'
        );
        throw err;
      }
    };

  const aarListe = useMemo(
    () => [...d.data.indkomstAar].sort((a, b) => b.aar - a.aar),
    [d.data.indkomstAar]
  );

  const aktivtAar =
    aarListe.find((a) => a.id === visning.aar) ?? aarListe[0] ?? null;

  // Året skal stå i URL'en, så et genindlæs og et delt link viser det samme.
  useEffect(() => {
    if (aktivtAar && visning.aar !== aktivtAar.id) {
      naviger({ aar: aktivtAar.id }, true);
    }
  }, [aktivtAar, visning.aar, naviger]);

  const aaretsJobs = useMemo(
    () => d.data.jobs.filter((j) => j.indkomstAarId === aktivtAar?.id),
    [d.data.jobs, aktivtAar]
  );
  const aaretsFradrag = useMemo(
    () => d.data.fradrag.filter((f) => f.indkomstAarId === aktivtAar?.id),
    [d.data.fradrag, aktivtAar]
  );
  const aaretsInvesteringer = useMemo(
    () => d.data.investeringer.filter((i) => i.indkomstAarId === aktivtAar?.id),
    [d.data.investeringer, aktivtAar]
  );

  const { beregning, beregningsfejl } = useMemo((): {
    beregning: SkatteBeregning | null;
    beregningsfejl: string | null;
  } => {
    if (!aktivtAar) return { beregning: null, beregningsfejl: null };
    try {
      return {
        beregning: beregnSkat(aktivtAar, aaretsJobs, aaretsFradrag),
        beregningsfejl: null,
      };
    } catch (err) {
      return {
        beregning: null,
        beregningsfejl:
          err instanceof UkendtIndkomstAarError
            ? err.message
            : 'Skatten kunne ikke beregnes for året.',
      };
    }
  }, [aktivtAar, aaretsJobs, aaretsFradrag]);

  const indlaesEksempel = async () => {
    const data = byggEksempeldata(2026);
    if (d.data.indkomstAar.some((a) => a.id === data.indkomstAar.id)) {
      visBesked('Eksempeldataene er allerede indlæst.');
      return;
    }
    await d.gemIndkomstAar(data.indkomstAar);
    for (const j of data.jobs) await d.gemJob(j);
    for (const f of data.fradrag) await d.gemFradrag(f);
    for (const i of data.investeringer) await d.gemInvestering(i);
    naviger({ aar: data.indkomstAar.id, fane: 'indtaegter' });
    visBesked('Eksempeldataene er indlæst. De er markeret som eksempel.');
  };

  if (auth.tilstand === 'tjekker') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24">
        <p className="text-sm text-ink-muted">Et øjeblik…</p>
      </main>
    );
  }

  if (auth.tilstand === 'utilgaengelig') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <Advarsel titel="Der er ikke forbindelse til serveren">
          Appen kan ikke få fat i serveren. Kører den?
        </Advarsel>
      </main>
    );
  }

  if (auth.tilstand === 'kraever-login') {
    return <Login onLoggetInd={auth.tjekIgen} />;
  }

  if (d.tilstand === 'indlaeser') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24">
        <p className="text-sm text-ink-muted">Henter dine data…</p>
      </main>
    );
  }

  if (d.tilstand === 'fejl') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <Advarsel titel="Dine data kunne ikke hentes">{d.fejl}</Advarsel>
        <div className="mt-4">
          <Knap art="primaer" onClick={() => void d.hentIgen()}>
            Prøv igen
          </Knap>
        </div>
      </main>
    );
  }

  const visSidebar =
    aktivtAar && beregning && !['aar', 'statistik'].includes(visning.fane);

  return (
    <div className="min-h-screen">
      {besked && (
        <div
          role="status"
          className="ikke-print fixed bottom-5 right-5 z-50 border border-rule-strong bg-surface px-4 py-2.5 text-xs shadow-lg"
        >
          {besked}
        </div>
      )}

      <header className="ikke-print sticky top-0 z-30 border-b border-rule bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => naviger({ fane: 'forside' })}
            className="overgang flex items-baseline gap-2 hover:opacity-70"
          >
            <span className="font-display text-base font-extrabold tracking-tight text-ink">
              revis
            </span>
            <span className="tal text-2xs text-ink-faint">B-indkomst</span>
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setProfilAaben(true)}
              className="overgang flex items-center gap-1.5 rounded-[4px] border border-rule-strong bg-surface px-2.5 py-1 text-xs text-ink hover:bg-sunk"
              title="Rediger din profil og faste stamdata (bopæl, skat, kørselspræferencer)"
            >
              <User className="h-3.5 w-3.5 text-ink-muted" />
              <span className="hidden sm:inline">
                {d.data.profil?.navn ? d.data.profil.navn : 'Min profil'}
              </span>
              <span className="sm:hidden">Profil</span>
            </button>

            {aarListe.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="aar-vaelger" className="text-2xs text-ink-muted">
                Indkomstår
              </label>
              <select
                id="aar-vaelger"
                value={aktivtAar?.id ?? ''}
                onChange={(e) => naviger({ aar: e.target.value })}
                className="tal rounded-[4px] border border-rule-strong bg-surface px-2 py-1 text-xs text-ink"
              >
                {aarListe.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.aar}
                    {a.laast ? ' (låst)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => naviger({ fane: 'aar' })}
                className="text-2xs text-ink-muted underline underline-offset-4 hover:text-ink"
              >
                Administrér
              </button>
            </div>
            )}
            {aktivtAar && beregning && (
              // Den eneste vej til Revisor-chatten på skrivebordet — sidebaren
              // gentager den ikke. Kun på lg+: mobilen har sin egen faste
              // Revisor-knap i bundnavigationen.
              <button
                type="button"
                onClick={() => setChatAaben(true)}
                className="overgang hidden items-center gap-1.5 rounded-[4px] border border-rule-strong px-2.5 py-1 text-xs font-medium text-ink hover:bg-sunk lg:flex"
              >
                <RevisorMaerke stoerrelse="sm" />
                Revisor
              </button>
            )}
            {auth.status?.kraeverLogin && (
              <button
                type="button"
                onClick={() => void auth.logUd()}
                className="text-2xs text-ink-muted underline underline-offset-4 hover:text-ink"
              >
                Log ud
              </button>
            )}
          </div>
        </div>

        <nav aria-label="Moduler" className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-x-auto px-4 sm:px-6">
          <ul className="flex gap-1 pb-px">
            {FANER_DRIFT.map((f) => (
              <FaneKnap key={f.id} fane={f} aktiv={visning.fane === f.id} onNaviger={naviger} />
            ))}
          </ul>
          <ul className="flex gap-1 pb-px">
            {FANER_OVERBLIK.map((f) => (
              <FaneKnap key={f.id} fane={f} aktiv={visning.fane === f.id} onNaviger={naviger} />
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:pb-8">
        {handlingsfejl && (
          <div className="mb-5">
            <Advarsel titel="Handlingen slog fejl">{handlingsfejl}</Advarsel>
          </div>
        )}

        {!aktivtAar ? (
          <IndkomstAarModule
            indkomstAarListe={aarListe}
            aktivtAarId={null}
            antalPoster={() => ({ jobs: 0, fradrag: 0, investeringer: 0 })}
            onGem={medFejlhaandtering(d.gemIndkomstAar)}
            onSlet={medFejlhaandtering(d.sletIndkomstAar)}
            onVaelg={(id) => naviger({ aar: id })}
            onIndlaesEksempel={indlaesEksempel}
          />
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="min-w-0 flex-1">
              {beregning && !['aar'].includes(visning.fane) && (
                <MobilOverblik
                  beregning={beregning}
                  afsat={
                    (d.data.opsparing[aktivtAar.id]?.indbetaltTilSkat ?? 0) +
                    (d.data.opsparing[aktivtAar.id]?.opsparetPrivat ?? 0)
                  }
                  onGaaTil={gaaTilFane}
                />
              )}

              {beregningsfejl && (
                <div className="mb-5">
                  <Advarsel titel="Året kan ikke beregnes">{beregningsfejl}</Advarsel>
                </div>
              )}

              {visning.fane === 'aar' && (
                <IndkomstAarModule
                  indkomstAarListe={aarListe}
                  aktivtAarId={aktivtAar.id}
                  antalPoster={(id) => ({
                    jobs: d.data.jobs.filter((j) => j.indkomstAarId === id).length,
                    fradrag: d.data.fradrag.filter((f) => f.indkomstAarId === id).length,
                    investeringer: d.data.investeringer.filter((i) => i.indkomstAarId === id)
                      .length,
                  })}
                  onGem={medFejlhaandtering(d.gemIndkomstAar)}
                  onSlet={medFejlhaandtering(d.sletIndkomstAar)}
                  onVaelg={(id) => naviger({ aar: id })}
                  onIndlaesEksempel={indlaesEksempel}
                />
              )}

              {beregning && (
                <>
                  {visning.fane === 'forside' && (
                    <Forside
                      aiKlar={aiKlar}
                      onStilSpoergsmaal={stilSpoergsmaal}
                      onDropFil={traekBilagInd}
                      onAabnScanner={() => setScannerAaben(true)}
                      onGaaTil={gaaTilFane}
                      jobs={aaretsJobs}
                      fradragListe={aaretsFradrag}
                      investeringer={aaretsInvesteringer}
                    />
                  )}

                  {visning.fane === 'indtaegter' && (
                    <JobsModule
                      visning="indtaegter"
                      jobs={aaretsJobs}
                      fradragListe={aaretsFradrag}
                      bilag={d.data.bilag}
                      indkomstAar={aktivtAar}
                      profil={d.data.profil}
                      beregning={beregning}
                      onGem={medFejlhaandtering(d.gemJob)}
                      onSlet={medFejlhaandtering(d.sletJob)}
                      onAabnScanner={() => setScannerAaben(true)}
                      onAabnChat={stilSpoergsmaal}
                    />
                  )}

                  {visning.fane === 'koersel' && (
                    <JobsModule
                      visning="koersel"
                      jobs={aaretsJobs}
                      fradragListe={aaretsFradrag}
                      bilag={d.data.bilag}
                      indkomstAar={aktivtAar}
                      profil={d.data.profil}
                      beregning={beregning}
                      onGem={medFejlhaandtering(d.gemJob)}
                      onSlet={medFejlhaandtering(d.sletJob)}
                      onAabnScanner={() => setScannerAaben(true)}
                      onAabnChat={stilSpoergsmaal}
                    />
                  )}

                  {visning.fane === 'fradrag' && (
                    <FradragModule
                      fradragListe={aaretsFradrag}
                      jobs={aaretsJobs}
                      bilag={d.data.bilag}
                      indkomstAar={aktivtAar}
                      beregning={beregning}
                      onGem={medFejlhaandtering(d.gemFradrag)}
                      onSlet={medFejlhaandtering(d.sletFradrag)}
                      onAabnScanner={() => setScannerAaben(true)}
                      onAabnChat={stilSpoergsmaal}
                    />
                  )}

                  {visning.fane === 'overblik' && (
                    <SkatOverblikModule
                      indkomstAar={aktivtAar}
                      beregning={beregning}
                      onAabnChat={stilSpoergsmaal}
                    />
                  )}

                  {visning.fane === 'aarsopgoerelse' && (
                    <AarsopgoerelseModule
                      indkomstAar={aktivtAar}
                      beregning={beregning}
                      onAabnChat={stilSpoergsmaal}
                    />
                  )}

                  {visning.fane === 'opsparing' && (
                    <OpsparingTrackerModule
                      beregning={beregning}
                      jobs={aaretsJobs}
                      opsparing={
                        d.data.opsparing[aktivtAar.id] ?? {
                          indbetaltTilSkat: 0,
                          opsparetPrivat: 0,
                        }
                      }
                      onGem={medFejlhaandtering((o) => d.gemOpsparing(aktivtAar.id, o))}
                    />
                  )}

                  {visning.fane === 'statistik' && (
                    <StatistikModule jobs={aaretsJobs} onAabnChat={stilSpoergsmaal} />
                  )}

                  {visning.fane === 'investeringer' && (
                    <InvesteringerModule
                      investeringer={aaretsInvesteringer}
                      bilag={d.data.bilag}
                      indkomstAar={aktivtAar}
                      onGem={medFejlhaandtering(d.gemInvestering)}
                      onSlet={medFejlhaandtering(d.sletInvestering)}
                      onAabnScanner={() => setScannerAaben(true)}
                      onAabnChat={stilSpoergsmaal}
                    />
                  )}

                  {visning.fane === 'dokumentation' && (
                    <DokumentationModule
                      indkomstAarListe={aarListe}
                      jobs={d.data.jobs}
                      fradrag={d.data.fradrag}
                      investeringer={d.data.investeringer}
                      bilag={d.data.bilag}
                      onAabnChat={stilSpoergsmaal}
                    />
                  )}

                  {!['forside', 'indtaegter', 'koersel', 'fradrag', 'overblik', 'aarsopgoerelse', 'opsparing', 'statistik', 'investeringer', 'dokumentation'].includes(visning.fane) && (
                    <Forside
                      aiKlar={aiKlar}
                      onStilSpoergsmaal={stilSpoergsmaal}
                      onDropFil={traekBilagInd}
                      onAabnScanner={() => setScannerAaben(true)}
                      onGaaTil={gaaTilFane}
                      jobs={aaretsJobs}
                      fradragListe={aaretsFradrag}
                      investeringer={aaretsInvesteringer}
                    />
                  )}
                </>
              )}
            </div>

            {visSidebar && beregning && (
              <div className="hidden lg:block">
                <GlobalSidebar
                  indkomstAar={aktivtAar}
                  beregning={beregning}
                  opsparing={
                    d.data.opsparing[aktivtAar.id] ?? {
                      indbetaltTilSkat: 0,
                      opsparetPrivat: 0,
                    }
                  }
                  aiKlar={aiKlar}
                  aiUdbyder={ai.udbyder}
                  aiModel={ai.modeller?.tekst ?? null}
                  profil={d.data.profil}
                  onAabnProfil={() => setProfilAaben(true)}
                  onAabnScanner={() => setScannerAaben(true)}
                  onGaaTil={gaaTilFane}
                  antalJobs={aaretsJobs.length}
                  investeringerIAlt={aaretsInvesteringer.reduce((s, i) => s + i.beloeb, 0)}
                  visForklaring={visning.fane === 'forside'}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {aktivtAar && (
        <nav
          aria-label="Hurtige handlinger"
          className="ikke-print fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-px border-t border-rule-strong bg-rule lg:hidden"
        >
          <button
            type="button"
            onClick={() => setScannerAaben(true)}
            className="flex flex-1 items-center justify-center gap-2 bg-ink px-4 py-3.5 text-sm font-semibold text-surface"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.3-.75l.6-1a1.5 1.5 0 0 1 1.3-.75h4.2a1.5 1.5 0 0 1 1.3.75l.6 1A1.5 1.5 0 0 0 17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
            Læs et bilag
          </button>
          <button
            type="button"
            onClick={() => setChatAaben(true)}
            className="flex shrink-0 items-center justify-center gap-1.5 bg-surface px-5 py-3.5 text-sm font-medium text-ink"
          >
            <Sparkles className="h-4 w-4" />
            <span>Revisor</span>
          </button>
        </nav>
      )}

      {aktivtAar && (
        <AiBilagScannerModal
          aaben={scannerAaben}
          onLuk={() => setScannerAaben(false)}
          indkomstAar={aktivtAar}
          indkomstAarListe={aarListe}
          aiKlar={aiKlar}
          onGemJob={medFejlhaandtering(d.gemJob)}
          onGemFradrag={medFejlhaandtering(d.gemFradrag)}
          onGemInvestering={medFejlhaandtering(d.gemInvestering)}
          onNytBilag={d.tilfoejBilag}
          startFil={scannerStartFil}
          onStartFilForbrugt={() => setScannerStartFil(null)}
        />
      )}

      <ProfilModal
        aaben={profilAaben}
        onLuk={() => setProfilAaben(false)}
        profil={
          d.data.profil || {
            navn: '',
            hjemmeadresse: aktivtAar?.hjemmeadresse || '',
            kommune: aktivtAar?.kommune || '',
          }
        }
        onGem={async (p) => {
          await d.gemProfil(p);
          visBesked('Din profil og faste stamdata er gemt.');
        }}
        onNulstil={async () => {
          await d.nulstilRegnskab();
          naviger({ fane: 'aar', aar: null });
          visBesked('Regnskabet er nulstillet. Din profil er bevaret.');
        }}
      />

      {aktivtAar && beregning && (
        <RevisorChatModal
          aaben={chatAaben}
          onLuk={() => setChatAaben(false)}
          profil={d.data.profil}
          indkomstAar={aktivtAar}
          indkomstAarListe={aarListe}
          beregning={beregning}
          jobs={aaretsJobs}
          aiKlar={aiKlar}
          onGemJob={medFejlhaandtering(d.gemJob)}
          onGemFradrag={medFejlhaandtering(d.gemFradrag)}
          onGemInvestering={medFejlhaandtering(d.gemInvestering)}
          startBesked={chatStartBesked}
          onStartBeskedForbrugt={() => setChatStartBesked(null)}
          onGaaTil={gaaTilFane}
        />
      )}
    </div>
  );
}
