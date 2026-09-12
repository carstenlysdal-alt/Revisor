import { useEffect, useState } from 'react';
import { Archive, Download, History, Loader2, RotateCcw } from 'lucide-react';
import { listAppSnapshots, type AppData, type AppDataSnapshot } from '../utils/appDatabase';
import { downloadYearBackup } from '../utils/backup';
import { mergeYearData } from '../utils/yearArchive';

interface Props {
  appData: AppData;
  yearId: string;
  year: number;
  onRestore: (data: AppData) => void;
  onMessage: (message: string) => void;
}

const dateFormatter = new Intl.DateTimeFormat('da-DK', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function counts(snapshot: AppDataSnapshot, yearId: string): string {
  const data = snapshot.appData;
  const jobs = data.jobs.filter((item) => item.indkomstAarId === yearId).length;
  const deductions = data.fradragList.filter((item) => item.indkomstAarId === yearId).length;
  const investments = data.investeringer.filter((item) => item.indkomstAarId === yearId).length;
  return `${jobs} jobs · ${deductions} fradrag · ${investments} investeringer`;
}

export function YearArchiveControls({ appData, yearId, year, onRestore, onMessage }: Props) {
  const [snapshots, setSnapshots] = useState<AppDataSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setSnapshots([]);
    const timer = window.setTimeout(() => {
      listAppSnapshots(yearId)
        .then((items) => { if (!cancelled) setSnapshots(items); })
        .catch(() => { if (!cancelled) onMessage('Versionshistorikken kunne ikke læses.'); })
        .finally(() => { if (!cancelled) setIsLoading(false); });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [appData, yearId]);

  const exportYear = async () => {
    setIsExporting(true);
    try {
      await downloadYearBackup(appData, yearId);
      onMessage(`Årsarkiv for ${year} er hentet.`);
    } catch (error: unknown) {
      onMessage(error instanceof Error ? error.message : 'Årsarkivet kunne ikke oprettes.');
    } finally {
      setIsExporting(false);
    }
  };

  const restore = (snapshot: AppDataSnapshot) => {
    const timestamp = dateFormatter.format(new Date(snapshot.createdAt));
    if (!window.confirm(`Vil du gendanne ${year} til versionen fra ${timestamp}? Dine andre indkomstår bevares.`)) return;
    try {
      onRestore(mergeYearData(appData, snapshot.appData, yearId));
      onMessage(`${year} er gendannet. Den tidligere tilstand er bevaret i historikken.`);
    } catch (error: unknown) {
      onMessage(error instanceof Error ? error.message : 'Versionen kunne ikke gendannes.');
    }
  };

  return (
    <section className="max-w-3xl mx-auto bg-white border border-stone-200 rounded-xl p-6 shadow-xs" aria-labelledby="year-archive-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="year-archive-title" className="text-lg font-bold flex items-center gap-2">
            <Archive className="w-5 h-5" aria-hidden="true" />Årsarkiv {year}
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-stone-500">
            Appen gemmer automatisk en ny lokal version, når dine oplysninger ændres. Bilag bevares også, hvis en post slettes.
          </p>
        </div>
        <button type="button" onClick={exportYear} disabled={isExporting}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Eksporter {year}
        </button>
      </div>

      <div className="mt-5 border-t border-stone-100 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-600">
            <History className="h-4 w-4" aria-hidden="true" />Automatiske versioner
          </h3>
          {!isLoading && <span className="text-[11px] text-stone-500">{snapshots.length} gemte versioner</span>}
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 py-5 text-xs text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Læser arkivet…</div>
        ) : snapshots.length === 0 ? (
          <p className="rounded-lg bg-stone-50 px-4 py-4 text-xs text-stone-500">Første version oprettes automatisk ved næste gemte ændring.</p>
        ) : (
          <ol className="max-h-72 divide-y divide-stone-100 overflow-y-auto border-y border-stone-100">
            {snapshots.map((snapshot, index) => (
              <li key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 py-3 pr-1">
                <div>
                  <p className="text-xs font-semibold text-stone-800">
                    {dateFormatter.format(new Date(snapshot.createdAt))}{index === 0 ? ' · Seneste' : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-500">{counts(snapshot, yearId)}</p>
                </div>
                <button type="button" onClick={() => restore(snapshot)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Gendan
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-amber-800">
        Det automatiske arkiv ligger i denne browser. Hent også en komplet backup fra toppen af appen, så data kan gendannes efter tab af browser eller enhed.
      </p>
    </section>
  );
}
