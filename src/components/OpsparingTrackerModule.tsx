import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  PiggyBank,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { IndkomstAar, OpsparingsTracker, SkatteBeregningResultat } from '../types';

interface Props {
  indkomstAar: IndkomstAar;
  skatteBeregning: SkatteBeregningResultat;
  opsparing: OpsparingsTracker;
  onUpdateOpsparing: (data: OpsparingsTracker) => void;
}

export const OpsparingTrackerModule: React.FC<Props> = ({
  indkomstAar,
  skatteBeregning,
  opsparing,
  onUpdateOpsparing,
}) => {
  const [indbetalt, setIndbetalt] = useState<number>(opsparing.indbetaltTilSkat);
  const [opsparet, setOpsparet] = useState<number>(opsparing.opsparetPrivat);
  const [isSaved, setIsSaved] = useState(false);

  const skatOgAmTotal = skatteBeregning.samletSkatOgAM;
  const daekketTotal = (Number(indbetalt) || 0) + (Number(opsparet) || 0);
  const manglerOpsparing = Math.max(0, skatOgAmTotal - daekketTotal);
  const overskudOpsparet = Math.max(0, daekketTotal - skatOgAmTotal);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateOpsparing({
      indbetaltTilSkat: Number(indbetalt),
      opsparetPrivat: Number(opsparet),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-900 text-white flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              Skat — Sæt til side ({indkomstAar.aar})
            </h2>
            <p className="text-xs text-stone-500">
              Hold styr på din skatteopsparing, så du aldrig bliver overrasket af restskat på din B-indkomst.
            </p>
          </div>
        </div>
      </div>

      {/* Status Hero Card */}
      {manglerOpsparing > 0 ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                Advarsel: Utilstrækkelig skatteopsparing
              </span>
              <div className="text-3xl font-extrabold font-mono text-red-950">
                Mangler {manglerOpsparing.toLocaleString('da-DK')} DKK
              </div>
              <p className="text-xs text-red-800 leading-relaxed pt-1">
                Din beregnede skat og AM-bidrag for {indkomstAar.aar} er{' '}
                <strong>{skatOgAmTotal.toLocaleString('da-DK')} DKK</strong>, men du har kun afsat/indbetalt{' '}
                <strong>{daekketTotal.toLocaleString('da-DK')} DKK</strong>. 
                Du bør overføre restbeløbet til din skattekonto for at undgå renter og restskat.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Flot! Din skatteopsparing er i balance
              </span>
              <div className="text-3xl font-extrabold font-mono text-emerald-950">
                0 DKK mangler
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed pt-1">
                Du har afsat nok ({daekketTotal.toLocaleString('da-DK')} DKK) til at dække årets forventede skat og AM-bidrag ({skatOgAmTotal.toLocaleString('da-DK')} DKK).
                {overskudOpsparet > 0 && ` Du har endda en buffer på ${overskudOpsparet.toLocaleString('da-DK')} DKK.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inputs Form */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <form onSubmit={handleSave} className="space-y-5">
          <h3 className="font-bold text-stone-900 text-sm border-b border-stone-100 pb-3">
            Status for din opsparing og frivillige indbetalinger
          </h3>

          <div className="space-y-4 text-xs">
            {/* Samlet skat (Read only) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div>
                <span className="font-semibold text-stone-900 block">
                  Beregnet Skat og AM-bidrag i alt for {indkomstAar.aar}
                </span>
                <span className="text-stone-400 text-[11px]">
                  Beregnes automatisk ud fra dine registrerede jobs og fradrag
                </span>
              </div>
              <span className="text-base font-bold font-mono text-stone-900 mt-2 sm:mt-0">
                {skatOgAmTotal.toLocaleString('da-DK')} DKK
              </span>
            </div>

            {/* Indbetalt til skat */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-800 block">
                Beløb for {indkomstAar.aar}, som du allerede har frivilligt indbetalt til SKAT (DKK)
              </label>
              <input
                type="number"
                min={0}
                value={indbetalt || ''}
                onChange={(e) => setIndbetalt(Number(e.target.value))}
                placeholder="fx 3000"
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-stone-400 text-[11px] block">
                Frivillige indbetalinger på TastSelv Borger modregnet restskat
              </span>
            </div>

            {/* Opsparet privat */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-800 block">
                Beløb du har sat til side på din private skattekonto / opsparing (DKK)
              </label>
              <input
                type="number"
                min={0}
                value={opsparet || ''}
                onChange={(e) => setOpsparet(Number(e.target.value))}
                placeholder="fx 5000"
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-stone-400 text-[11px] block">
                Penge du har stående øremærket til skattebetaling
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            {isSaved && (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Opsparingstal er gemt
              </span>
            )}
            <button
              type="submit"
              className="ml-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              Gem opsparingstal
            </button>
          </div>
        </form>
      </div>

      {/* Proaktiv Revisor AI Anbefaling */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
          <Sparkles className="w-4 h-4 text-amber-600" />
          Proaktiv Revisor AI Regelforhold
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          Når du modtager et honorar som B-indkomst, fratrækker hvervgiveren som regel hverken A-skat eller AM-bidrag 
          (medmindre andet er aftalt). 
          Vores tommelfingerregel er at sætte <strong className="text-stone-900">38% - 42%</strong> af ethvert modtaget honorar 
          direkte til side på en separat bankkonto samme dag, som pengene går ind.
        </p>
      </div>
    </div>
  );
};
