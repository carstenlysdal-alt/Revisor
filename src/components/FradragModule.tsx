import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Download,
  Info
} from 'lucide-react';
import { Fradrag, IndkomstAar, SkatteBeregningResultat } from '../types';

interface Props {
  fradragList: Fradrag[];
  indkomstAar: IndkomstAar;
  skatteBeregning: SkatteBeregningResultat;
  onAddFradrag: (fradrag: Omit<Fradrag, 'id'>) => void;
  onUpdateFradrag: (id: string, fradrag: Partial<Fradrag>) => void;
  onDeleteFradrag: (id: string) => void;
  onOpenAiScanner: () => void;
}

export const FradragModule: React.FC<Props> = ({
  fradragList,
  indkomstAar,
  skatteBeregning,
  onAddFradrag,
  onUpdateFradrag,
  onDeleteFradrag,
  onOpenAiScanner,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [beskrivelse, setBeskrivelse] = useState('');
  const [typeKategori, setTypeKategori] = useState('Udstyr');
  const [fakturaDato, setFakturaDato] = useState(new Date().toISOString().split('T')[0]);
  const [fakturaBeloeb, setFakturaBeloeb] = useState<number>(0);
  const [fradragsProcent, setFradragsProcent] = useState<number>(100);
  const [revisorNotat, setRevisorNotat] = useState('');

  const fradragIDKK = Math.round(((fakturaBeloeb || 0) * (fradragsProcent || 100)) / 100);

  const resetForm = () => {
    setEditingId(null);
    setBeskrivelse('');
    setTypeKategori('Udstyr');
    setFakturaDato(new Date().toISOString().split('T')[0]);
    setFakturaBeloeb(0);
    setFradragsProcent(100);
    setRevisorNotat('');
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (f: Fradrag) => {
    setEditingId(f.id);
    setBeskrivelse(f.beskrivelse);
    setTypeKategori(f.typeKategori || 'Andet');
    setFakturaDato(f.fakturaDato);
    setFakturaBeloeb(f.fakturaBeloeb);
    setFradragsProcent(f.fradragsProcent);
    setRevisorNotat(f.revisorNotat || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!beskrivelse.trim() || fakturaBeloeb <= 0) return;

    const data: Omit<Fradrag, 'id'> = {
      indkomstAarId: indkomstAar.id,
      beskrivelse: beskrivelse.trim(),
      typeKategori: typeKategori.trim() || 'Udefineret',
      fakturaDato,
      fakturaBeloeb: Number(fakturaBeloeb),
      fradragsProcent: Number(fradragsProcent),
      fradragIDKK,
      revisorNotat: revisorNotat.trim(),
    };

    if (editingId) {
      onUpdateFradrag(editingId, data);
    } else {
      onAddFradrag(data);
    }
    setIsModalOpen(false);
  };

  // Group fradrag by category
  const categories = Array.from(new Set(fradragList.map((f) => f.typeKategori || 'Udefineret')));

  const totalFaktura = fradragList.reduce((sum, f) => sum + (Number(f.fakturaBeloeb) || 0), 0);
  const totalFradrag = fradragList.reduce((sum, f) => sum + (Number(f.fradragIDKK) || 0), 0);
  const weightedPercentage = totalFaktura > 0 ? Math.round((totalFradrag / totalFaktura) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-stone-700" />
            Fradrag (Rubrik 29) — Indkomstår {indkomstAar.aar}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Driftsomkostninger direkte tilknyttet din B-indkomst. Vises i årsopgørelsens Rubrik 29.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAiScanner}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-900 text-xs font-semibold transition border border-stone-300"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            Scan Kvittering med AI
          </button>
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Nyt Fradrag
          </button>
        </div>
      </div>

      {/* Rubrik 29-loft Advarsel (Forretningsregel) */}
      {skatteBeregning.rubrik29LoftOverskredet && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950">
            <span className="font-bold block text-sm">
              OBS: Grænse for Rubrik 29 er overskredet!
            </span>
            Dine samlede fradrag i Rubrik 29 ({skatteBeregning.oevrigeFradragRubrik29.toLocaleString('da-DK')} DKK inkl. kørsel) 
            overstiger din B-indkomst efter AM-bidrag ({skatteBeregning.maksTilladtFradragRubrik29.toLocaleString('da-DK')} DKK). 
            Ifølge dansk skattelovgivning kan B-indkomstfradrag ikke give underskud i personlig indkomst. 
            Det overskydende beløb ({skatteBeregning.overskydendeFradrag.toLocaleString('da-DK')} DKK) kan ikke modregnes i år.
          </div>
        </div>
      )}

      {/* Grouped Table */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Fradragsberettiget Omkostning</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Fakturadato</th>
                <th className="py-3 px-4 text-right">Fakturabeløb (DKK)</th>
                <th className="py-3 px-4 text-center">Fradrag %</th>
                <th className="py-3 px-4 text-right">Fradrag i DKK</th>
                <th className="py-3 px-4 text-right">Handlinger</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 text-stone-800">
              {fradragList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    Ingen fradrag oprettet for {indkomstAar.aar}. Scan en kvittering eller opret en manuelt.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const itemsInCat = fradragList.filter((f) => (f.typeKategori || 'Udefineret') === cat);
                  const subFaktura = itemsInCat.reduce((sum, f) => sum + (Number(f.fakturaBeloeb) || 0), 0);
                  const subFradrag = itemsInCat.reduce((sum, f) => sum + (Number(f.fradragIDKK) || 0), 0);

                  return (
                    <React.Fragment key={cat}>
                      {/* Category Header */}
                      <tr className="bg-stone-50/90 font-semibold text-stone-700">
                        <td colSpan={3} className="py-2 px-4">
                          {cat} ({itemsInCat.length} poster)
                        </td>
                        <td className="py-2 px-4 text-right font-mono text-stone-600">
                          {subFaktura.toLocaleString('da-DK')} DKK
                        </td>
                        <td className="py-2 px-4 text-center"></td>
                        <td className="py-2 px-4 text-right font-mono text-emerald-800 font-bold">
                          {subFradrag.toLocaleString('da-DK')} DKK
                        </td>
                        <td className="py-2 px-4"></td>
                      </tr>

                      {/* Items */}
                      {itemsInCat.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-50/50 transition">
                          <td className="py-3 px-4 font-medium text-stone-900 pl-8">
                            <div>{item.beskrivelse}</div>
                            {item.revisorNotat && (
                              <div className="text-[11px] text-stone-400 font-normal mt-0.5">
                                {item.revisorNotat}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-stone-500">{item.typeKategori}</td>
                          <td className="py-3 px-4 text-stone-600">{item.fakturaDato}</td>
                          <td className="py-3 px-4 text-right font-mono text-stone-700">
                            {item.fakturaBeloeb.toLocaleString('da-DK')} DKK
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 font-semibold text-stone-700 text-[11px]">
                              {item.fradragsProcent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                            {item.fradragIDKK.toLocaleString('da-DK')} DKK
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                title="Rediger"
                                onClick={() => openEditModal(item)}
                                className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Slet"
                                onClick={() => onDeleteFradrag(item.id)}
                                className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-stone-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Sumline Footer */}
            {fradragList.length > 0 && (
              <tfoot className="border-t-2 border-stone-200 bg-stone-50 font-bold text-stone-900">
                <tr>
                  <td colSpan={3} className="py-3.5 px-4">
                    Samlet Fradragskatalog ({fradragList.length} poster)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm">
                    {totalFaktura.toLocaleString('da-DK')} DKK
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs text-stone-500 font-medium">
                    Gns. {weightedPercentage}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm text-emerald-800">
                    {totalFradrag.toLocaleString('da-DK')} DKK
                  </td>
                  <td className="py-3.5 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-6">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
                <h3 className="font-bold text-stone-900 text-base">
                  {editingId ? 'Rediger Fradragspost' : 'Nyt Driftsfradrag (Rubrik 29)'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Fradragsberettiget omkostning *
                  </label>
                  <input
                    type="text"
                    required
                    value={beskrivelse}
                    onChange={(e) => setBeskrivelse(e.target.value)}
                    placeholder="fx Parkering Musikhus, Togbillet DSB, Shure mikrofon"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      Kategori / Type *
                    </label>
                    <select
                      value={typeKategori}
                      onChange={(e) => setTypeKategori(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white"
                    >
                      <option value="Transport">Transport / Tog / Fly</option>
                      <option value="Parkering">Parkering</option>
                      <option value="Broafgift">Broafgift / Færge</option>
                      <option value="Udstyr">Udstyr & Grej</option>
                      <option value="Hotel/Forplejning">Hotel & Ophold</option>
                      <option value="Software">Software & Licenser</option>
                      <option value="Andet">Andet</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      Fakturadato *
                    </label>
                    <input
                      type="date"
                      required
                      value={fakturaDato}
                      onChange={(e) => setFakturaDato(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Fakturabeløb & Procent */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      Fakturabeløb i DKK (inkl. moms) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1}
                      value={fakturaBeloeb || ''}
                      onChange={(e) => setFakturaBeloeb(Number(e.target.value))}
                      placeholder="fx 850"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      Fradragsprocent *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={fradragsProcent}
                        onChange={(e) => setFradragsProcent(Math.min(100, Math.max(1, Number(e.target.value))))}
                        className="w-20 px-3 py-2 border border-stone-300 rounded-lg text-xs font-bold text-center"
                      />
                      <span className="text-stone-500 font-bold">%</span>
                      <span className="text-[11px] text-stone-400">
                        (100% ved rent erhverv)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Beregnet fradrag i DKK */}
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-900 font-medium">Endeligt fradrag i Rubrik 29:</span>
                  <span className="text-emerald-950 font-bold font-mono text-sm">
                    {fradragIDKK.toLocaleString('da-DK')} DKK
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Revisorbemærkning / Notat (valgfri)
                  </label>
                  <input
                    type="text"
                    value={revisorNotat}
                    onChange={(e) => setRevisorNotat(e.target.value)}
                    placeholder="fx 50% vurderet grundet blandet privat/erhvervsbrug"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 shadow-xs"
                >
                  {editingId ? 'Gem ændringer' : 'Tilføj fradrag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
