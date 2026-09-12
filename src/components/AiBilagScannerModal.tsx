import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, Briefcase, CheckCircle2, DollarSign, Loader2,
  Mic, MicOff, Receipt, Send, UploadCloud, X,
} from 'lucide-react';
import type {
  AiExtractionResult, AiFradragSuggestion, AiInvesteringSuggestion,
  AiJobSuggestion, IndkomstAar,
} from '../types';
import { useDictation } from '../hooks/useDictation';
import { useModal } from '../hooks/useModal';
import { getAiSuggestionYear, isCompleteAiSuggestion } from '../utils/aiValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeIndkomstAar: IndkomstAar;
  indkomstAarList: IndkomstAar[];
  onApplyResult: (result: AiExtractionResult, file: File | undefined, yearId: string, sourceText: string | undefined) => Promise<void>;
}

interface AnalysisPayload {
  fileData?: string;
  mimeType?: string;
  fileName: string;
  textContent?: string;
}

const ALLOWED_FILE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/heic', 'image/heif']);
const MAX_FILE_SIZE = 15 * 1024 * 1024;

export const AiBilagScannerModal: React.FC<Props> = ({ isOpen, onClose, activeIndkomstAar, indkomstAarList, onApplyResult }) => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiExtractionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [targetYearId, setTargetYearId] = useState(activeIndkomstAar.id);
  const [unavailableYear, setUnavailableYear] = useState<number | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const requestNumber = useRef(0);
  const dictation = useDictation(noteText, setNoteText);
  const closeModal = () => {
    activeRequest.current?.abort();
    dictation.stopDictation();
    onClose();
  };

  useModal(isOpen, closeModal);
  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => {
    setAnalysisResult(null);
    setErrorMessage(null);
    setSuccessNotice(null);
    setTargetYearId(activeIndkomstAar.id);
    setUnavailableYear(null);
  }, [activeIndkomstAar.id]);

  if (!isOpen) return null;

  const analyzeData = async (payload: AnalysisPayload) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const currentRequest = ++requestNumber.current;
    setIsAnalyzing(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    setAnalysisResult(null);
    try {
      const response = await fetch('/api/gemini/analyze-bilag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, incomeYear: activeIndkomstAar.aar }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || `Serverfejl (${response.status})`);
      }
      const result: AiExtractionResult = await response.json();
      if (currentRequest === requestNumber.current) {
        const resultYear = getAiSuggestionYear(result);
        const matchedYear = resultYear !== undefined
          ? indkomstAarList.find((year) => year.aar === resultYear)
          : undefined;
        setTargetYearId(matchedYear?.id ?? activeIndkomstAar.id);
        setUnavailableYear(resultYear !== undefined && !matchedYear ? resultYear : null);
        setAnalysisResult(result);
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (currentRequest === requestNumber.current) {
        setErrorMessage(error instanceof Error ? error.message : 'Informationen kunne ikke analyseres.');
      }
    } finally {
      if (currentRequest === requestNumber.current) setIsAnalyzing(false);
    }
  };

  const analyzeNote = () => {
    if (!noteText.trim()) return;
    dictation.stopDictation();
    setFile(null);
    setSourceName('Dikteret eller skrevet note');
    void analyzeData({ fileName: 'note.txt', textContent: noteText.trim() });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) return;
    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage('Filen er for stor. Vælg et bilag på højst 15 MB.');
      return;
    }
    if (!ALLOWED_FILE_TYPES.has(selectedFile.type)) {
      setErrorMessage('Filtypen understøttes ikke. Brug PDF, PNG, JPG eller HEIC.');
      return;
    }
    setFile(selectedFile);
    setSourceName(selectedFile.name);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = String(reader.result).split(',', 2)[1];
      if (!base64Data) {
        setErrorMessage('Filen kunne ikke læses.');
        return;
      }
      void analyzeData({ fileData: base64Data, mimeType: selectedFile.type, fileName: selectedFile.name });
    };
    reader.onerror = () => setErrorMessage('Filen kunne ikke indlæses lokalt.');
    reader.readAsDataURL(selectedFile);
  };

  const loadSample = (type: 'JOB' | 'FRADRAG' | 'INVESTERING') => {
    const samples = {
      JOB: 'Honorar fra Kulturhuset på 6.500 kr. for koncert den 12. juni 2026. Betales 25. juni. Jeg kørte 310 km tur-retur i egen bil.',
      FRADRAG: 'Parkeringskvittering på 220 kr. den 12. juni 2026 i forbindelse med koncerten. Hele beløbet vedrører arbejdet.',
      INVESTERING: 'Jeg købte en computer til 18.500 kr. den 3. marts 2026 til mit arbejde.',
    };
    setFile(null);
    setNoteText(samples[type]);
    setSourceName('Eksempeldata');
    void analyzeData({ fileName: 'eksempel.txt', textContent: samples[type] });
  };

  const updateJob = (updates: Partial<AiJobSuggestion>) => setAnalysisResult((current) =>
    current?.job ? { ...current, job: { ...current.job, ...updates } } : current);
  const updateFradrag = (updates: Partial<AiFradragSuggestion>) => setAnalysisResult((current) =>
    current?.fradrag ? { ...current, fradrag: { ...current.fradrag, ...updates } } : current);
  const updateInvestering = (updates: Partial<AiInvesteringSuggestion>) => setAnalysisResult((current) =>
    current?.investering ? { ...current, investering: { ...current.investering, ...updates } } : current);

  const isComplete = isCompleteAiSuggestion(analysisResult);
  const targetYear = indkomstAarList.find((year) => year.id === targetYearId);

  const approveResult = async () => {
    if (!analysisResult || !isComplete || !targetYear || targetYear.laast || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onApplyResult(analysisResult, file ?? undefined, targetYearId, file ? undefined : noteText.trim() || undefined);
      setSuccessNotice(`Posten er placeret i ${targetYear.aar}. Gennemgå den i det valgte modul.`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Posten kunne ikke gemmes.');
    } finally {
      setIsSaving(false);
    }
  };

  const label = analysisResult?.classification === 'JOB' ? `Honorarjob · rubrik ${analysisResult.job?.rubrik ?? 12}`
    : analysisResult?.classification === 'FRADRAG' ? 'Driftsudgift · forslag til rubrik 29'
      : analysisResult?.classification === 'INVESTERING' ? 'Investering / anlægsaktiv' : 'Kræver manuel placering';
  const inputClass = 'min-h-10 w-full border-b border-stone-300 bg-transparent px-1 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="agent-inbox-title">
      <div className="my-auto max-h-[94vh] w-full max-w-3xl overflow-y-auto border border-stone-300 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Agentens indbakke · udgangspunkt {activeIndkomstAar.aar}</p>
            <h2 id="agent-inbox-title" className="text-lg font-extrabold tracking-tight text-stone-950">Fortæl eller vis mig, hvad der skal bogføres</h2>
            <p className="text-xs text-stone-500">Agenten foreslår placering. Du retter og godkender før posten oprettes.</p>
          </div>
          <button type="button" onClick={closeModal} aria-label="Luk agentens indbakke" className="p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-6 p-5 sm:p-7">
          <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              <label htmlFor="agent-note" className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-600">Skriv eller diktér</label>
              <textarea id="agent-note" value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={5} maxLength={20_000}
                placeholder="Fx: Jeg spillede i Odense den 14. september for 8.000 kr. og kørte 330 km tur-retur i egen bil…"
                className="w-full resize-y border border-stone-300 bg-stone-50 p-3 text-sm leading-relaxed outline-none transition focus:border-stone-900 focus:bg-white" />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {dictation.isSupported ? (
                  <button type="button" onClick={dictation.isListening ? dictation.stopDictation : dictation.startDictation}
                    aria-pressed={dictation.isListening}
                    className={`inline-flex min-h-10 items-center gap-2 border px-3 text-xs font-bold transition ${dictation.isListening ? 'border-red-300 bg-red-50 text-red-800' : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100'}`}>
                    {dictation.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {dictation.isListening ? 'Stop diktering' : 'Diktér på dansk'}
                  </button>
                ) : <span className="text-xs text-stone-500">Diktering understøttes ikke i denne browser.</span>}
                <button type="button" onClick={analyzeNote} disabled={!noteText.trim() || isAnalyzing}
                  className="inline-flex min-h-10 items-center gap-2 bg-stone-950 px-4 text-xs font-bold text-white transition hover:bg-stone-800 disabled:opacity-40">
                  <Send className="h-4 w-4" /> Find den rette placering
                </button>
              </div>
              {(dictation.dictationError || errorMessage) && <p role="alert" className="mt-2 text-xs text-red-700">{dictation.dictationError || errorMessage}</p>}
            </div>

            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-stone-400 bg-stone-50 p-4 text-center transition hover:border-stone-800 hover:bg-stone-100">
              <UploadCloud className="mb-2 h-7 w-7 text-stone-500" />
              <span className="text-sm font-bold text-stone-800">Upload bilag</span>
              <span className="mt-1 text-xs text-stone-500">PDF, PNG, JPG eller HEIC · maks. 15 MB</span>
              {sourceName && <span className="mt-3 max-w-full truncate text-xs font-semibold text-amber-800">{sourceName}</span>}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.heic,.heif" onChange={handleFileUpload} className="sr-only" />
            </label>
          </section>

          <div className="flex flex-wrap items-center gap-2 border-y border-stone-200 py-3 text-xs">
            <span className="font-semibold text-stone-500">Prøv med eksempeldata:</span>
            <button type="button" onClick={() => loadSample('JOB')} className="inline-flex items-center gap-1 border-b border-stone-400 py-1 font-semibold hover:border-stone-950"><Briefcase className="h-3.5 w-3.5" /> job</button>
            <button type="button" onClick={() => loadSample('FRADRAG')} className="inline-flex items-center gap-1 border-b border-stone-400 py-1 font-semibold hover:border-stone-950"><Receipt className="h-3.5 w-3.5" /> udgift</button>
            <button type="button" onClick={() => loadSample('INVESTERING')} className="inline-flex items-center gap-1 border-b border-stone-400 py-1 font-semibold hover:border-stone-950"><DollarSign className="h-3.5 w-3.5" /> investering</button>
          </div>

          {isAnalyzing && <div className="flex items-center gap-3 border-l-2 border-amber-500 bg-amber-50 p-4 text-sm font-semibold text-stone-800"><Loader2 className="h-5 w-5 animate-spin" /> Agenten læser, udtrækker og klassificerer informationen…</div>}
          {successNotice && <div role="status" className="flex items-center gap-2 border-l-2 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="h-5 w-5" />{successNotice}</div>}

          {analysisResult && !isAnalyzing && (
            <section className="border-t-2 border-stone-950 pt-5" aria-label="Agentens forslag">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">Foreslået placering</p><h3 className="text-xl font-extrabold text-stone-950">{label}</h3></div>
                <span className="text-xs text-stone-500">Modelskøn {Math.round(analysisResult.confidence * 100)} %</span>
              </div>
              <p className="mb-5 text-sm leading-relaxed text-stone-700">{analysisResult.summary}</p>

              <div className="mb-4 border-l-2 border-stone-900 bg-stone-50 px-4 py-3">
                <label className="text-xs font-bold text-stone-700">Placér i indkomstår
                  <select value={targetYearId} onChange={(event) => { setTargetYearId(event.target.value); setUnavailableYear(null); }}
                    className="ml-3 min-h-9 border border-stone-300 bg-white px-3 text-sm font-bold text-stone-900">
                    {indkomstAarList.map((year) => <option key={year.id} value={year.id}>{year.aar}</option>)}
                  </select>
                </label>
                {unavailableYear && (
                  <p role="alert" className="mt-2 text-xs text-amber-800">
                    Bilagets dato peger på {unavailableYear}, som ikke er oprettet. Opret året under Indkomstår, eller vælg et eksisterende år efter din kontrol.
                  </p>
                )}
                {targetYear?.laast && <p role="alert" className="mt-2 text-xs text-amber-800">{targetYear.aar} er låst. Lås året op under Indkomstår før godkendelse.</p>}
              </div>

              {analysisResult.classification === 'JOB' && analysisResult.job && (
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 border-y border-stone-200 py-4 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-stone-500">Hvervgiver<input className={inputClass} value={analysisResult.job.hvervgiver ?? ''} onChange={(e) => updateJob({ hvervgiver: e.target.value })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Honorar<input className={inputClass} type="number" min="0" inputMode="decimal" value={analysisResult.job.honorar ?? ''} onChange={(e) => updateJob({ honorar: Number(e.target.value) })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Dato<input className={inputClass} type="date" value={analysisResult.job.startDato ?? ''} onChange={(e) => updateJob({ startDato: e.target.value, slutDato: e.target.value })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Rubrik<select className={inputClass} value={analysisResult.job.rubrik ?? 12} onChange={(e) => updateJob({ rubrik: Number(e.target.value) as 12 | 17 })}><option value="12">12 · Honorar</option><option value="17">17 · Anden personlig indkomst</option></select></label>
                  <label className="text-xs font-semibold text-stone-500">Transport<select className={inputClass} value={analysisResult.job.transportmiddel ?? 'NONE'} onChange={(e) => updateJob({ transportmiddel: e.target.value as AiJobSuggestion['transportmiddel'] })}><option value="NONE">Ingen registreret</option><option value="OWN_CAR_MC">Egen bil/MC</option><option value="OWN_BIKE">Egen cykel</option><option value="PASSENGER">Almindelig befordring</option></select></label>
                  <label className="text-xs font-semibold text-stone-500">Km pr. arbejdsdag<input className={inputClass} type="number" min="0" inputMode="decimal" value={analysisResult.job.antalKm ?? ''} onChange={(e) => updateJob({ antalKm: Number(e.target.value) })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Antal dage/ture<input className={inputClass} type="number" min="0" inputMode="numeric" value={analysisResult.job.antalTure ?? 1} onChange={(e) => updateJob({ antalTure: Number(e.target.value) })} /></label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 sm:col-span-2"><input type="checkbox" checked={Boolean(analysisResult.job.amBidragFritaget)} onChange={(e) => updateJob({ amBidragFritaget: e.target.checked })} /> Dokumentet angiver AM-fritagelse</label>
                </div>
              )}

              {analysisResult.classification === 'FRADRAG' && analysisResult.fradrag && (
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 border-y border-stone-200 py-4 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-stone-500 sm:col-span-2">Beskrivelse<input className={inputClass} value={analysisResult.fradrag.beskrivelse ?? ''} onChange={(e) => updateFradrag({ beskrivelse: e.target.value })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Dato<input className={inputClass} type="date" value={analysisResult.fradrag.fakturaDato ?? ''} onChange={(e) => updateFradrag({ fakturaDato: e.target.value })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Beløb<input className={inputClass} type="number" min="0" inputMode="decimal" value={analysisResult.fradrag.fakturaBeloeb ?? ''} onChange={(e) => updateFradrag({ fakturaBeloeb: Number(e.target.value) })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Fradragsandel %<input className={inputClass} type="number" min="0" max="100" inputMode="decimal" value={analysisResult.fradrag.fradragsProcent ?? ''} onChange={(e) => updateFradrag({ fradragsProcent: Number(e.target.value) })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Kategori<input className={inputClass} value={analysisResult.fradrag.typeKategori ?? ''} onChange={(e) => updateFradrag({ typeKategori: e.target.value })} /></label>
                </div>
              )}

              {analysisResult.classification === 'INVESTERING' && analysisResult.investering && (
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 border-y border-stone-200 py-4 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-stone-500">Aktiv<input className={inputClass} value={analysisResult.investering.titel ?? ''} onChange={(e) => updateInvestering({ titel: e.target.value })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Beløb<input className={inputClass} type="number" min="0" inputMode="decimal" value={analysisResult.investering.beloeb ?? ''} onChange={(e) => updateInvestering({ beloeb: Number(e.target.value) })} /></label>
                  <label className="text-xs font-semibold text-stone-500">Dato<input className={inputClass} type="date" value={analysisResult.investering.fakturaDato ?? ''} onChange={(e) => updateInvestering({ fakturaDato: e.target.value })} /></label>
                </div>
              )}

              {analysisResult.classification === 'UNKNOWN' && <div className="flex gap-2 bg-amber-50 p-4 text-sm text-amber-950"><AlertCircle className="h-5 w-5 shrink-0" /> Agenten har ikke nok sikre oplysninger til at oprette en post. Tilføj beløb, dato og formål, og prøv igen.</div>}
              <div className="my-4 border-l-2 border-amber-500 pl-3 text-xs leading-relaxed text-stone-700"><strong className="block text-stone-950">Agentens kontrolnote</strong>{analysisResult.revisorNotat}</div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
                <p className="max-w-lg text-[11px] leading-relaxed text-stone-500">Ved analyse sendes teksten eller bilaget til Google Gemini. Godkendte poster og originalbilag gemmes lokalt i denne browsers database.</p>
                <button type="button" onClick={approveResult} disabled={!isComplete || !targetYear || targetYear.laast || isSaving || Boolean(successNotice)}
                  className="inline-flex min-h-11 items-center gap-2 bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-40">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  Godkend og opret
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
