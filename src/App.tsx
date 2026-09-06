/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Receipt,
  FileText,
  FileCheck2,
  PiggyBank,
  BarChart3,
  Layers,
  MapPin,
  Sparkles,
  MessageSquare,
  ChevronDown,
  Plus,
  Compass,
  CheckCircle2,
  Calendar,
  Building,
  ShieldCheck
} from 'lucide-react';
import {
  IndkomstAar,
  Job,
  Fradrag,
  Investering,
  OpsparingsTracker,
  AiExtractionResult,
  TransportMiddel
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
import { PlanningRoadmapView } from './components/PlanningRoadmapView';
import { AiBilagScannerModal } from './components/AiBilagScannerModal';
import { RevisorChatModal } from './components/RevisorChatModal';
import { GlobalSidebar } from './components/GlobalSidebar';

export default function App() {
  // Persistence state
  const [indkomstAarList, setIndkomstAarList] = useState<IndkomstAar[]>(() => {
    const saved = localStorage.getItem('revisor_aar_list');
    return saved ? JSON.parse(saved) : INITIAL_INDKOMSTAAR;
  });

  const [activeAarId, setActiveAarId] = useState<string>('aar-2026');

  const [jobs, setJobs] = useState<Job[]>(() => {
    const saved = localStorage.getItem('revisor_jobs');
    return saved ? JSON.parse(saved) : INITIAL_JOBS;
  });

  const [fradragList, setFradragList] = useState<Fradrag[]>(() => {
    const saved = localStorage.getItem('revisor_fradrag');
    return saved ? JSON.parse(saved) : INITIAL_FRADRAG;
  });

  const [investeringer, setInvesteringer] = useState<Investering[]>(() => {
    const saved = localStorage.getItem('revisor_investeringer');
    return saved ? JSON.parse(saved) : INITIAL_INVESTERINGER;
  });

  const [opsparinger, setOpsparinger] = useState<Record<string, OpsparingsTracker>>(() => {
    const saved = localStorage.getItem('revisor_opsparing');
    return saved ? JSON.parse(saved) : INITIAL_OPSPARING;
  });

  // UI state
  const [activeTab, setActiveTab] = useState<string>('jobs');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('revisor_aar_list', JSON.stringify(indkomstAarList));
  }, [indkomstAarList]);

  useEffect(() => {
    localStorage.setItem('revisor_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('revisor_fradrag', JSON.stringify(fradragList));
  }, [fradragList]);

  useEffect(() => {
    localStorage.setItem('revisor_investeringer', JSON.stringify(investeringer));
  }, [investeringer]);

  useEffect(() => {
    localStorage.setItem('revisor_opsparing', JSON.stringify(opsparinger));
  }, [opsparinger]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find active year
  const activeIndkomstAar =
    indkomstAarList.find((a) => a.id === activeAarId) || indkomstAarList[0];

  // Filter items for current year
  const yearJobs = jobs.filter((j) => j.indkomstAarId === activeIndkomstAar.id);
  const yearFradrag = fradragList.filter((f) => f.indkomstAarId === activeIndkomstAar.id);
  const yearInvesteringer = investeringer.filter((i) => i.indkomstAarId === activeIndkomstAar.id);
  const activeOpsparing: OpsparingsTracker = opsparinger[activeIndkomstAar.id] || {
    indbetaltTilSkat: 0,
    opsparetPrivat: 0,
  };

  // Run deterministic Danish Tax Engine
  const skatteBeregning = calculateSkatOgFradrag(
    activeIndkomstAar,
    yearJobs,
    yearFradrag
  );

  // Handlers for Jobs
  const handleAddJob = (jobData: Omit<Job, 'id'>) => {
    const newJob: Job = {
      ...jobData,
      id: `job-${Date.now()}`,
    };
    setJobs((prev) => [newJob, ...prev]);
    showToast(`Job "${newJob.hvervgiver}" tilføjet!`);
  };

  const handleUpdateJob = (id: string, updates: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
    showToast('Job opdateret!');
  };

  const handleDeleteJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    showToast('Job slettet');
  };

  // Handlers for Fradrag
  const handleAddFradrag = (fradragData: Omit<Fradrag, 'id'>) => {
    const newF: Fradrag = {
      ...fradragData,
      id: `fradrag-${Date.now()}`,
    };
    setFradragList((prev) => [newF, ...prev]);
    showToast(`Fradrag "${newF.beskrivelse}" tilføjet!`);
  };

  const handleUpdateFradrag = (id: string, updates: Partial<Fradrag>) => {
    setFradragList((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    showToast('Fradrag opdateret!');
  };

  const handleDeleteFradrag = (id: string) => {
    setFradragList((prev) => prev.filter((f) => f.id !== id));
    showToast('Fradrag slettet');
  };

  // Handlers for Investeringer
  const handleAddInvestering = (invData: Omit<Investering, 'id'>) => {
    const newInv: Investering = {
      ...invData,
      id: `inv-${Date.now()}`,
    };
    setInvesteringer((prev) => [newInv, ...prev]);
    showToast(`Investering "${newInv.titel}" registreret!`);
  };

  const handleDeleteInvestering = (id: string) => {
    setInvesteringer((prev) => prev.filter((i) => i.id !== id));
    showToast('Investering slettet');
  };

  // Handler for Opsparing
  const handleUpdateOpsparing = (updatedData: OpsparingsTracker) => {
    setOpsparinger((prev) => ({
      ...prev,
      [activeIndkomstAar.id]: updatedData,
    }));
    showToast('Opsparingstal opdateret!');
  };

  // Handle AI Scanner Extraction
  const handleApplyAiResult = (res: AiExtractionResult, rawFile?: File) => {
    if (res.classification === 'JOB') {
      const data = res.job;
      if (data) {
        handleAddJob({
          indkomstAarId: activeIndkomstAar.id,
          hvervgiver: data.hvervgiver || 'Ubekendt kunde',
          honorar: Number(data.honorar) || 0,
          startDato: data.startDato || new Date().toISOString().split('T')[0],
          slutDato: data.slutDato || data.startDato || new Date().toISOString().split('T')[0],
          betalingsDato: data.betalingsDato || data.startDato || new Date().toISOString().split('T')[0],
          transportmiddel: (data.transportmiddel as TransportMiddel) || 'NONE',
          antalKm: Number(data.antalKm) || 0,
          antalTure: 1,
          destinationAdresse: data.destinationAdresse || '',
          koerselsFradrag: Number(data.koerselsFradrag) || 0,
          amBidragFritaget: Boolean(data.amBidragFritaget),
          timerJob: Number(data.timerJob) || 4,
          timerTransportForberedelse: Number(data.timerTransportForberedelse) || 2,
          type: data.type || 'Musik & Scene',
          bilagNavne: rawFile ? [rawFile.name] : ['Scannet_bilag.pdf'],
          noter: res.revisorNotat || res.summary || 'Automatisk scannet med Revisor AI.',
        });
        setActiveTab('jobs');
      }
    } else if (res.classification === 'INVESTERING') {
      const data = res.investering;
      if (data) {
        handleAddInvestering({
          indkomstAarId: activeIndkomstAar.id,
          titel: data.titel || 'Nyt anlægsaktiv',
          beloeb: Number(data.beloeb) || 0,
          fakturaDato: data.fakturaDato || new Date().toISOString().split('T')[0],
          bilagNavne: rawFile ? [rawFile.name] : ['Scannet_investering.pdf'],
        });
        setActiveTab('investeringer');
      }
    } else {
      const data = res.fradrag;
      if (data) {
        handleAddFradrag({
          indkomstAarId: activeIndkomstAar.id,
          beskrivelse: data.beskrivelse || 'Kvittering',
          typeKategori: data.typeKategori || 'Udstyr',
          fakturaDato: data.fakturaDato || new Date().toISOString().split('T')[0],
          fakturaBeloeb: Number(data.fakturaBeloeb) || 0,
          fradragsProcent: Number(data.fradragsProcent) || 100,
          fradragIDKK: Number(data.fradragIDKK) || Number(data.fakturaBeloeb) || 0,
          bilagNavne: rawFile ? [rawFile.name] : ['Scannet_kvittering.pdf'],
          revisorNotat: res.revisorNotat || res.summary || 'Godkendt via AI scanning i Rubrik 29.',
        });
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
    { id: 'roadmap', label: 'Plan & Roadmap', icon: Compass },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-950 text-white flex items-center justify-center font-bold font-mono shadow-xs">
              <span className="text-amber-300 text-sm">RAI</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-stone-900">
                  Revisor AI
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                  B-indkomst & Fradrag
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Fra bilag til skat, årsopgørelse og kørsel
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
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
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Scan Bilag</span>
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

            {activeTab === 'roadmap' && (
              <PlanningRoadmapView />
            )}
          </div>

          {/* Right Global Sidebar (only when not in roadmap view) */}
          {activeTab !== 'roadmap' && (
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
          )}
        </div>
      </main>

      {/* AI Scanner Modal */}
      <AiBilagScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApplyResult={handleApplyAiResult}
      />

      {/* Revisor AI Chat Modal */}
      <RevisorChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        indkomstAar={activeIndkomstAar}
        jobs={yearJobs}
        fradragList={yearFradrag}
        skatteBeregning={skatteBeregning}
      />
    </div>
  );
}

