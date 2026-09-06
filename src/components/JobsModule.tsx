import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Car,
  Bike,
  Users,
  Copy,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Download,
  Check,
  AlertCircle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Job, TransportMiddel, IndkomstAar } from '../types';
import { SKATTESATSER } from '../data/danishTaxData';
import { createGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarExport';

interface Props {
  jobs: Job[];
  indkomstAar: IndkomstAar;
  onAddJob: (job: Omit<Job, 'id'>) => void;
  onUpdateJob: (id: string, job: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  onOpenAiScanner: () => void;
}

export const JobsModule: React.FC<Props> = ({
  jobs,
  indkomstAar,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onOpenAiScanner,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Form State
  const [hvervgiver, setHvervgiver] = useState('');
  const [honorar, setHonorar] = useState<number>(0);
  const [startDato, setStartDato] = useState(new Date().toISOString().split('T')[0]);
  const [slutDato, setSlutDato] = useState(new Date().toISOString().split('T')[0]);
  const [betalingsDato, setBetalingsDato] = useState(new Date().toISOString().split('T')[0]);
  const [transportmiddel, setTransportmiddel] = useState<TransportMiddel>('NONE');
  const [antalKm, setAntalKm] = useState<number>(0);
  const [antalTure, setAntalTure] = useState<number>(1);
  const [destinationAdresse, setDestinationAdresse] = useState('');
  const [amBidragFritaget, setAmBidragFritaget] = useState(false);
  const [type, setType] = useState('Musik');
  const [timerJob, setTimerJob] = useState<number>(4);
  const [timerTransportForberedelse, setTimerTransportForberedelse] = useState<number>(2);
  const [noter, setNoter] = useState('');

  const calculateKoerselsfradrag = (
    transport: TransportMiddel,
    km: number,
    ture: number
  ): number => {
    if (transport === 'NONE' || km <= 0) return 0;
    let takst = 0;
    if (transport === 'OWN_CAR_MC') takst = SKATTESATSER.takstBilMCPrKm;
    else if (transport === 'OWN_BIKE') takst = SKATTESATSER.takstCykelPrKm;
    else if (transport === 'PASSENGER') takst = SKATTESATSER.takstPassagerPrKm;

    return Math.round(km * takst * (ture || 1));
  };

  const calculatedFradrag = calculateKoerselsfradrag(transportmiddel, antalKm, antalTure);

  const resetForm = () => {
    setEditingJobId(null);
    setHvervgiver('');
    setHonorar(0);
    setStartDato(new Date().toISOString().split('T')[0]);
    setSlutDato(new Date().toISOString().split('T')[0]);
    setBetalingsDato(new Date().toISOString().split('T')[0]);
    setTransportmiddel('NONE');
    setAntalKm(0);
    setAntalTure(1);
    setDestinationAdresse('');
    setAmBidragFritaget(false);
    setType('Musik');
    setTimerJob(4);
    setTimerTransportForberedelse(2);
    setNoter('');
  };

  const openNewJobModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setEditingJobId(job.id);
    setHvervgiver(job.hvervgiver);
    setHonorar(job.honorar);
    setStartDato(job.startDato);
    setSlutDato(job.slutDato);
    setBetalingsDato(job.betalingsDato);
    setTransportmiddel(job.transportmiddel);
    setAntalKm(job.antalKm);
    setAntalTure(job.antalTure || 1);
    setDestinationAdresse(job.destinationAdresse || '');
    setAmBidragFritaget(job.amBidragFritaget);
    setType(job.type || 'Musik');
    setTimerJob(job.timerJob || 0);
    setTimerTransportForberedelse(job.timerTransportForberedelse || 0);
    setNoter(job.noter || '');
    setIsModalOpen(true);
  };

  const handleCopyJob = (job: Job) => {
    const copied: Omit<Job, 'id'> = {
      ...job,
      hvervgiver: `${job.hvervgiver} (Kopi)`,
    };
    onAddJob(copied);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hvervgiver.trim() || honorar <= 0) return;

    const jobData: Omit<Job, 'id'> = {
      indkomstAarId: indkomstAar.id,
      hvervgiver: hvervgiver.trim(),
      honorar: Number(honorar),
      startDato,
      slutDato,
      betalingsDato,
      transportmiddel,
      antalKm: Number(antalKm),
      antalTure: Number(antalTure),
      destinationAdresse: destinationAdresse.trim(),
      koerselsFradrag: calculatedFradrag,
      amBidragFritaget,
      type: type.trim(),
      timerJob: Number(timerJob),
      timerTransportForberedelse: Number(timerTransportForberedelse),
      noter: noter.trim(),
    };

    if (editingJobId) {
      onUpdateJob(editingJobId, jobData);
    } else {
      onAddJob(jobData);
    }
    setIsModalOpen(false);
  };

  const totalHonorar = jobs.reduce((sum, j) => sum + (Number(j.honorar) || 0), 0);
  const totalKoersel = jobs.reduce((sum, j) => sum + (Number(j.koerselsFradrag) || 0), 0);

  const exportJobsCSV = () => {
    const headers = ['Hvervgiver', 'Honorar DKK', 'Startdato', 'Betalingsdato', 'Transport', 'Km', 'Fradrag DKK', 'Type'];
    const rows = jobs.map((j) => [
      `"${j.hvervgiver}"`,
      j.honorar,
      j.startDato,
      j.betalingsDato,
      j.transportmiddel,
      j.antalKm,
      j.koerselsFradrag,
      `"${j.type || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jobs-${indkomstAar.aar}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-stone-700" />
            Jobs & Kørsel — Indkomstår {indkomstAar.aar}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Registrering af honorarjobs, udbetalingsdatoer og kørsel. Statens takster anvendes automatisk.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAiScanner}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-900 text-xs font-semibold transition border border-stone-300"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            Scan Kontrakt med AI
          </button>
          <button
            type="button"
            onClick={openNewJobModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Nyt Honorarjob
          </button>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Hvervgiver</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Honorar</th>
                <th className="py-3 px-4">Transport / Kørsel</th>
                <th className="py-3 px-4 text-right">Kørselsfradrag</th>
                <th className="py-3 px-4">Datoer</th>
                <th className="py-3 px-4 text-center">Kalender</th>
                <th className="py-3 px-4 text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    Ingen jobs oprettet for {indkomstAar.aar} endnu. Klik på "Scan Kontrakt med AI" eller "Nyt Honorarjob".
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-stone-50/60 transition group">
                    <td className="py-3.5 px-4 font-semibold text-stone-900">
                      <div>{job.hvervgiver}</div>
                      {job.destinationAdresse && (
                        <div className="text-[11px] text-stone-400 font-normal truncate max-w-xs">
                          {job.destinationAdresse}
                        </div>
                      )}
                      {job.amBidragFritaget && (
                        <span className="inline-block mt-0.5 text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                          AM-fritaget
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium text-[11px]">
                        {job.type || 'Standard'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-stone-900 font-mono text-sm">
                      {job.honorar.toLocaleString('da-DK')} DKK
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {job.transportmiddel === 'OWN_CAR_MC' && (
                        <span className="inline-flex items-center gap-1 text-stone-700">
                          <Car className="w-3.5 h-3.5 text-blue-600" />
                          Egen bil ({job.antalKm} km)
                        </span>
                      )}
                      {job.transportmiddel === 'OWN_BIKE' && (
                        <span className="inline-flex items-center gap-1 text-stone-700">
                          <Bike className="w-3.5 h-3.5 text-emerald-600" />
                          Cykel ({job.antalKm} km)
                        </span>
                      )}
                      {job.transportmiddel === 'PASSENGER' && (
                        <span className="inline-flex items-center gap-1 text-stone-700">
                          <Users className="w-3.5 h-3.5 text-amber-600" />
                          Passager ({job.antalKm} km)
                        </span>
                      )}
                      {job.transportmiddel === 'NONE' && (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium">
                      {job.koerselsFradrag > 0 ? (
                        <span
                          className={
                            job.transportmiddel === 'PASSENGER'
                              ? 'text-amber-800'
                              : 'text-emerald-800 font-semibold'
                          }
                        >
                          {job.koerselsFradrag.toLocaleString('da-DK')} DKK
                          <span className="text-[10px] block font-normal text-stone-400">
                            {job.transportmiddel === 'PASSENGER' ? 'Rubrik 51' : 'Rubrik 29'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-stone-300">0 DKK</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      <div>Job: {job.startDato}</div>
                      {job.betalingsDato && (
                        <div className="text-[11px] text-stone-400">Udbet: {job.betalingsDato}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Føj til Google Kalender"
                          onClick={() => window.open(createGoogleCalendarUrl(job), '_blank')}
                          className="p-1 rounded text-stone-400 hover:text-blue-600 hover:bg-stone-100"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Hent .ics fil til Apple/Outlook"
                          onClick={() => downloadIcsFile(job)}
                          className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Kopier job"
                          onClick={() => handleCopyJob(job)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Rediger job"
                          onClick={() => openEditModal(job)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Slet job"
                          onClick={() => onDeleteJob(job.id)}
                          className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-stone-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Sumline Footer */}
            {jobs.length > 0 && (
              <tfoot className="border-t-2 border-stone-200 bg-stone-50 font-bold text-stone-900">
                <tr>
                  <td className="py-3 px-4">I alt ({jobs.length} jobs)</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-stone-950">
                    {totalHonorar.toLocaleString('da-DK')} DKK
                  </td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-emerald-800">
                    {totalKoersel.toLocaleString('da-DK')} DKK
                  </td>
                  <td colSpan={3} className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={exportJobsCSV}
                      className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 underline"
                    >
                      <Download className="w-3 h-3" />
                      Eksporter CSV
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden my-6">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
                <h3 className="font-bold text-stone-900 text-base">
                  {editingJobId ? 'Rediger Honorarjob' : 'Opret Nyt Honorarjob'}
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
                {/* Hvervgiver & Honorar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      Hvervgiver / Kunde *
                    </label>
                    <input
                      type="text"
                      required
                      value={hvervgiver}
                      onChange={(e) => setHvervgiver(e.target.value)}
                      placeholder="fx Musikhuset, Danmarks Radio, Forening"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-stone-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">
                      Honorar i DKK (før skat) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={honorar || ''}
                      onChange={(e) => setHonorar(Number(e.target.value))}
                      placeholder="fx 5000"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-stone-800"
                    />
                  </div>
                </div>

                {/* Datoer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Startdato *</label>
                    <input
                      type="date"
                      required
                      value={startDato}
                      onChange={(e) => setStartDato(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Slutdato</label>
                    <input
                      type="date"
                      value={slutDato}
                      onChange={(e) => setSlutDato(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Betalingsdato</label>
                    <input
                      type="date"
                      value={betalingsDato}
                      onChange={(e) => setBetalingsDato(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Transportmiddel kontrol */}
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                  <div>
                    <label className="font-semibold text-stone-800 block mb-1">
                      Transportmiddel *
                    </label>
                    <select
                      value={transportmiddel}
                      onChange={(e) => setTransportmiddel(e.target.value as TransportMiddel)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-white"
                    >
                      <option value="NONE">Ingen transport / ikke brugt eget transportmiddel</option>
                      <option value="OWN_CAR_MC">Egen bil eller motorcykel (3,79 kr/km - Rubrik 29)</option>
                      <option value="OWN_BIKE">Egen cykel, knallert (0,63 kr/km - Rubrik 29)</option>
                      <option value="PASSENGER">Passager i bil/MC (2,23 kr/km - Rubrik 51)</option>
                    </select>
                  </div>

                  {transportmiddel !== 'NONE' && (
                    <div className="space-y-3 pt-2 border-t border-stone-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-stone-700 block mb-1">
                            Antal kilometer (tur/retur)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={antalKm || ''}
                            onChange={(e) => setAntalKm(Number(e.target.value))}
                            placeholder="fx 60"
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-stone-700 block mb-1">
                            Antal ture
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setAntalTure(Math.max(1, antalTure - 1))}
                              className="px-2.5 py-1.5 border border-stone-300 rounded bg-white font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={antalTure}
                              onChange={(e) => setAntalTure(Math.max(1, Number(e.target.value)))}
                              className="w-16 px-2 py-1.5 border border-stone-300 rounded text-center text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => setAntalTure(antalTure + 1)}
                              className="px-2.5 py-1.5 border border-stone-300 rounded bg-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 block mb-1">
                          Destination / Spillested (Adresse B)
                        </label>
                        <input
                          type="text"
                          value={destinationAdresse}
                          onChange={(e) => setDestinationAdresse(e.target.value)}
                          placeholder="fx Vester Allé 15, 8000 Aarhus"
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="text-emerald-900 font-medium">Beregnet kørselsfradrag:</span>
                        <span className="text-emerald-950 font-bold font-mono text-sm">
                          {calculatedFradrag.toLocaleString('da-DK')} DKK
                          <span className="text-[10px] font-normal text-emerald-800 ml-1">
                            ({transportmiddel === 'PASSENGER' ? 'Rubrik 51' : 'Rubrik 29'})
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Udvidede felter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Jobtype</label>
                    <input
                      type="text"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      placeholder="fx Musik, Foredrag"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Timer på job</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      value={timerJob || ''}
                      onChange={(e) => setTimerJob(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-stone-700 block mb-1">Timer forberedelse</label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      value={timerTransportForberedelse || ''}
                      onChange={(e) => setTimerTransportForberedelse(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* AM-bidragsfritagelse Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="amFritaget"
                    checked={amBidragFritaget}
                    onChange={(e) => setAmBidragFritaget(e.target.checked)}
                    className="rounded border-stone-300 text-stone-900 focus:ring-0"
                  />
                  <label htmlFor="amFritaget" className="text-xs text-stone-700 cursor-pointer">
                    Der skal <strong>ikke</strong> betales AM-bidrag af dette honorar (fx biblioteksafgift, Copydan, Gramex, legater, kunststøtte)
                  </label>
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
                  {editingJobId ? 'Gem ændringer' : 'Opret job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
