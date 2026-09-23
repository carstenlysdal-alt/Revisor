import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

interface Props {
  id?: string;
  value: string;
  onChange: (vaerdi: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Tekstfelt til adresser og steder med automatisk forslag fra DAWA og OpenStreetMap.
 * Følger DESIGN.md's rolige monokrome æstetik.
 */
export function AdresseInput({
  id,
  value,
  onChange,
  placeholder = 'Søg adresse, by eller spillested…',
  disabled = false,
  className = '',
  autoFocus = false,
}: Props) {
  const [forslag, setForslag] = useState<{ tekst: string; type: 'adresse' | 'sted' }[]>([]);
  const [visForslag, setVisForslag] = useState(false);
  const [indeks, setIndeks] = useState(-1);
  const beholderRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const q = value?.trim();
    if (!q || q.length < 2) {
      setForslag([]);
      setVisForslag(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const svar = await api.soegAdresse(q);
        setForslag(svar);
        setVisForslag(svar.length > 0);
        setIndeks(-1);
      } catch {
        setForslag([]);
      }
    }, 250);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  useEffect(() => {
    function klikUdenfor(e: MouseEvent) {
      if (beholderRef.current && !beholderRef.current.contains(e.target as Node)) {
        setVisForslag(false);
      }
    }
    document.addEventListener('mousedown', klikUdenfor);
    return () => document.removeEventListener('mousedown', klikUdenfor);
  }, []);

  const vaelgForslag = (tekst: string) => {
    onChange(tekst);
    setVisForslag(false);
    setForslag([]);
  };

  const haandterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visForslag || forslag.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndeks((prev) => (prev < forslag.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndeks((prev) => (prev > 0 ? prev - 1 : forslag.length - 1));
    } else if (e.key === 'Enter' && indeks >= 0 && indeks < forslag.length) {
      e.preventDefault();
      vaelgForslag(forslag[indeks]!.tekst);
    } else if (e.key === 'Escape') {
      setVisForslag(false);
    }
  };

  return (
    <div ref={beholderRef} className="relative w-full">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (forslag.length > 0) setVisForslag(true);
        }}
        onKeyDown={haandterKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        className={`w-full rounded-[4px] border border-rule-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint disabled:bg-sunk disabled:text-ink-muted ${className}`}
      />
      {visForslag && forslag.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-[4px] border border-rule-strong bg-surface py-1 shadow-lg"
        >
          {forslag.map((f, idx) => {
            const erAktiv = idx === indeks;
            return (
              <li
                key={`${f.tekst}-${idx}`}
                role="option"
                aria-selected={erAktiv}
                onClick={() => vaelgForslag(f.tekst)}
                onMouseEnter={() => setIndeks(idx)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs overgang ${
                  erAktiv
                    ? 'bg-sunk font-medium text-ink'
                    : 'text-ink-muted hover:bg-sunk hover:text-ink'
                }`}
              >
                <span className="truncate">{f.tekst}</span>
                <span className="shrink-0 text-2xs uppercase tracking-wider text-ink-faint">
                  {f.type === 'sted' ? 'Sted' : 'Adresse'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
