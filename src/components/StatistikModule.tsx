import React from 'react';
import {
  BarChart3,
  Clock,
  DollarSign,
  TrendingUp,
  PieChart,
  CalendarDays,
  Percent
} from 'lucide-react';
import { Job, IndkomstAar } from '../types';

interface Props {
  jobs: Job[];
  indkomstAar: IndkomstAar;
}

export const StatistikModule: React.FC<Props> = ({ jobs, indkomstAar }) => {
  // Aggregate by Type
  const typeMap: Record<
    string,
    { honorar: number; count: number; timerJob: number; timerTotal: number }
  > = {};

  // Aggregate by Month
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
  ];
  const monthTotals: number[] = Array(12).fill(0);

  // Aggregate by Weekday
  const weekdayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
  const weekdayTotals: number[] = Array(7).fill(0);

  let totalHonorar = 0;
  let totalTimerJob = 0;
  let totalTimerForberedelse = 0;

  jobs.forEach((j) => {
    const t = j.type || 'Standard';
    const h = Number(j.honorar) || 0;
    const tj = Number(j.timerJob) || 0;
    const tf = Number(j.timerTransportForberedelse) || 0;
    const tt = tj + tf;

    totalHonorar += h;
    totalTimerJob += tj;
    totalTimerForberedelse += tf;

    if (!typeMap[t]) {
      typeMap[t] = { honorar: 0, count: 0, timerJob: 0, timerTotal: 0 };
    }
    typeMap[t].honorar += h;
    typeMap[t].count += 1;
    typeMap[t].timerJob += tj;
    typeMap[t].timerTotal += tt;

    if (j.startDato) {
      const d = new Date(j.startDato);
      if (!isNaN(d.getTime())) {
        monthTotals[d.getMonth()] += h;
        weekdayTotals[d.getDay()] += h;
      }
    }
  });

  const totalTimerAlt = totalTimerJob + totalTimerForberedelse;
  const effektivTimeloenJob = totalTimerJob > 0 ? Math.round(totalHonorar / totalTimerJob) : 0;
  const effektivTimeloenAlt = totalTimerAlt > 0 ? Math.round(totalHonorar / totalTimerAlt) : 0;

  const maxMonthHonorar = Math.max(1, ...monthTotals);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-stone-700" />
            Statistik & Timelønsanalyse — {indkomstAar.aar}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Nedbrydning af honorarer, tidsforbrug, effektiv timeløn og sæsonudsving.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block">Antal Jobs</span>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-1">{jobs.length}</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block">Timer på Job</span>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-1">{totalTimerJob} t</div>
          <span className="text-[11px] text-stone-400 mt-0.5 block">
            + {totalTimerForberedelse} t forberedelse/transport
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block">Timeløn (Jobtimer)</span>
          <div className="text-2xl font-bold font-mono text-blue-900 mt-1">
            {effektivTimeloenJob.toLocaleString('da-DK')} DKK/t
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block">Effektiv Timeløn i alt</span>
          <div className="text-2xl font-bold font-mono text-emerald-900 mt-1">
            {effektivTimeloenAlt.toLocaleString('da-DK')} DKK/t
          </div>
          <span className="text-[11px] text-stone-400 mt-0.5 block">
            Inkl. transport & forberedelse
          </span>
        </div>
      </div>

      {/* Type Breakdown Table */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
          <h3 className="font-bold text-stone-900 text-sm">B-indkomst & Timeløn fordelt pr. Type</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Kategori / Type</th>
                <th className="py-3 px-4 text-center">Antal Jobs</th>
                <th className="py-3 px-4 text-right">Samlet Honorar</th>
                <th className="py-3 px-4 text-center">Andel</th>
                <th className="py-3 px-4 text-right">Timer (Job)</th>
                <th className="py-3 px-4 text-right">Timeløn (Job)</th>
                <th className="py-3 px-4 text-right">Effektiv Timeløn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {Object.keys(typeMap).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    Ingen data at vise endnu.
                  </td>
                </tr>
              ) : (
                Object.entries(typeMap).map(([typeName, stats]) => {
                  const pct = totalHonorar > 0 ? Math.round((stats.honorar / totalHonorar) * 100) : 0;
                  const rateJob = stats.timerJob > 0 ? Math.round(stats.honorar / stats.timerJob) : 0;
                  const rateTotal = stats.timerTotal > 0 ? Math.round(stats.honorar / stats.timerTotal) : 0;

                  return (
                    <tr key={typeName} className="hover:bg-stone-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-stone-900">{typeName}</td>
                      <td className="py-3 px-4 text-center">{stats.count}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {stats.honorar.toLocaleString('da-DK')} DKK
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 font-semibold text-stone-700">
                          {pct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-stone-600">
                        {stats.timerJob} t
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-900 font-semibold">
                        {rateJob > 0 ? `${rateJob.toLocaleString('da-DK')} DKK/t` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-900 font-bold">
                        {rateTotal > 0 ? `${rateTotal.toLocaleString('da-DK')} DKK/t` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly distribution chart (CSS bar chart) */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <h3 className="font-bold text-stone-900 text-sm mb-4">
          B-indkomst fordelt pr. måned ({indkomstAar.aar})
        </h3>
        <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end h-40 pt-4 border-b border-stone-200">
          {monthTotals.map((amount, idx) => {
            const heightPct = Math.round((amount / maxMonthHonorar) * 100);
            return (
              <div key={monthNames[idx]} className="flex flex-col items-center h-full justify-end group">
                <div
                  style={{ height: `${Math.max(4, heightPct)}%` }}
                  className={`w-full rounded-t transition-all ${
                    amount > 0 ? 'bg-stone-800 group-hover:bg-stone-950' : 'bg-stone-200'
                  }`}
                  title={`${monthNames[idx]}: ${amount.toLocaleString('da-DK')} DKK`}
                />
                <span className="text-[10px] sm:text-xs text-stone-500 mt-2 font-medium">
                  {monthNames[idx]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-right text-xs text-stone-400">
          Beløb beregnet ud fra jobbets afholdelsesdato
        </div>
      </div>
    </div>
  );
};
