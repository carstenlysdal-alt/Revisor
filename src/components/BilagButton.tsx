import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { downloadDocument } from '../utils/documentStore';

interface Props { ids?: string[]; names?: string[]; }

export const BilagButton: React.FC<Props> = ({ ids, names }) => {
  const [error, setError] = useState<string | null>(null);
  if (!names?.length) return null;
  const handleDownload = async () => {
    if (!ids?.[0]) { setError('Kun bilagsnavnet er gemt.'); return; }
    try { await downloadDocument(ids[0]); setError(null); }
    catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Bilaget kunne ikke hentes.'); }
  };
  return (
    <span className="block mt-1">
      <button type="button" onClick={handleDownload} className="inline-flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-900" aria-label={`Hent bilag ${names[0]}`}>
        <Paperclip className="w-3 h-3" aria-hidden="true" />{names[0]}
      </button>
      {error && <span role="alert" className="block text-[10px] text-red-700">{error}</span>}
    </span>
  );
};
