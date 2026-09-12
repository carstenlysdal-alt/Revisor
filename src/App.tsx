/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Receipt,
  FileText,
  FileCheck2,
  PiggyBank,
  BarChart3,
  Layers,
  Inbox,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Settings
} from 'lucide-react';
import {
  IndkomstAar,
  Job,
  Fradrag,
  Investering,
  OpsparingsTracker,
  AiExtractionResult
} from './types';
import {
  INITIAL_INDKOMSTAAR,
  INITIAL_JOBS,
  INITIAL_FRADRAG,
  INITIAL_INVESTERINGER,
  INITIAL_OPSPARING
} from './data/initialData';
import { calculateSkatOgFradrag } from './utils/taxCalculator';
import { JobsModule } from './components/JobsModule';
import { FradragModule } from './components/FradragModule';
import { InvesteringerModule } from './components/InvesteringerModule';
import { SkatOverblikModule } from './components/SkatOverblikModule';
import { AarsopgoerelseModule } from './components/AarsopgoerelseModule';
import { OpsparingTrackerModule } from './components/OpsparingTrackerModule';
import { StatistikModule } from './components/StatistikModule';
import { AiBilagScannerModal } from './components/AiBilagScannerModal';
import { RevisorChatModal } from './components/RevisorChatModal';
import { GlobalSidebar } from './components/GlobalSidebar';
import { AarIndstillingerModule } from './components/AarIndstillingerModule';
import { createId, loadStoredValue, saveStoredValue } from './utils/storage';
import { calculateJobKoerselsfradrag } from './utils/mileageCalculator';
import { saveDocument } from './utils/documentStore';
import { isAppData, loadAppData, saveAppData, type AppData } from './utils/appDatabase';
import { DataBackupControls } from './components/DataBackupControls';
import { isCompleteAiSuggestion } from './utils/aiValidation';
import { YearArchiveControls } from './components/YearArchiveControls';

const DEFAULT_APP_DATA: AppData = {
  activeAarId: INITIAL_INDKOMSTAAR[0]!.id,
  indkomstAarList: INITIAL_INDKOMSTAAR,
  jobs: INITIAL_JOBS,
  fradragList: INITIAL_FRADRAG,
  investeringer: INITIAL_INVESTERINGER,
  opsparinger: INITIAL_OPSPARING,
};

function loadLegacyAppData(): { data: AppData; isValid: boolean } {
  const indkomstAarList = loadStoredValue<IndkomstAar[]>('revisor_aar_list', INITIAL_INDKOMSTAAR);
  const storedActiveAarId = loadStoredValue('revisor_active_aar', indkomstAarList[0]?.id ?? DEFAULT_APP_DATA.activeAarId);
  const candidate: AppData = {
    activeAarId: indkomstAarList.some((year) => year.id === storedActiveAarId)
      ? storedActiveAarId
      : indkomstAarList[0]?.id ?? DEFAULT_APP_DATA.activeAarId,
    indkomstAarList,
    jobs: loadStoredValue<Job[]>('revisor_jobs', INITIAL_JOBS),
    fradragList: loadStoredValue<Fradrag[]>('revisor_fradrag', INITIAL_FRADRAG),
    investeringer: loadStoredValue<Investering[]>('revisor_investeringer', INITIAL_INVESTERINGER),
    opsparinger: loadStoredValue<Record<string, OpsparingsTracker>>('revisor_opsparing', INITIAL_OPSPARING),
  };
  return isAppData(candidate) ? { data: candidate, isValid: true } : { data: DEFAULT_APP_DATA, isValid: false };
}

const LEGACY_APP_DATA = loadLegacyAppData();

export default function App() {
  // Persistence state
  const [indkomstAarList, setIndkomstAarList] = useState<IndkomstAar[]>(() => {
    return LEGACY_APP_DATA.data.indkomstAarList;
  });

  const [activeAarId, setActiveAarId] = useState<string>(() =>
    LEGACY_APP_DATA.data.activeAarId,
  );

  const [jobs, setJobs] = useState<Job[]>(() => {
    return LEGACY_APP_DATA.data.jobs;
  });

  const [fradragList, setFradragList] = useState<Fradrag[]>(() => {
    return LEGACY_APP_DATA.data.fradragList;
  });

  const [investeringer, setInvesteringer] = useState<Investering[]>(() => {
    return LEGACY_APP_DATA.data.investeringer;
  });

  const [opsparinger, setOpsparinger] = useState<Record<string, OpsparingsTracker>>(() => {
    return LEGACY_APP_DATA.data.opsparinger;
  });

  // UI state
  const [activeTab, setActiveTab] = useState<string>(() =>
    LEGACY_APP_DATA.isValid ? 'jobs' : 'indstillinger',
  );
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  // Sync state to LocalStorage
  useEffect(() => {
    if (!saveStoredValue('revisor_aar_list', indkomstAarList)) showToast('Kunne ikke gemme indkomståret lokalt.');
  }, [indkomstAarList]);

  useEffect(() => {
    if (!saveStoredValue('revisor_jobs', jobs)) showToast('Kunne ikke gemme jobs lokalt.');
  }, [jobs]);

  useEffect(() => {
    if (!saveStoredValue('revisor_fradrag', fradragList)) showToast('Kunne ikke gemme fradrag lokalt.');
  }, [fradragList]);

  useEffect(() => {
    if (!saveStoredValue('revisor_investeringer', investeringer)) showToast('Kunne ikke gemme investeringer lokalt.');
  }, [investeringer]);

  useEffect(() => {
    if (!saveStoredValue('revisor_opsparing', opsparinger)) showToast('Kunne ikke gemme opsparing lokalt.');
  }, [opsparinger]);

  useEffect(() => {
    saveStoredValue('revisor_active_aar', activeAarId);
  }, [activeAarId]);

  const appData = useMemo<AppData>(() => ({
    activeAarId,
    indkomstAarList,
    jobs,
    fradragList,
    investeringer,
    opsparinger,
  }), [activeAarId, indkomstAarList, jobs, fradragList, investeringer, opsparinger]);

  useEffect(() => {
    let isCancelled = false;
    loadAppData()
      .then((storedData) => {
        if (isCancelled) return;
        if (storedData) {
          setIndkomstAarList(storedData.indkomstAarList);
          setJobs(storedData.jobs);
          setFradragList(storedData.fradragList);
          setInvesteringer(storedData.investeringer);
          setOpsparinger(storedData.opsparinger);
          setActiveAarId(storedData.activeAarId);
        }
        setDatabaseStatus('ready');
      })
      .catch(() => {
        if (!isCancelled) setDatabaseStatus('fallback');
      });
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    if (databaseStatus !== 'ready') return;
    const timer = window.setTimeout(() => {
      saveAppData(appData).catch(() => {
        setDatabaseStatus('fallback');
        showToast('Databasen kunne ikke gemme. Data spejles fortsat i browserlageret.');
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [appData, databaseStatus]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find active year
  const activeIndkomstAar =
    indkomstAarList.find((a) => a.id === activeAarId) ?? indkomstAarList[0] ?? INITIAL_INDKOMSTAAR[0]!;

  // Filter items for current year
  const yearJobs = jobs.filter((j) => j.indkomstAarId === activeIndkomstAar.id);
  const yearFradrag = fradragList.filter((f) => f.indkomstAarId === activeIndkomstAar.id);
  const yearInvesteringer = investeringer.filter((i) => i.indkomstAarId === activeIndkomstAar.id);
  const activeOpsparing: OpsparingsTracker = opsparinger[activeIndkomstAar.id] || {
    indbetaltTilSkat: 0,
    opsparetPrivat: 0,
  };

  // Run deterministic Danish Tax Engine
  const skatteBeregning = useMemo(
    () => calculateSkatOgFradrag(activeIndkomstAar, yearJobs, yearFradrag),
    [activeIndkomstAar, yearJobs, yearFradrag],
  );

  const canEditActiveYear = () => {
    if (!activeIndkomstAar.laast) return true;
    showToast(`Indkomståret ${activeIndkomstAar.aar} er låst.`);
    return false;
  };

  // Handlers for Jobs
  const handleAddJob = (jobData: Omit<Job, 'id'>) => {
    if (!canEditActiveYear()) return;
    const newJob: Job = {
      ...jobData,
      id: createId('job'),
    };
    setJobs((prev) => [newJob, ...prev]);
    showToast(`Job "${newJob.hvervgiver}" tilføjet!`);
  };

  const handleUpdateJob = (id: string, updates: Partial<Job>) => {
    if (!canEditActiveYear()) return;
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
    showToast('Job opdateret!');
  };

  const handleDeleteJob = (id: string) => {
    if (!canEditActiveYear()) return;
    const job = jobs.find((item) => item.id === id);
    if (!window.confirm(`Vil du slette ${job?.hvervgiver || 'dette job'}?`)) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
    showToast('Job slettet');
  };

  // Handlers for Fradrag
  const handleAddFradrag = (fradragData: Omit<Fradrag, 'id'>) => {
    if (!canEditActiveYear()) return;
    const newF: Fradrag = {
      ...fradragData,
      id: createId('fradrag'),
    };
    setFradragList((prev) => [newF, ...prev]);
    showToast(`Fradrag "${newF.beskrivelse}" tilføjet!`);
  };

  const handleUpdateFradrag = (id: string, updates: Partial<Fradrag>) => {
    if (!canEditActiveYear()) return;
    setFradragList((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    showToast('Fradrag opdateret!');
  };

  const handleDeleteFradrag = (id: string) => {
    if (!canEditActiveYear()) return;
    const fradrag = fradragList.find((item) => item.id === id);
    if (!window.confirm(`Vil du slette ${fradrag?.beskrivelse || 'dette fradrag'}?`)) return;
    setFradragList((prev) => prev.filter((f) => f.id !== id));
    showToast('Fradrag slettet');
  };

  // Handlers for Investeringer
  const handleAddInvestering = (invData: Omit<Investering, 'id'>) => {
    if (!canEditActiveYear()) return;
    const newInv: Investering = {
      ...invData,
      id: createId('inv'),
    };
    setInvesteringer((prev) => [newInv, ...prev]);
    showToast(`Investering "${newInv.titel}" registreret!`);
  };

  const handleDeleteInvestering = (id: string) => {
    if (!canEditActiveYear()) return;
    const investering = investeringer.find((item) => item.id === id);
    if (!window.confirm(`Vil du slette ${investering?.titel || 'denne investering'}?`)) return;
    setInvesteringer((prev) => prev.filter((i) => i.id !== id));
    showToast('Investering slettet');
  };

  // Handler for Opsparing
  const handleUpdateOpsparing = (updatedData: OpsparingsTracker) => {
    if (!canEditActiveYear()) return;
    setOpsparinger((prev) => ({
      ...prev,
      [activeIndkomstAar.id]: updatedData,
    }));
    showToast('Opsparingstal opdateret!');
  };

  const handleUpdateIndkomstAar = (updates: Partial<IndkomstAar>) => {
    setIndkomstAarList((current) => current.map((aar) =>
      aar.id === activeIndkomstAar.id ? { ...aar, ...updates } : aar,
    ));
    showToast('Indkomståret er opdateret.');
  };

  const handleAddIndkomstAar = (aar: number) => {
    if (indkomstAarList.some((item) => item.aar === aar)) return;
    const id = createId(`aar-${aar}`);
    const newYear: IndkomstAar = {
      ...activeIndkomstAar,
      id,
      aar,
      laast: false,
      forventetAIndkomst: 0,
      forventetPensionSUDagpenge: 0,
      forventedeFradragAIndkomst: 0,
    };
    setIndkomstAarList((current) => [...current, newYear].sort((a, b) => b.aar - a.aar));
    setActiveAarId(id);
  };

  const handleImportData = (data: AppData) => {
    setIndkomstAarList(data.indkomstAarList);
    setJobs(data.jobs);
    setFradragList(data.fradragList);
    setInvesteringer(data.investeringer);
    setOpsparinger(data.opsparinger);
    setActiveAarId(data.activeAarId);
    setActiveTab('jobs');
  };

  // Handle AI Scanner Extraction
  const handleApplyAiResult = async (
    res: AiExtractionResult,
    rawFile: File | undefined,
    targetYearId: string,
    sourceText: string | undefined,
  ) => {
    if (!isCompleteAiSuggestion(res)) throw new Error('Agentforslaget mangler nødvendige eller gyldige oplysninger.');
    const targetYear = indkomstAarList.find((year) => year.id === targetYearId);
    if (!targetYear) throw new Error('Det valgte indkomstår findes ikke.');
    if (targetYear.laast) throw new Error(`Indkomståret ${targetYear.aar} er låst.`);
    let bilagId: string | undefined;
    if (rawFile) {
      try { bilagId = await saveDocument(rawFile); }
      catch { showToast('Posten gemmes, men originalbilaget kunne ikke lagres i browseren.'); }
    }
    if (res.classification === 'JOB') {
      const data = res.job;
      if (data) {
        const job: Job = {
          id: createId('job'),
          indkomstAarId: targetYear.id,
          hvervgiver: data.hvervgiver || 'Ubekendt kunde',
          honorar: Number(data.honorar) || 0,
          startDato: data.startDato || new Date().toISOString().slice(0, 10),
          slutDato: data.slutDato || data.startDato || new Date().toISOString().slice(0, 10),
          betalingsDato: data.betalingsDato || data.startDato || new Date().toISOString().slice(0, 10),
          transportmiddel: data.transportmiddel || 'NONE',
          antalKm: Number(data.antalKm) || 0,
          antalTure: Number(data.antalTure) || 1,
          destinationAdresse: data.destinationAdresse || '',
          koerselsFradrag: calculateJobKoerselsfradrag(targetYear.aar, data.transportmiddel || 'NONE', Number(data.antalKm) || 0, Number(data.antalTure) || 0),
          amBidragFritaget: Boolean(data.amBidragFritaget),
          timerJob: data.timerJob === undefined ? undefined : Number(data.timerJob),
          timerTransportForberedelse: data.timerTransportForberedelse === undefined ? undefined : Number(data.timerTransportForberedelse),
          type: data.type,
          bilagNavne: rawFile ? [rawFile.name] : undefined,
          bilagIds: bilagId ? [bilagId] : undefined,
          kildeTekst: sourceText,
          noter: res.revisorNotat || res.summary || 'Automatisk scannet med Revisor AI.',
          rubrik: data.rubrik || 12,
          status: 'PLANLAGT',
        };
        setJobs((current) => [job, ...current]);
        showToast(`Job "${job.hvervgiver}" tilføjet til ${targetYear.aar}.`);
        setActiveAarId(targetYear.id);
        setActiveTab('jobs');
      }
    } else if (res.classification === 'INVESTERING') {
      const data = res.investering;
      if (data) {
        const investering: Investering = {
          id: createId('inv'),
          indkomstAarId: targetYear.id,
          titel: data.titel || 'Nyt anlægsaktiv',
          beloeb: Number(data.beloeb) || 0,
          fakturaDato: data.fakturaDato || new Date().toISOString().slice(0, 10),
          bilagNavne: rawFile ? [rawFile.name] : undefined,
          bilagIds: bilagId ? [bilagId] : undefined,
          kildeTekst: sourceText,
        };
        setInvesteringer((current) => [investering, ...current]);
        showToast(`Investering "${investering.titel}" registreret i ${targetYear.aar}.`);
        setActiveAarId(targetYear.id);
        setActiveTab('investeringer');
      }
    } else if (res.classification === 'FRADRAG') {
      const data = res.fradrag;
      if (data) {
        const fradrag: Fradrag = {
          id: createId('fradrag'),
          indkomstAarId: targetYear.id,
          beskrivelse: data.beskrivelse || 'Kvittering',
          typeKategori: data.typeKategori || 'Udstyr',
          fakturaDato: data.fakturaDato || new Date().toISOString().slice(0, 10),
          fakturaBeloeb: Number(data.fakturaBeloeb) || 0,
          fradragsProcent: Number(data.fradragsProcent) || 0,
          fradragIDKK: Math.round((Number(data.fakturaBeloeb) || 0) * (Number(data.fradragsProcent) || 0) / 100),
          bilagNavne: rawFile ? [rawFile.name] : undefined,
          bilagIds: bilagId ? [bilagId] : undefined,
          kildeTekst: sourceText,
          revisorNotat: res.revisorNotat || res.summary || 'Godkendt via AI scanning i Rubrik 29.',
        };
        setFradragList((current) => [fradrag, ...current]);
        showToast(`Fradrag "${fradrag.beskrivelse}" tilføjet til ${targetYear.aar}.`);
        setActiveAarId(targetYear.id);
        setActiveTab('fradrag');
      }
    }
  };

  const navTabs = [
    { id: 'jobs', label: 'Jobs & Kørsel', icon: Briefcase, count: yearJobs.length },
    { id: 'fradrag', label: 'Fradrag (Rubrik 29)', icon: Receipt, count: yearFradrag.length },
    { id: 'skat-overblik', label: 'Skat Overblik', icon: FileText },
    { id: 'aarsopgoerelse', label: 'Årsopgørelse', icon: FileCheck2 },
    { id: 'opsparing', label: 'Sæt til side', icon: PiggyBank },
    { id: 'statistik', label: 'Statistik & Timer', icon: BarChart3 },
    { id: 'investeringer', label: 'Investeringer', icon: Layers, count: yearInvesteringer.length },
    { id: 'indstillinger', label: 'Indkomstår', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-fade-in border border-stone-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 py-3 sm:min-h-16 sm:flex-nowrap sm:py-0">
          {/* Logo & Title */}
          <button type="button" onClick={() => setActiveTab('jobs')} className="flex items-center gap-3 text-left" aria-label="Gå til forsiden">
            <div className="w-9 h-9 rounded-xl bg-stone-950 text-white flex items-center justify-center font-bold font-mono shadow-xs">
              <span className="text-amber-300 text-sm">RAI</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-stone-900">
                  Revisor AI
                </h1>
                <span className="hidden text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 md:inline">
                  B-indkomst & Fradrag
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Fra bilag til skat, årsopgørelse og kørsel
              </p>
            </div>
          </button>

          {/* Right Header Actions */}
          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:gap-3 sm:overflow-visible sm:pb-0">
            <span
              className={`hidden xl:inline-flex items-center gap-1.5 text-[10px] font-semibold ${databaseStatus === 'fallback' ? 'text-amber-700' : 'text-stone-500'}`}
              title={databaseStatus === 'ready' ? 'Data gemmes i lokal IndexedDB' : 'Database ikke tilgængelig; bruger browserlager'}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${databaseStatus === 'ready' ? 'bg-emerald-500' : databaseStatus === 'fallback' ? 'bg-amber-500' : 'bg-stone-300'}`} />
              {databaseStatus === 'ready' ? 'Lokal database' : databaseStatus === 'fallback' ? 'Browserlager' : 'Åbner database'}
            </span>
            <DataBackupControls appData={appData} onImport={handleImportData} onMessage={showToast} />
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-semibold text-stone-700 text-[11px] hidden sm:inline">År:</span>
              <select
                value={activeAarId}
                onChange={(e) => setActiveAarId(e.target.value)}
                className="bg-transparent font-bold text-stone-900 text-xs focus:outline-hidden cursor-pointer"
              >
                {indkomstAarList.map((aar) => (
                  <option key={aar.id} value={aar.id}>
                    {aar.aar} ({aar.kommune})
                  </option>
                ))}
              </select>
            </div>

            {/* AI Scanner Button */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              <Inbox className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Agentindbakke</span>
            </button>

            {/* Revisor Chat Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200/70 text-stone-800 border border-stone-200 rounded-lg text-xs font-semibold transition"
            >
              <MessageSquare className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">Revisor Chat</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
          <nav className="flex space-x-1 border-t border-stone-100 pt-1 pb-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-stone-500'}`} />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-stone-700 text-stone-100'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Active Tab View */}
          <div className="flex-1 min-w-0">
            {activeTab === 'jobs' && (
              <JobsModule
                jobs={yearJobs}
                indkomstAar={activeIndkomstAar}
                onAddJob={handleAddJob}
                onUpdateJob={handleUpdateJob}
                onDeleteJob={handleDeleteJob}
                onOpenAiScanner={() => setIsScannerOpen(true)}
              />
            )}

            {activeTab === 'fradrag' && (
              <FradragModule
                fradragList={yearFradrag}
                indkomstAar={activeIndkomstAar}
                skatteBeregning={skatteBeregning}
                onAddFradrag={handleAddFradrag}
                onUpdateFradrag={handleUpdateFradrag}
                onDeleteFradrag={handleDeleteFradrag}
                onOpenAiScanner={() => setIsScannerOpen(true)}
              />
            )}

            {activeTab === 'skat-overblik' && (
              <SkatOverblikModule
                indkomstAar={activeIndkomstAar}
                skatteBeregning={skatteBeregning}
              />
            )}

            {activeTab === 'aarsopgoerelse' && (
              <AarsopgoerelseModule
                skatteBeregning={skatteBeregning}
                indkomstAar={activeIndkomstAar}
              />
            )}

            {activeTab === 'opsparing' && (
              <OpsparingTrackerModule
                indkomstAar={activeIndkomstAar}
                skatteBeregning={skatteBeregning}
                opsparing={activeOpsparing}
                onUpdateOpsparing={handleUpdateOpsparing}
              />
            )}

            {activeTab === 'statistik' && (
              <StatistikModule
                jobs={yearJobs}
                indkomstAar={activeIndkomstAar}
              />
            )}

            {activeTab === 'investeringer' && (
              <InvesteringerModule
                investeringer={yearInvesteringer}
                indkomstAar={activeIndkomstAar}
                onAddInvestering={handleAddInvestering}
                onDeleteInvestering={handleDeleteInvestering}
              />
            )}

            {activeTab === 'indstillinger' && (
              <div className="space-y-6">
                <AarIndstillingerModule
                  indkomstAar={activeIndkomstAar}
                  existingYears={indkomstAarList.map((item) => item.aar)}
                  onUpdate={handleUpdateIndkomstAar}
                  onAddYear={handleAddIndkomstAar}
                />
                <YearArchiveControls
                  appData={appData}
                  yearId={activeIndkomstAar.id}
                  year={activeIndkomstAar.aar}
                  onRestore={(data) => {
                    handleImportData(data);
                    setActiveTab('indstillinger');
                  }}
                  onMessage={showToast}
                />
              </div>
            )}

          </div>

          {/* Right Global Sidebar (only when not in roadmap view) */}
          <GlobalSidebar
              activeIndkomstAar={activeIndkomstAar}
              allIndkomstAar={indkomstAarList}
              allJobs={jobs}
              allFradrag={fradragList}
              activeSkatteBeregning={skatteBeregning}
              activeOpsparing={activeOpsparing}
              onOpenAiScanner={() => setIsScannerOpen(true)}
              onOpenRevisorChat={() => setIsChatOpen(true)}
              onSelectTab={(tab) => setActiveTab(tab)}
          />
        </div>
      </main>

      {/* AI Scanner Modal */}
      <AiBilagScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApplyResult={handleApplyAiResult}
        activeIndkomstAar={activeIndkomstAar}
        indkomstAarList={indkomstAarList}
      />

      {/* Revisor AI Chat Modal */}
      <RevisorChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        indkomstAar={activeIndkomstAar}
        jobs={yearJobs}
        skatteBeregning={skatteBeregning}
      />
    </div>
  );
}
