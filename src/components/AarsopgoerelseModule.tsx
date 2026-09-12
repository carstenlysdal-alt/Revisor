import React, { useState } from 'react';
import {
  FileCheck2,
  Copy,
  Check,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { SkatteBeregningResultat, IndkomstAar } from '../types';

interface Props {
  skatteBeregning: SkatteBeregningResultat;
  indkomstAar: IndkomstAar;
}

export const AarsopgoerelseModule: React.FC<Props> = ({
  skatteBeregning,
  indkomstAar,
}) => {
  const [copiedRubrik, setCopiedRubrik] = useState<string | null>(null);

  const copyAmount = (rubrik: string, amount: number) => {
    navigator.clipboard.writeText(amount.toString());
    setCopiedRubrik(rubrik);
    setTimeout(() => setCopiedRubrik(null), 1800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-stone-700" />
            Skat — Årsopgørelse & Rubrikoversigt for {indkomstAar.aar}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Her er appens vejledende forslag til tal, som du skal kontrollere på TastSelv Borger (skat.dk).
          </p>
        </div>

        <a
          href="https://skat.dk/tastselv"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition shadow-xs"
        >
          Åbn skat.dk TastSelv
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Official Rubrik Boxes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rubrik 12 */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-stone-100 text-stone-800">
                Rubrik 12
              </span>
              <span className="text-[11px] font-semibold text-stone-500">B-indkomst</span>
            </div>
            <h3 className="font-bold text-stone-900 text-sm mt-2">
              Honorarer, vederlag og anden B-indkomst
            </h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Summen af alle honorarer før AM-bidrag og skat for indkomståret {indkomstAar.aar}.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-stone-950">
              {skatteBeregning.honorarerAlt.toLocaleString('da-DK')} DKK
            </span>
            <button
              type="button"
              onClick={() => copyAmount('12', skatteBeregning.honorarerAlt)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-xs font-medium text-stone-700 transition"
            >
              {copiedRubrik === '12' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Kopieret
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  Kopiér
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rubrik 29 */}
        <div className="bg-white border-2 border-emerald-200/90 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-100 text-emerald-800">
                Rubrik 29
              </span>
              <span className="text-[11px] font-semibold text-emerald-800">Fradrag i pers. indkomst</span>
            </div>
            <h3 className="font-bold text-stone-900 text-sm mt-2">
              Øvrige lønmodtager- & B-indkomstfradrag
            </h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Driftsomkostninger ({skatteBeregning.fradragKatalogSum.toLocaleString('da-DK')} DKK) samt kørselsfradrag for egen bil/cykel ({skatteBeregning.koerselsFradragRubrik29.toLocaleString('da-DK')} DKK).
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-900">
              {skatteBeregning.anvendtFradragRubrik29.toLocaleString('da-DK')} DKK
            </span>
            <button
              type="button"
              onClick={() => copyAmount('29', skatteBeregning.anvendtFradragRubrik29)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-xs font-medium text-stone-700 transition"
            >
              {copiedRubrik === '29' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Kopieret
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  Kopiér
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rubrik 17 */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-stone-100 text-stone-800">
                Rubrik 17
              </span>
              <span className="text-[11px] font-semibold text-stone-500">Særlig indkomst</span>
            </div>
            <h3 className="font-bold text-stone-900 text-sm mt-2">
              Legater, uddelinger og bestemte personalegoder
            </h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Indtægter der er fritaget for arbejdsmarkedsbidrag.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-stone-950">
              {skatteBeregning.rubrik17Indkomst.toLocaleString('da-DK')} DKK
            </span>
            <button
              type="button"
              onClick={() => copyAmount('17', skatteBeregning.rubrik17Indkomst)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-xs font-medium text-stone-700 transition"
            >
              {copiedRubrik === '17' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Kopieret
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  Kopiér
                </>
              )}
            </button>
          </div>
        </div>

        {/* Rubrik 51 */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-stone-100 text-stone-800">
                Rubrik 51
              </span>
              <span className="text-[11px] font-semibold text-stone-500">Ligningsmæssigt</span>
            </div>
            <h3 className="font-bold text-stone-900 text-sm mt-2">
              Befordringsfradrag (Passager)
            </h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Kørsel hvor du har været passager i bil/MC og ikke selv afholdt driftsudgiften til køretøjet.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-stone-950">
              {skatteBeregning.befordringsFradragRubrik51.toLocaleString('da-DK')} DKK
            </span>
            <button
              type="button"
              onClick={() => copyAmount('51', skatteBeregning.befordringsFradragRubrik51)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-xs font-medium text-stone-700 transition"
            >
              {copiedRubrik === '51' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Kopieret
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  Kopiér
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Skat.dk Vejledning & Krydshenvisninger */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 space-y-4">
        <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-stone-700" />
          Vigtige regler og krydshenvisninger ved indberetning
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-700">
          <div className="p-3 bg-white rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block mb-1">
              Mangler Rubrik 12 på din årsopgørelse?
            </span>
            Hvis feltet er låst eller ikke fremgår på skat.dk, skal B-indkomsten indtastes i{' '}
            <strong className="text-stone-900">Rubrik 15</strong>. Hvis Rubrik 17 mangler, skal det anføres i{' '}
            <strong className="text-stone-900">Rubrik 20</strong>.
          </div>

          <div className="p-3 bg-white rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block mb-1">
              Hvorfor havner bilkørsel i Rubrik 29?
            </span>
            Når du kører i egen bil eller cykel til et B-indkomstjob, er kørslen en direkte driftsomkostning. 
            Det kan give fradrag i din <em>personlige indkomst</em> (Rubrik 29). Den faktiske skatteværdi afhænger af din samlede indkomst og aktivitetens skattemæssige behandling. Almindelig transport mellem hjem og arbejde hører typisk til Rubrik 51.
          </div>

          <div className="p-3 bg-white rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block mb-1">
              Har en hvervgiver indberettet for meget?
            </span>
            Hvis en arrangør eller kunde har indberettet et forkert beløb til eIndkomst, kan du ikke rette det direkte i TastSelv. 
            Du skal kontakte hvervgiveren og bede dem indsende en rettelse til Skattestyrelsen.
          </div>

          <div className="p-3 bg-white rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block mb-1">
              Dokumentationskrav
            </span>
            Gem de oprindelige bilag og kørselsnotater efter de gældende dokumentationskrav. Uploadede originalfiler gemmes lokalt i denne browser; lav også din egen backup.
          </div>
        </div>
      </div>
    </div>
  );
};
