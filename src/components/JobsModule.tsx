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
  Download,
  Inbox
} from 'lucide-react';
import type { IndkomstRubrik, Job, JobStatus, TransportMiddel, IndkomstAar } from '../types';
import { getSkatteRegler } from '../data/danishTaxData';
import { calculateAaretsKoerselsfradragMedPoster, calculateJobKoerselsfradrag } from '../utils/mileageCalculator';
import { createGoogleCalendarUrl, downloadIcsFile } from '../utils/calendarExport';
import { BilagButton } from './BilagButton';
import { KildeTekst } from './KildeTekst';
import { useModal } from '../hooks/useModal';

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
  useModal(isModalOpen, () => setIsModalOpen(false));

  // Form State
  const [hvervgiver, setHvervgiver] = useState('');
  const [honorar, setHonorar] = useState<number>(0);
  const [startDato, setStartDato] = useState(new Date().toISOString().slice(0, 10));
  const [slutDato, setSlutDato] = useState(new Date().toISOString().slice(0, 10));
  const [betalingsDato, setBetalingsDato] = useState(new Date().toISOString().slice(0, 10));
  const [transportmiddel, setTransportmiddel] = useState<TransportMiddel>('NONE');
  const [antalKm, setAntalKm] = useState<number>(0);
  const [antalTure, setAntalTure] = useState<number>(1);
  const [destinationAdresse, setDestinationAdresse] = useState('');
  const [amBidragFritaget, setAmBidragFritaget] = useState(false);
  const [type, setType] = useState('Musik');
  const [timerJob, setTimerJob] = useState<number>(4);
  const [timerTransportForberedelse, setTimerTransportForberedelse] = useState<number>(2);
  const [noter, setNoter] = useState('');
  const [rubrik, setRubrik] = useState<IndkomstRubrik>(12);
  const [status, setStatus] = useState<JobStatus>('PLANLAGT');
  const regler = getSkatteRegler(indkomstAar.aar);
  const calculatedFradrag = calculateJobKoerselsfradrag(indkomstAar.aar, transportmiddel, antalKm, antalTure);

  const resetForm = () => {
    setEditingJobId(null);
    setHvervgiver('');
    setHonorar(0);
    setStartDato(new Date().toISOString().slice(0, 10));
    setSlutDato(new Date().toISOString().slice(0, 10));
    setBetalingsDato(new Date().toISOString().slice(0, 10));
    setTransportmiddel('NONE');
    setAntalKm(0);
    setAntalTure(1);
    setDestinationAdresse('');
    setAmBidragFritaget(false);
    setType('Musik');
    setTimerJob(4);
    setTimerTransportForberedelse(2);
    setNoter('');
    setRubrik(12);
    setStatus('PLANLAGT');
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
    setRubrik(job.rubrik ?? 12);
    setStatus(job.status ?? 'PLANLAGT');
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
      rubrik,
      status,
    };

    if (editingJobId) {
      onUpdateJob(editingJobId, jobData);
    } else {
      onAddJob(jobData);
    }
    setIsModalOpen(false);
  };

  const totalHonorar = jobs.reduce((sum, j) => sum + (Number(j.honorar) || 0), 0);
  const aaretsKoersel = calculateAaretsKoerselsfradragMedPoster(indkomstAar.aar, jobs);
  const totalKoersel = aaretsKoersel.rubrik29 + aaretsKoersel.rubrik51;

  const exportJobsCSV = () => {
    const headers = ['Hvervgiver', 'Honorar DKK', 'Startdato', 'Betalingsdato', 'Transport', 'Km', 'Fradrag DKK', 'Type'];
    const csvCell = (value: string | number) => {
      const raw = String(value);
      const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const rows = jobs.map((j) => [
      j.hvervgiver,
      j.honorar,
      j.startDato,
      j.betalingsDato,
      j.transportmiddel,
      j.antalKm,
      aaretsKoersel.prJob[j.id] ?? 0,
      j.type || '',
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
    const encodedUri = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jobs-${indkomstAar.aar}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(encodedUri);
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
            <Inbox className="w-4 h-4 text-amber-700" />
            Fortæl agenten
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
                    Ingen jobs oprettet for {indkomstAar.aar} endnu. Klik på "Fortæl agenten" eller "Nyt Honorarjob".
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const beregnetKoerselsfradrag = aaretsKoersel.prJob[job.id] ?? 0;
                  return (
                  <tr key={job.id} className="hover:bg-stone-50/60 transition group">
                    <td className="py-3.5 px-4 font-semibold text-stone-900">
                      <div>{job.hvervgiver}</div>
                      <span className="text-[10px] text-stone-500">Rubrik {job.rubrik ?? 12} · {job.status === 'BETALT' ? 'Betalt' : job.status === 'AFLYST' ? 'Aflyst' : 'Planlagt'}</span>
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
                      <BilagButton ids={job.bilagIds} names={job.bilagNavne} />
                      <KildeTekst text={job.kildeTekst} />
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
                      {beregnetKoerselsfradrag > 0 ? (
                        <span
                          className={
                            job.transportmiddel === 'PASSENGER'
                              ? 'text-amber-800'
                              : 'text-emerald-800 font-semibold'
                          }
                        >
                          {beregnetKoerselsfradrag.toLocaleString('da-DK')} DKK
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
                          aria-label={`Føj ${job.hvervgiver} til Google Kalender`}
                          onClick={() => window.open(createGoogleCalendarUrl(job), '_blank', 'noopener,noreferrer')}
                          className="p-1 rounded text-stone-400 hover:text-blue-600 hover:bg-stone-100"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Hent .ics fil til Apple/Outlook"
                          aria-label={`Hent kalenderfil for ${job.hvervgiver}`}
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
                          aria-label={`Kopier job for ${job.hvervgiver}`}
                          onClick={() => handleCopyJob(job)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Rediger job"
                          aria-label={`Rediger job for ${job.hvervgiver}`}
                          onClick={() => openEditModal(job)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Slet job"
                          aria-label={`Slet job for ${job.hvervgiver}`}
                          onClick={() => onDeleteJob(job.id)}
                          className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-stone-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label={editingJobId ? 'Rediger honorarjob' : 'Opret honorarjob'}>
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden my-6">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
                <h3 className="font-bold text-stone-900 text-base">
                  {editingJobId ? 'Rediger Honorarjob' : 'Opret Nyt Honorarjob'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Luk jobformular"
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
                      <option value="OWN_CAR_MC">Egen bil eller motorcykel ({regler.takstBilMCFoerste20k.toLocaleString('da-DK')} kr/km op til 20.000 km - Rubrik 29)</option>
                      <option value="OWN_BIKE">Egen cykel eller knallert ({regler.takstCykelPrKm.toLocaleString('da-DK')} kr/km - Rubrik 29)</option>
                      <option value="PASSENGER">Almindeligt befordringsfradrag (afstandstrin - Rubrik 51)</option>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="font-semibold text-stone-700">Indkomstrubrik
                    <select value={rubrik} onChange={(event) => setRubrik(Number(event.target.value) as IndkomstRubrik)} className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-lg bg-white">
                      <option value={12}>Rubrik 12 — honorar/B-indkomst</option>
                      <option value={17}>Rubrik 17 — særlig indkomst/legat</option>
                    </select>
                  </label>
                  <label className="font-semibold text-stone-700">Betalingsstatus
                    <select value={status} onChange={(event) => setStatus(event.target.value as JobStatus)} className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-lg bg-white">
                      <option value="PLANLAGT">Planlagt</option><option value="BETALT">Betalt</option><option value="AFLYST">Aflyst</option>
                    </select>
                  </label>
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
                    Bilaget eller en faglig vurdering dokumenterer, at der ikke skal betales AM-bidrag
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
