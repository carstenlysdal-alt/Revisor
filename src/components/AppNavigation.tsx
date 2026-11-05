import { useEffect, useState } from 'react';
import {
  BarChart2, Briefcase, Building2, Calculator, Car, ChevronRight,
  FileCheck, FileText, Home, LogOut, Menu, PiggyBank, Receipt, Settings2, User,
} from 'lucide-react';
import type { IndkomstAar } from '../types';
import type { Visning } from '../hooks/useUrlState';
import { Modal, RevisorMaerke } from './ui';

const DRIFT = [
  { id: 'forside', navn: 'Forside', ikon: Home },
  { id: 'indtaegter', navn: 'Indtægter', ikon: Briefcase },
  { id: 'fradrag', navn: 'Udgifter & fradrag', ikon: Receipt },
  { id: 'koersel', navn: 'Kørsel', ikon: Car },
  { id: 'investeringer', navn: 'Investeringer', ikon: Building2 },
];

const OVERBLIK = [
  { id: 'overblik', navn: 'Skatteoverblik', ikon: Calculator },
  { id: 'aarsopgoerelse', navn: 'Årsopgørelse', ikon: FileCheck },
  { id: 'opsparing', navn: 'Opsparing', ikon: PiggyBank },
  { id: 'statistik', navn: 'Statistik', ikon: BarChart2 },
  { id: 'dokumentation', navn: 'Dokumentation', ikon: FileText },
];

const ALLE_FANER = [...DRIFT, ...OVERBLIK];

interface Props {
  visning: Visning;
  aarListe: IndkomstAar[];
  aktivtAar: IndkomstAar | null;
  profilNavn?: string;
  visRevisor: boolean;
  kraeverLogin: boolean;
  onNaviger: (naeste: Partial<Visning>) => void;
  onProfil: () => void;
  onRevisor: () => void;
  onLogUd: () => void;
}

export function AppNavigation({
  visning, aarListe, aktivtAar, profilNavn, visRevisor, kraeverLogin,
  onNaviger, onProfil, onRevisor, onLogUd,
}: Props) {
  const [menuAaben, setMenuAaben] = useState(false);
  const aktivTitel = visning.fane === 'aar'
    ? 'Indkomstår'
    : ALLE_FANER.find((f) => f.id === visning.fane)?.navn ?? 'Forside';

  // En åben mobilmenu må ikke låse siden, når vinduet bliver bredt.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const lukPaaDesktop = () => { if (desktop.matches) setMenuAaben(false); };
    desktop.addEventListener('change', lukPaaDesktop);
    return () => desktop.removeEventListener('change', lukPaaDesktop);
  }, []);

  // Dækker også browserens tilbage/frem, mens menuen er åben.
  useEffect(() => { setMenuAaben(false); }, [visning.fane, visning.aar]);

  const gaaTil = (fane: string) => {
    setMenuAaben(false);
    onNaviger({ fane });
  };

  const vaelgAar = (aar: string) => {
    setMenuAaben(false);
    onNaviger({ aar });
  };

  const aabnProfil = () => {
    setMenuAaben(false);
    onProfil();
  };

  return (
    <>
      <header className="ikke-print sticky top-0 z-30 border-b border-rule bg-surface pt-[env(safe-area-inset-top)]">
        <div className="app-safe-inline mx-auto flex max-w-7xl items-center gap-3 py-2 lg:hidden">
          <button type="button" aria-label="revis – Forside" onClick={() => gaaTil('forside')}
            className="overgang flex min-h-11 min-w-11 shrink-0 items-center font-display text-base font-extrabold tracking-tight text-ink hover:opacity-70">
            revis
          </button>
          <div className="min-w-0 flex-1 border-l border-rule pl-3" aria-label="Aktuel side">
            <p className="truncate text-sm font-semibold text-ink">{aktivTitel}</p>
            {aktivtAar && <p className="tal text-2xs text-ink-muted">{aktivtAar.aar}{aktivtAar.laast ? ' · låst' : ''}</p>}
          </div>
          <button type="button" onClick={(event) => {
            // Safari fokuserer ikke altid knapper ved tryk. Gem et rigtigt
            // fokusmål, så dialogen kan aflevere fokus tilbage ved lukning.
            event.currentTarget.focus();
            setMenuAaben(true);
          }}
            aria-haspopup="dialog" aria-expanded={menuAaben} aria-label="Åbn menu"
            className="overgang inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[4px] border border-rule-strong px-3 text-sm font-medium text-ink hover:bg-sunk">
            <Menu aria-hidden="true" className="h-4 w-4" />
            Menu
          </button>
        </div>

        <div className="app-safe-inline mx-auto hidden max-w-7xl items-center justify-between gap-4 py-3 lg:flex">
          <button type="button" onClick={() => gaaTil('forside')}
            className="overgang flex min-h-10 shrink-0 items-baseline gap-2 hover:opacity-70">
            <span className="font-display text-base font-extrabold tracking-tight text-ink">revis</span>
            <span className="tal text-2xs text-ink-faint">B-indkomst</span>
          </button>
          <div className="flex min-w-0 items-center gap-4">
            <button type="button" onClick={aabnProfil}
              className="overgang flex min-h-10 min-w-0 items-center gap-1.5 rounded-[4px] border border-rule-strong bg-surface px-2.5 text-xs text-ink hover:bg-sunk">
              <User aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              <span className="max-w-48 truncate">{profilNavn || 'Min profil'}</span>
            </button>
            {aarListe.length > 0 && (
              <div className="flex shrink-0 items-center gap-2">
                <label htmlFor="aar-vaelger" className="text-2xs text-ink-muted">Indkomstår</label>
                <select id="aar-vaelger" value={aktivtAar?.id ?? ''} onChange={(e) => vaelgAar(e.target.value)}
                  className="tal min-h-10 rounded-[4px] border border-rule-strong bg-surface px-2 text-xs text-ink">
                  {aarListe.map((a) => <option key={a.id} value={a.id}>{a.aar}{a.laast ? ' (låst)' : ''}</option>)}
                </select>
                <button type="button" onClick={() => gaaTil('aar')}
                  className="min-h-10 whitespace-nowrap text-2xs text-ink-muted underline underline-offset-4 hover:text-ink">Administrér</button>
              </div>
            )}
            {visRevisor && (
              <button type="button" onClick={onRevisor}
                className="overgang flex min-h-10 shrink-0 items-center gap-1.5 rounded-[4px] border border-rule-strong px-2.5 text-xs font-medium text-ink hover:bg-sunk">
                <RevisorMaerke stoerrelse="sm" /> Revisor
              </button>
            )}
            {kraeverLogin && <button type="button" onClick={onLogUd}
              className="min-h-10 shrink-0 whitespace-nowrap text-2xs text-ink-muted underline underline-offset-4 hover:text-ink">Log ud</button>}
          </div>
        </div>
        <nav aria-label="Moduler" className="app-safe-inline mx-auto hidden max-w-7xl gap-4 overflow-x-auto lg:flex">
          {[DRIFT, OVERBLIK].map((faner, i) => (
            <ul key={i} className="flex shrink-0 gap-1 pb-px">
              {faner.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => gaaTil(f.id)} aria-current={visning.fane === f.id ? 'page' : undefined}
                    className={`overgang inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-xs ${visning.fane === f.id ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}>
                    <f.ikon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{f.navn}
                  </button>
                </li>
              ))}
            </ul>
          ))}
        </nav>
      </header>

      <Modal aaben={menuAaben} onLuk={() => setMenuAaben(false)} titel="Menu" bredde="max-w-lg">
        {aarListe.length > 0 && (
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-rule pb-5">
            <label htmlFor="mobil-aar-vaelger" className="text-sm font-medium text-ink">Indkomstår</label>
            <select id="mobil-aar-vaelger" value={aktivtAar?.id ?? ''} onChange={(e) => vaelgAar(e.target.value)}
              className="tal min-h-11 min-w-0 rounded-[4px] border border-rule-strong bg-surface px-3 text-base text-ink">
              {aarListe.map((a) => <option key={a.id} value={a.id}>{a.aar}{a.laast ? ' (låst)' : ''}</option>)}
            </select>
          </div>
        )}
        <nav aria-label="Mobilmenu">
          {[{ navn: 'Registrering', faner: DRIFT }, { navn: 'Årets overblik', faner: OVERBLIK }].map((gruppe) => (
            <div key={gruppe.navn} className="mb-5">
              <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-muted">{gruppe.navn}</p>
              <ul className="grid grid-cols-1 gap-1 min-[360px]:grid-cols-2">
                {gruppe.faner.map((f) => (
                  <li key={f.id} className="min-w-0">
                    <button type="button" onClick={() => gaaTil(f.id)} aria-current={visning.fane === f.id ? 'page' : undefined}
                      className={`overgang flex min-h-12 w-full items-center gap-2 rounded-[4px] border px-3 py-2 text-left text-sm ${visning.fane === f.id ? 'border-rule-strong bg-sunk font-semibold text-ink' : 'border-transparent text-ink-muted hover:bg-sunk hover:text-ink'}`}>
                      <f.ikon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span>{f.navn}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="space-y-1 border-t border-rule pt-3">
            <button type="button" onClick={() => gaaTil('aar')} aria-current={visning.fane === 'aar' ? 'page' : undefined}
              className="flex min-h-12 w-full items-center gap-2 rounded-[4px] px-3 text-left text-sm text-ink hover:bg-sunk">
              <Settings2 aria-hidden="true" className="h-4 w-4 shrink-0" />Administrér indkomstår
            </button>
            <button type="button" onClick={aabnProfil}
              className="flex min-h-12 w-full items-center gap-2 rounded-[4px] px-3 text-left text-sm text-ink hover:bg-sunk">
              <User aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">Min profil</span><ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
            {kraeverLogin && <button type="button" onClick={() => { setMenuAaben(false); onLogUd(); }}
              className="flex min-h-12 w-full items-center gap-2 rounded-[4px] px-3 text-left text-sm text-ink-muted hover:bg-sunk hover:text-ink">
              <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />Log ud
            </button>}
          </div>
        </nav>
      </Modal>
    </>
  );
}
