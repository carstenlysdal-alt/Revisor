import React from 'react';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  Layers,
  Calendar,
  AlertTriangle,
  UploadCloud,
  Bot
} from 'lucide-react';

export const PlanningRoadmapView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner / Executive Summary */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 md:p-8 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider mb-3">
              <Layers className="w-3.5 h-3.5 text-stone-800" />
              Overordnet Køreplan & Arkitektur
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
              AI-Drevet Revisor & B-indkomst Platform
            </h2>
            <p className="mt-2 text-stone-600 max-w-3xl leading-relaxed text-sm md:text-base">
              Plan og realisering baseret på dokumentationen for <span className="font-semibold text-stone-800">b-indkomst.dk</span>. 
              Vores arkitektur forener den 100% deterministiske danske skatteregelmotor (Niveau 1) med et moderne AI-automatiseringslag (Niveau 2 & 3), 
              så bilag automatisk klassificeres, udtages og konverteres til jobs, fradrag og kalenderaftaler.
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-right">
            <span className="text-xs text-emerald-800 font-medium block">Nuværende Status</span>
            <span className="text-emerald-950 font-bold text-base flex items-center gap-1.5 justify-end mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Fase 1 & 2 Fuldt Implementeret
            </span>
          </div>
        </div>

        {/* Arkitekturprincip visualizer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-stone-100">
          <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-4">
            <div className="flex items-center gap-2 font-semibold text-stone-800 text-sm mb-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              1. Deterministisk Regelmotor
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Skatteberegningen (AM-bidrag 8%, kommuneskat, bundskat, topskat, personfradrag og rubrik 12/29/51) udføres altid af verificeret skattematematik — aldrig af AI-gæt.
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-4">
            <div className="flex items-center gap-2 font-semibold text-stone-800 text-sm mb-1.5">
              <UploadCloud className="w-4 h-4 text-blue-700" />
              2. Multimodal AI-Ekstraktion
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Gemini 3.8 Flash analyserer kontrakter, honorarnoter og kvitteringer. Klassificerer type, beregner kørsel, identificerer AM-fritagelse og foreslår fradragsprocent.
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-4">
            <div className="flex items-center gap-2 font-semibold text-stone-800 text-sm mb-1.5">
              <Calendar className="w-4 h-4 text-purple-700" />
              3. "Upload, så sker resten"
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Et klik godkender bilaget, opretter posten i regnskabet og genererer automatisk kalenderaftaler (.ics / Google Calendar) med påmindelse om honorarudbetaling og skat.
            </p>
          </div>
        </div>
      </div>

      {/* De 5 Faser (Roadmap) */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-stone-700" />
          Faseopdelt Udviklingsplan (Roadmap)
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {/* Fase 1 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs transition hover:border-stone-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">
                    Fase 1: Skatteregelmotor & Datamodels-paritet (Aktiv i appen)
                  </h4>
                  <p className="text-xs text-stone-500">Kernefundament svarende til b-indkomst.dks deterministiske logik</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                Gennemført
              </span>
            </div>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Indkomstår container med bopælskommune & A-indkomst</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Jobs & honorarer med 4 transporttyper (Rubrik 29 vs. 51)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Fradrag med individuel procent & Rubrik 29-loft validering</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Opsparings-tracker ("Sæt til side") med advarselsbånd</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Officiel årsopgørelses-mapping (Rubrik 12, 17, 29, 51)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Statistik & timelønsberegning for jobs og transport</span>
              </li>
            </ul>
          </div>

          {/* Fase 2 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs transition hover:border-stone-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">
                    Fase 2: Dokumentupload, AI-udtræk & Kalender (Aktiv i appen)
                  </h4>
                  <p className="text-xs text-stone-500">Automatisering af den manuelle indtastning via Gemini 3.8 Flash</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                Gennemført
              </span>
            </div>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Server-side Gemini endpoint med JSON-skemavalidering</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Automatisk klassificering af kontrakt vs. driftskvittering</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Detektion af AM-bidragsfritaget indkomst (kunstfond, legater)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Kørsels- og lokationsforslag ud fra spillested/kontraktadresse</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Direkte kalender-eksport (.ics & Google Calendar link)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Revisor AI Chat til direkte spørgsmål om skat og regler</span>
              </li>
            </ul>
          </div>

          {/* Fase 3 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs transition hover:border-stone-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">
                    Fase 3: Læring, Brugertilpassede Fradragsmønstre & Historik
                  </h4>
                  <p className="text-xs text-stone-500">Systemet husker brugerens tidligere fradragsprocenter og faste hvervgivere</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                Næste skridt
              </span>
            </div>
            <p className="mt-3 text-xs text-stone-600 leading-relaxed">
              Hvis du tidligere har godkendt fx en computer til 50% eller telefon til 75%, vil AI'en fremover forudfylde denne præference. 
              Gentagne spillesteder og hvervgivere genkendes med gemte kørselsruter.
            </p>
          </div>

          {/* Fase 4 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs transition hover:border-stone-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center">
                  4
                </span>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">
                    Fase 4: Prædiktiv Skatteøkonomi & Proaktiv Afsætning
                  </h4>
                  <p className="text-xs text-stone-500">Fremskrivning af restskat og automatisk foreslået skatteoverførsel</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700">
                Planlagt
              </span>
            </div>
            <p className="mt-3 text-xs text-stone-600 leading-relaxed">
              Løbende beregning af den præcise marginalskat for det næste honorar (fx "Sæt 39,2% til side af de 10.000 kr. udbetalt i morgen"), 
              så brugeren aldrig rammes af en ubehagelig restskatteopkrævning i marts.
            </p>
          </div>

          {/* Fase 5 */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs transition hover:border-stone-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center">
                  5
                </span>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">
                    Fase 5: Bankintegration (Open Banking) & Direkte SKAT API Forberedelse
                  </h4>
                  <p className="text-xs text-stone-500">Fuld automatisering af bankoverførsel til privat skattekonto</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-stone-100 text-stone-700">
                Fremtidig
              </span>
            </div>
            <p className="mt-3 text-xs text-stone-600 leading-relaxed">
              Valgfri integration til automatisk registrering af indbetalte honorarer fra bankkontoen og overførsel til en dedikeret skattekonto.
            </p>
          </div>
        </div>
      </div>

      {/* Skatte-Rubrik Oversigt og Nøgleregler */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-stone-700" />
          Officiel Skattemapping (SKAT Årsopgørelse)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Rubrik</th>
                <th className="py-2.5 px-3">Betegnelse i SKAT</th>
                <th className="py-2.5 px-3">Hvad omfatter den</th>
                <th className="py-2.5 px-3">Særlig Forretningsregel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 text-stone-800">
              <tr className="hover:bg-white/60">
                <td className="py-2.5 px-3 font-mono font-bold text-stone-900">Rubrik 12</td>
                <td className="py-2.5 px-3 font-medium">B-indkomst (Honorarer)</td>
                <td className="py-2.5 px-3">Summen af alle honorarer før AM-bidrag</td>
                <td className="py-2.5 px-3 text-stone-600">8% AM-bidrag beregnes automatisk (hvis ej fritaget)</td>
              </tr>
              <tr className="hover:bg-white/60">
                <td className="py-2.5 px-3 font-mono font-bold text-stone-900">Rubrik 17</td>
                <td className="py-2.5 px-3 font-medium">Uddelinger, legater m.v.</td>
                <td className="py-2.5 px-3">Særlig AM-bidragsfri indkomst</td>
                <td className="py-2.5 px-3 text-stone-600">Fritaget for AM-bidrag</td>
              </tr>
              <tr className="hover:bg-white/60">
                <td className="py-2.5 px-3 font-mono font-bold text-stone-900">Rubrik 29</td>
                <td className="py-2.5 px-3 font-medium">Øvrige fradrag i pers. indkomst</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-800">Driftsudgifter + Kørsel i egen bil/cykel</td>
                <td className="py-2.5 px-3 text-red-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Må ALDRIG overstige B-indkomst efter AM-bidrag
                </td>
              </tr>
              <tr className="hover:bg-white/60">
                <td className="py-2.5 px-3 font-mono font-bold text-stone-900">Rubrik 51</td>
                <td className="py-2.5 px-3 font-medium">Befordringsfradrag</td>
                <td className="py-2.5 px-3">Kun kørsel som passager i bil/MC</td>
                <td className="py-2.5 px-3 text-stone-600">Ligningsmæssigt fradrag med lavere skatteværdi</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
