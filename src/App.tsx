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
import { GlobalSidebar } from './components/GlobalSidebar';
import { AiBilagScannerModal } from './components/AiBilagScannerModal';
import { RevisorChatModal } from './components/RevisorChatModal';
import { Advarsel, Knap } from './components/ui';
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

const FANER = [
  { id: 'jobs', navn: 'Jobs og kørsel' },
  { id: 'fradrag', navn: 'Fradrag' },
  { id: 'overblik', navn: 'Skatteoverblik' },
  { id: 'aarsopgoerelse', navn: 'Årsopgørelse' },
  { id: 'opsparing', navn: 'Sæt til side' },
  { id: 'statistik', navn: 'Statistik' },
  { id: 'investeringer', navn: 'Investeringer' },
  { id: 'dokumentation', navn: 'Dokumentation' },
  { id: 'aar', navn: 'Indkomstår' },
];

export default function App() {
  const auth = useAuth();
  const d = useRevisorData(auth.tilstand === 'aaben');
  const { visning, naviger } = useUrlState('jobs');
  const [ai, setAi] = useState<{
    klar: boolean;
    udbyder: string | null;
    modeller: { tekst: string; billede: string } | null;
  }>({ klar: false, udbyder: null, modeller: null });
  const aiKlar = ai.klar;
  const [scannerAaben, setScannerAaben] = useState(false);
  const [chatAaben, setChatAaben] = useState(false);
  const [besked, setBesked] = useState<string | null>(null);
  const [handlingsfejl, setHandlingsfejl] = useState<string | null>(null);

  useEffect(() => {
    api
      .aiStatus()
      .then(setAi)
      .catch(() => setAi({ klar: false, udbyder: null, modeller: null }));
  }, []);

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
    naviger({ aar: data.indkomstAar.id, fane: 'jobs' });
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
            onClick={() => naviger({ fane: 'jobs' })}
            className="overgang flex items-baseline gap-2 hover:opacity-70"
          >
            <span className="font-display text-base font-extrabold tracking-tight text-ink">
              revis
            </span>
            <span className="tal text-2xs text-ink-faint">B-indkomst</span>
          </button>

          <div className="flex items-center gap-4">
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
            </div>
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

        <nav aria-label="Moduler" className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
          <ul className="flex gap-1 pb-px">
            {FANER.map((f) => {
              const aktiv = visning.fane === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => naviger({ fane: f.id })}
                    aria-current={aktiv ? 'page' : undefined}
                    className={`overgang whitespace-nowrap border-b-2 px-3 py-2 text-xs ${
                      aktiv
                        ? 'border-ink font-semibold text-ink'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    {f.navn}
                  </button>
                </li>
              );
            })}
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
                  onGaaTil={(fane) => naviger({ fane })}
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
                  {visning.fane === 'jobs' && (
                    <JobsModule
                      jobs={aaretsJobs}
                      bilag={d.data.bilag}
                      indkomstAar={aktivtAar}
                      beregning={beregning}
                      onGem={medFejlhaandtering(d.gemJob)}
                      onSlet={medFejlhaandtering(d.sletJob)}
                      onAabnScanner={() => setScannerAaben(true)}
                    />
                  )}

                  {visning.fane === 'fradrag' && (
                    <FradragModule
                      fradragListe={aaretsFradrag}
                      bilag={d.data.bilag}
                      indkomstAar={aktivtAar}
                      beregning={beregning}
                      onGem={medFejlhaandtering(d.gemFradrag)}
                      onSlet={medFejlhaandtering(d.sletFradrag)}
                      onAabnScanner={() => setScannerAaben(true)}
                    />
                  )}

                  {visning.fane === 'overblik' && (
                    <SkatOverblikModule indkomstAar={aktivtAar} beregning={beregning} />
                  )}

                  {visning.fane === 'aarsopgoerelse' && (
                    <AarsopgoerelseModule indkomstAar={aktivtAar} beregning={beregning} />
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

                  {visning.fane === 'statistik' && <StatistikModule jobs={aaretsJobs} />}

                  {visning.fane === 'investeringer' && (
                    <InvesteringerModule
                      investeringer={aaretsInvesteringer}
                      bilag={d.data.bilag}
                      indkomstAar={aktivtAar}
                      onGem={medFejlhaandtering(d.gemInvestering)}
                      onSlet={medFejlhaandtering(d.sletInvestering)}
                      onAabnScanner={() => setScannerAaben(true)}
                    />
                  )}

                  {visning.fane === 'dokumentation' && (
                    <DokumentationModule
                      indkomstAarListe={aarListe}
                      jobs={d.data.jobs}
                      fradrag={d.data.fradrag}
                      investeringer={d.data.investeringer}
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
                onAabnScanner={() => setScannerAaben(true)}
                onAabnChat={() => setChatAaben(true)}
                  onGaaTil={(fane) => naviger({ fane })}
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
            className="flex shrink-0 items-center justify-center bg-surface px-5 py-3.5 text-sm font-medium text-ink"
          >
            Revisor
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
        />
      )}

      {aktivtAar && beregning && (
        <RevisorChatModal
          aaben={chatAaben}
          onLuk={() => setChatAaben(false)}
          indkomstAar={aktivtAar}
          indkomstAarListe={aarListe}
          beregning={beregning}
          aiKlar={aiKlar}
          onGemJob={medFejlhaandtering(d.gemJob)}
          onGemFradrag={medFejlhaandtering(d.gemFradrag)}
          onGemInvestering={medFejlhaandtering(d.gemInvestering)}
        />
      )}
    </div>
  );
}
