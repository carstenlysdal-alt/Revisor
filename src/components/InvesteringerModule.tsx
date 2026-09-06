import React, { useState } from 'react';
import { Layers, Plus, Trash2, Calendar, FileText, Info } from 'lucide-react';
import { Investering, IndkomstAar } from '../types';

interface Props {
  investeringer: Investering[];
  indkomstAar: IndkomstAar;
  onAddInvestering: (inv: Omit<Investering, 'id'>) => void;
  onDeleteInvestering: (id: string) => void;
}

export const InvesteringerModule: React.FC<Props> = ({
  investeringer,
  indkomstAar,
  onAddInvestering,
  onDeleteInvestering,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titel, setTitel] = useState('');
  const [beloeb, setBeloeb] = useState<number>(0);
  const [fakturaDato, setFakturaDato] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titel.trim() || beloeb <= 0) return;

    onAddInvestering({
      indkomstAarId: indkomstAar.id,
      titel: titel.trim(),
      beloeb: Number(beloeb),
      fakturaDato,
      bilagNavne: ['faktura_investering.pdf'],
    });

    setTitel('');
    setBeloeb(0);
    setIsModalOpen(false);
  };

  const totalInvesteringer = investeringer.reduce((sum, i) => sum + (Number(i.beloeb) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-stone-700" />
            Investeringer & Anlægsaktiver — {indkomstAar.aar}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Registrering af større udstyrsindkøb og instrumenter adskilt fra de løbende driftsfradrag.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Registrer Investering
        </button>
      </div>

      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>Revisorbemærkning om afskrivning vs. straksafskrivning:</strong>
          <p className="mt-0.5 text-stone-600">
            Mindre anskaffelser under bundgrænsen for småaktiver (ca. 33.100 kr.) kan straksafskrives fuldt ud under driftsfradrag i Rubrik 29. 
            Større anlæg opbevares her til dokumentation og eventuel saldometode-afskrivning.
          </p>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Investering / Aktiv</th>
                <th className="py-3 px-4">Fakturadato</th>
                <th className="py-3 px-4 text-right">Beløb i DKK (inkl. moms)</th>
                <th className="py-3 px-4 text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {investeringer.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-stone-400">
                    Ingen investeringer registreret for {indkomstAar.aar}.
                  </td>
                </tr>
              ) : (
                investeringer.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-3.5 px-4 font-semibold text-stone-900">{inv.titel}</td>
                    <td className="py-3.5 px-4 text-stone-600">{inv.fakturaDato}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                      {inv.beloeb.toLocaleString('da-DK')} DKK
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteInvestering(inv.id)}
                        className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-stone-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {investeringer.length > 0 && (
              <tfoot className="border-t-2 border-stone-200 bg-stone-50 font-bold text-stone-900">
                <tr>
                  <td className="py-3 px-4">I alt</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    {totalInvesteringer.toLocaleString('da-DK')} DKK
                  </td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden my-6">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
                <h3 className="font-bold text-stone-900 text-base">Registrer Investering</h3>
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
                    Aktiv / Investering *
                  </label>
                  <input
                    type="text"
                    required
                    value={titel}
                    onChange={(e) => setTitel(e.target.value)}
                    placeholder="fx MacBook Pro M3, Flygel, Studiegrej"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Beløb i DKK (inkl. moms) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={beloeb || ''}
                    onChange={(e) => setBeloeb(Number(e.target.value))}
                    placeholder="fx 18500"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Fakturadato *</label>
                  <input
                    type="date"
                    required
                    value={fakturaDato}
                    onChange={(e) => setFakturaDato(e.target.value)}
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
                  Gem investering
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
