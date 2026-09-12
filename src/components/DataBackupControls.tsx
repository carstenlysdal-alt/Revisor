import React, { useRef, useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import type { AppData } from '../utils/appDatabase';
import { downloadBackup, readBackup } from '../utils/backup';

interface Props {
  appData: AppData;
  onImport: (data: AppData) => void;
  onMessage: (message: string) => void;
}

export function DataBackupControls({ appData, onImport, onMessage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isWorking, setIsWorking] = useState(false);

  const exportData = async () => {
    setIsWorking(true);
    try {
      await downloadBackup(appData);
      onMessage('Komplet backup med data, bilag og versionshistorik er hentet.');
    } catch (error: unknown) {
      onMessage(error instanceof Error ? error.message : 'Backup kunne ikke oprettes.');
    } finally {
      setIsWorking(false);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !window.confirm('Vil du indlæse denne backup? En komplet backup erstatter alle data; et årsarkiv erstatter kun det pågældende år.')) return;
    setIsWorking(true);
    try {
      onImport(await readBackup(file, appData));
      onMessage('Backup er gendannet.');
    } catch (error: unknown) {
      onMessage(error instanceof Error ? error.message : 'Backup kunne ikke indlæses.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex items-center gap-1" aria-label="Backup af lokale data">
      <button type="button" onClick={exportData} disabled={isWorking} aria-label="Hent backup"
        className="inline-flex min-h-9 items-center gap-1.5 border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50">
        {isWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        <span className="hidden lg:inline">Backup</span>
      </button>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={isWorking} aria-label="Gendan backup"
        className="inline-flex min-h-9 items-center gap-1.5 border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50">
        <Upload className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Gendan</span>
      </button>
      <input ref={inputRef} type="file" accept="application/json,.json" onChange={importData} className="sr-only" />
    </div>
  );
}
