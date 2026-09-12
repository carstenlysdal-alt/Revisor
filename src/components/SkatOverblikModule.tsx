import React from 'react';
import {
  FileText,
  Printer,
  AlertTriangle
} from 'lucide-react';
import { IndkomstAar, SkatteBeregningResultat } from '../types';
import { SKATTESATSER } from '../data/danishTaxData';

interface Props {
  indkomstAar: IndkomstAar;
  skatteBeregning: SkatteBeregningResultat;
}

export const SkatOverblikModule: React.FC<Props> = ({
  indkomstAar,
  skatteBeregning,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-700" />
            Skat — Overblik & Beregning for {indkomstAar.aar}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Vejledende, deterministisk estimat med de gemte forudsætninger og årsregler for {skatteBeregning.regelAar}.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
        >
          <Printer className="w-4 h-4" />
          Udskriv / Gem PDF
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Brutto B-Honorarer (Rubrik 12)
          </span>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
            {skatteBeregning.honorarerAlt.toLocaleString('da-DK')} DKK
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">
            Samlet udbetalt fra alle honorarjobs
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Samlet Skat & AM-bidrag
          </span>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
            {skatteBeregning.samletSkatOgAM.toLocaleString('da-DK')} DKK
          </div>
          <span className="text-[11px] text-stone-500 mt-1 block">
            Effektiv skattesats: <strong className="text-stone-800">{skatteBeregning.effektivSkatteprocent}%</strong>
          </span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
            Honorarer Efter Estimeret Skat
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-950 mt-1">
            {skatteBeregning.indtaegtEfterSkat.toLocaleString('da-DK')} DKK
          </div>
          <span className="text-[11px] text-emerald-700 mt-1 block">
            Før faktiske udgifter og investeringer
          </span>
        </div>
      </div>

      {/* Rubrik 29-loft advarsel */}
      {skatteBeregning.rubrik29LoftOverskredet && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Bemærk: Appens nettoindkomstgrænse for honorarfradrag er nået.</strong>
            <p className="mt-0.5">
              Dine fradrag ({skatteBeregning.oevrigeFradragRubrik29.toLocaleString('da-DK')} DKK) overstiger B-indkomsten efter AM-bidrag. 
              Estimatet anvender {skatteBeregning.maksTilladtFradragRubrik29.toLocaleString('da-DK')} DKK. Flere aktiviteter kan kræve særskilt faglig afgrænsning.
            </p>
          </div>
        </div>
      )}

      {/* Blok 1: B-indkomst, AM-bidrag, fradrag og skattepligtig indkomst */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm">
            Blok 1 — B-indkomst, Fradrag & Skattepligtig Indkomst
          </h3>
          <span className="text-xs text-stone-500">Grundlag for skatteberegning</span>
        </div>

        <div className="p-6 divide-y divide-stone-100 text-xs">
          <div className="flex justify-between py-2.5">
            <span className="text-stone-700 font-medium">
              Honorarer mv. (Rubrik 12)
            </span>
            <span className="font-mono font-semibold text-stone-900">
              {skatteBeregning.honorarerAlt.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-2.5">
            <span className="text-stone-700">
              Legater, uddelinger mv. (Rubrik 17)
            </span>
            <span className="font-mono text-stone-600">
              {skatteBeregning.rubrik17Indkomst.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-2.5 text-emerald-800">
            <span className="font-medium">
              Øvrige fradrag i personlig indkomst (Rubrik 29)
              <span className="block text-[11px] text-stone-400 font-normal">
                Driftsomkostninger ({skatteBeregning.fradragKatalogSum.toLocaleString('da-DK')} DKK) + Kørselsfradrag bil/cykel ({skatteBeregning.koerselsFradragRubrik29.toLocaleString('da-DK')} DKK)
              </span>
            </span>
            <span className="font-mono font-bold">
              - {skatteBeregning.anvendtFradragRubrik29.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-2.5 text-stone-700">
            <span>
              Arbejdsmarkedsbidrag (AM-bidrag 8% af AM-pligtig del)
            </span>
            <span className="font-mono font-medium">
              - {skatteBeregning.amBidrag.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-3 font-bold text-stone-900 bg-stone-50/70 px-2 rounded-lg">
            <span className="text-sm">= Personlig indkomst</span>
            <span className="font-mono text-sm">
              {skatteBeregning.personligIndkomst.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-2.5 text-stone-600">
            <span>
              Befordringsfradrag (Rubrik 51 - kun passagerkørsel)
            </span>
            <span className="font-mono">
              - {skatteBeregning.befordringsFradragRubrik51.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-3 font-bold text-stone-900 bg-stone-100/70 px-2 rounded-lg">
            <span className="text-sm">= Skattepligtig indkomst</span>
            <span className="font-mono text-sm">
              {skatteBeregning.skattepligtigIndkomst.toLocaleString('da-DK')} DKK
            </span>
          </div>
        </div>
      </div>

      {/* Blok 2: Skatteberegning og skatteopgørelse */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm">
            Blok 2 — Skatteberegning & Skatteopgørelse
          </h3>
          <span className="text-xs text-stone-500">
            Kommune: {indkomstAar.kommune} ({indkomstAar.kommuneSkatteprocent}%)
          </span>
        </div>

        <div className="p-6 divide-y divide-stone-100 text-xs">
          <div className="flex justify-between py-2.5">
            <span className="text-stone-700">
              AM-bidrag (8%)
            </span>
            <span className="font-mono font-medium text-stone-900">
              {skatteBeregning.amBidrag.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-2.5">
            <span className="text-stone-700">
              Bundskat ({SKATTESATSER.bundskatProcent}%)
            </span>
            <span className="font-mono text-stone-900">
              {skatteBeregning.bundskat.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-2.5">
            <span className="text-stone-700">
              Kommuneskat ({indkomstAar.kommuneSkatteprocent}%)
            </span>
            <span className="font-mono text-stone-900">
              {skatteBeregning.kommuneskat.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-2.5">
            <span className="text-stone-700">
              Kirkeskat ({indkomstAar.medlemFolkekirken ? `${indkomstAar.kirkeskatteprocent}%` : 'Ikke medlem'})
            </span>
            <span className="font-mono text-stone-900">
              {skatteBeregning.kirkeskat.toLocaleString('da-DK')} DKK
            </span>
          </div>

          {skatteBeregning.mellemskat > 0 && (
            <div className="flex justify-between py-2.5 text-red-700 font-semibold">
              <span>Mellemskat</span><span className="font-mono">{skatteBeregning.mellemskat.toLocaleString('da-DK')} DKK</span>
            </div>
          )}
          {skatteBeregning.topskat > 0 && <div className="flex justify-between py-2.5 text-red-700 font-semibold"><span>Topskat</span><span className="font-mono">{skatteBeregning.topskat.toLocaleString('da-DK')} DKK</span></div>}
          {skatteBeregning.toptopskat > 0 && <div className="flex justify-between py-2.5 text-red-700 font-semibold"><span>Toptopskat</span><span className="font-mono">{skatteBeregning.toptopskat.toLocaleString('da-DK')} DKK</span></div>}

          <div className="flex justify-between py-3.5 font-bold text-stone-900 bg-stone-50 px-3 rounded-lg text-sm">
            <span>= Beregnet skat i alt (inkl. AM-bidrag)</span>
            <span className="font-mono text-base text-stone-950">
              {skatteBeregning.samletSkatOgAM.toLocaleString('da-DK')} DKK
            </span>
          </div>

          <div className="flex justify-between py-3.5 font-bold text-emerald-900 bg-emerald-50 px-3 rounded-lg text-sm mt-2">
            <span>= Nettoindtægt efter skat</span>
            <span className="font-mono text-base text-emerald-950">
              {skatteBeregning.indtaegtEfterSkat.toLocaleString('da-DK')} DKK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
