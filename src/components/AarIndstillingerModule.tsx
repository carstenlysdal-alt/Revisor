import React, { useEffect, useState } from 'react';
import { Lock, Save, Settings, Unlock } from 'lucide-react';
import { DANSKE_KOMMUNER, SKATTEREGLER } from '../data/danishTaxData';
import type { IndkomstAar } from '../types';

interface Props {
  indkomstAar: IndkomstAar;
  existingYears: number[];
  onUpdate: (updates: Partial<IndkomstAar>) => void;
  onAddYear: (year: number) => void;
}

export const AarIndstillingerModule: React.FC<Props> = ({ indkomstAar, existingYears, onUpdate, onAddYear }) => {
  const [form, setForm] = useState(indkomstAar);
  const [isSaved, setIsSaved] = useState(false);
  useEffect(() => setForm(indkomstAar), [indkomstAar]);

  const updateNumber = (
    field: 'forventetAIndkomst' | 'forventetPensionSUDagpenge' | 'forventedeFradragAIndkomst' | 'kommuneSkatteprocent' | 'kirkeskatteprocent',
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: Number(value) || 0 }));
  };
  const handleKommune = (navn: string) => {
    const kommune = DANSKE_KOMMUNER.find((entry) => entry.navn === navn);
    setForm((current) => kommune
      ? { ...current, kommune: kommune.navn, kommuneSkatteprocent: kommune.kommuneskat, kirkeskatteprocent: kommune.kirkeskat }
      : { ...current, kommune: navn });
  };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); onUpdate(form); setIsSaved(true);
    window.setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <section className="max-w-3xl mx-auto space-y-6" aria-labelledby="year-settings-title">
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <h2 id="year-settings-title" className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5" aria-hidden="true" />Indkomstår og beregningsgrundlag</h2>
        <p className="text-xs text-stone-500 mt-1">Tallene bruges til et vejledende estimat. Kontrollér altid den endelige opgørelse i TastSelv.</p>
        <div className="flex gap-2 mt-4">
          {Object.keys(SKATTEREGLER).map(Number).filter((year) => !existingYears.includes(year)).map((year) => (
            <button key={year} type="button" onClick={() => onAddYear(year)} className="px-3 py-2 border rounded-lg text-xs font-semibold">Tilføj {year}</button>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs space-y-5">
        <fieldset disabled={indkomstAar.laast} className="space-y-5 disabled:opacity-60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-stone-700">Indkomstår<select value={form.aar} disabled className="mt-1 w-full px-3 py-3 border rounded-lg bg-stone-100">{Object.keys(SKATTEREGLER).map((aar) => <option key={aar}>{aar}</option>)}</select></label>
            <label className="text-xs font-semibold text-stone-700">Bopælskommune<input list="danske-kommuner" value={form.kommune} onChange={(event) => handleKommune(event.target.value)} className="mt-1 w-full px-3 py-3 border rounded-lg bg-white" /><datalist id="danske-kommuner">{DANSKE_KOMMUNER.map((kommune) => <option key={kommune.navn} value={kommune.navn} />)}</datalist></label>
          </div>
          <label className="text-xs font-semibold text-stone-700 block">Hjemmeadresse<input value={form.hjemmeadresse} onChange={(event) => setForm((current) => ({ ...current, hjemmeadresse: event.target.value }))} className="mt-1 w-full px-3 py-3 border rounded-lg" placeholder="Adresse bruges kun lokalt i browseren" /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-stone-700">Kommuneskat %<input type="number" min="0" max="40" step="0.01" inputMode="decimal" value={form.kommuneSkatteprocent || ''} onChange={(event) => updateNumber('kommuneSkatteprocent', event.target.value)} className="mt-1 w-full px-3 py-3 border rounded-lg tabular-nums" /></label>
            <label className="text-xs font-semibold text-stone-700">Kirkeskat %<input type="number" min="0" max="5" step="0.01" inputMode="decimal" value={form.kirkeskatteprocent || ''} onChange={(event) => updateNumber('kirkeskatteprocent', event.target.value)} className="mt-1 w-full px-3 py-3 border rounded-lg tabular-nums" /></label>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500">Kontrollér satserne mod din forskudsopgørelse. Valg fra hjælpelisten udfylder dem automatisk; fritekstkommune kræver manuel sats.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-xs font-semibold text-stone-700">Forventet A-indkomst før AM-bidrag<input type="number" min="0" inputMode="decimal" value={form.forventetAIndkomst || ''} onChange={(event) => updateNumber('forventetAIndkomst', event.target.value)} className="mt-1 w-full px-3 py-3 border rounded-lg tabular-nums" /></label>
            <label className="text-xs font-semibold text-stone-700">Pension, SU og dagpenge<input type="number" min="0" inputMode="decimal" value={form.forventetPensionSUDagpenge || ''} onChange={(event) => updateNumber('forventetPensionSUDagpenge', event.target.value)} className="mt-1 w-full px-3 py-3 border rounded-lg tabular-nums" /></label>
            <label className="text-xs font-semibold text-stone-700">Andre ligningsfradrag<input type="number" min="0" inputMode="decimal" value={form.forventedeFradragAIndkomst || ''} onChange={(event) => updateNumber('forventedeFradragAIndkomst', event.target.value)} className="mt-1 w-full px-3 py-3 border rounded-lg tabular-nums" /></label>
          </div>
          <label className="flex items-center gap-3 text-xs text-stone-700"><input type="checkbox" checked={form.medlemFolkekirken} onChange={(event) => setForm((current) => ({ ...current, medlemFolkekirken: event.target.checked }))} className="w-4 h-4" />Jeg er medlem af folkekirken</label>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <button type="button" onClick={() => onUpdate({ laast: !indkomstAar.laast })} className="px-4 py-2.5 border rounded-lg text-xs font-semibold flex items-center gap-2">{indkomstAar.laast ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}{indkomstAar.laast ? 'Lås året op' : 'Lås året'}</button>
          <button type="submit" disabled={indkomstAar.laast} className="px-5 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" aria-hidden="true" />{isSaved ? 'Gemt' : 'Gem grundlag'}</button>
        </div>
      </form>
    </section>
  );
};
