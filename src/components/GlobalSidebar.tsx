import React from 'react';
import {
  Inbox,
  TrendingUp,
  ShieldAlert,
  MessageSquare,
  UploadCloud,
  ChevronRight
} from 'lucide-react';
import { IndkomstAar, Job, Fradrag, SkatteBeregningResultat, OpsparingsTracker } from '../types';
import { getSkatteRegler } from '../data/danishTaxData';
import { calculateAaretsKoerselsfradrag } from '../utils/mileageCalculator';

interface Props {
  activeIndkomstAar: IndkomstAar;
  allIndkomstAar: IndkomstAar[];
  allJobs: Job[];
  allFradrag: Fradrag[];
  activeSkatteBeregning: SkatteBeregningResultat;
  activeOpsparing: OpsparingsTracker;
  onOpenAiScanner: () => void;
  onOpenRevisorChat: () => void;
  onSelectTab: (tab: string) => void;
}

export const GlobalSidebar: React.FC<Props> = ({
  activeIndkomstAar,
  allIndkomstAar,
  allJobs,
  allFradrag,
  activeSkatteBeregning,
  activeOpsparing,
  onOpenAiScanner,
  onOpenRevisorChat,
  onSelectTab,
}) => {
  const regler = getSkatteRegler(activeIndkomstAar.aar);
  // Compute accumulated gains across ALL years
  const koerselsfradragAllYears = allIndkomstAar.reduce((sum, indkomstAar) => {
    const aaretsJobs = allJobs.filter((job) => job.indkomstAarId === indkomstAar.id);
    const resultat = calculateAaretsKoerselsfradrag(indkomstAar.aar, aaretsJobs);
    return sum + resultat.rubrik29 + resultat.rubrik51;
  }, 0);
  const samletFradragAllYears = allFradrag.reduce((sum, fradrag) => sum + (Number(fradrag.fradragIDKK) || 0), 0)
    + koerselsfradragAllYears;
  
  const skatOgAmTotal = activeSkatteBeregning.samletSkatOgAM;
  const daekketTotal = (activeOpsparing.indbetaltTilSkat || 0) + (activeOpsparing.opsparetPrivat || 0);
  const manglerOpsparing = Math.max(0, skatOgAmTotal - daekketTotal);

  return (
    <aside className="w-full lg:w-72 space-y-4 shrink-0">
      {/* AI Quick Upload Button */}
      <div className="bg-stone-900 text-white rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Inbox className="w-4 h-4" />
          Revisoragentens indbakke
        </div>
        <h4 className="font-bold text-sm text-white leading-snug">
          Fortæl det én gang
        </h4>
        <p className="text-xs text-stone-300 mt-1 leading-relaxed">
          Diktér, skriv eller upload et bilag. Agenten foreslår selv den rette placering og felterne til din godkendelse.
        </p>
        <button
          type="button"
          onClick={onOpenAiScanner}
          className="mt-4 w-full py-2.5 px-4 bg-white text-stone-900 hover:bg-stone-100 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
        >
          <UploadCloud className="w-4 h-4 text-stone-900" />
          Åbn agentindbakke
        </button>
      </div>

      {/* Accumulated Gain Widget (Gevinst-widget) */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 text-stone-800 text-xs font-bold uppercase tracking-wider mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Akkumuleret Gevinst
        </div>
        <div className="space-y-2.5 pt-1">
          <div>
            <span className="text-[11px] text-stone-500 block">Opnåede fradrag i alt:</span>
            <span className="text-lg font-bold font-mono text-stone-900">
              {samletFradragAllYears.toLocaleString('da-DK')} DKK
            </span>
          </div>
          <p className="text-[11px] text-stone-500">Fradragets faktiske skatteværdi afhænger af din samlede indkomst og beregnes ikke som en fast procent.</p>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-400">
          Opgjort på tværs af alle registrerede år.
        </div>
      </div>

      {/* Warning widget if savings are insufficient */}
      {manglerOpsparing > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-red-950 block">
                Utilstrækkelig opsparing!
              </span>
              <p className="text-red-800 mt-1 leading-relaxed">
                Du mangler at afsætte <strong>{manglerOpsparing.toLocaleString('da-DK')} DKK</strong> til B-skat og AM-bidrag for {activeIndkomstAar.aar}.
              </p>
              <button
                type="button"
                onClick={() => onSelectTab('opsparing')}
                className="mt-2.5 text-xs font-semibold text-red-900 hover:text-red-950 underline flex items-center gap-1"
              >
                Se detaljer i opsparings-trackeren
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask AI Revisor Chat Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-xs mb-1.5">
          <MessageSquare className="w-4 h-4 text-stone-700" />
          Spørg din Revisor AI
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Er du i tvivl om Rubrik 29, kørselstakster eller momsfritagelse for musikere og freelancere?
        </p>
        <button
          type="button"
          onClick={onOpenRevisorChat}
          className="mt-3.5 w-full py-2 px-3 bg-stone-100 hover:bg-stone-200/80 text-stone-900 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-stone-200"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Åbn Revisor AI Chat
        </button>
      </div>

      {/* Kommune & Skattesatser Box */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Bopælskommune:</span>
          <span className="font-semibold text-stone-800">{activeIndkomstAar.kommune}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Kommuneskat:</span>
          <span className="font-mono text-stone-800">{activeIndkomstAar.kommuneSkatteprocent}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500">AM-bidrag:</span>
          <span className="font-mono text-stone-800">8,00%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Kørselsfradrag bil:</span>
          <span className="font-mono text-emerald-800 font-semibold">{regler.takstBilMCFoerste20k.toLocaleString('da-DK')} kr/km</span>
        </div>
      </div>
    </aside>
  );
};
