import React, { useEffect, useId, useRef } from 'react';
import { talFraFelt } from '../lib/format';

/* --------------------------------------------------------------- Struktur */

export function Sektion({
  titel,
  beskrivelse,
  handling,
  children,
  id,
}: {
  titel: string;
  beskrivelse?: string;
  handling?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mb-10">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rule-strong pb-2">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">{titel}</h2>
          {beskrivelse && (
            <p className="mt-0.5 max-w-[68ch] text-2xs text-ink-muted">{beskrivelse}</p>
          )}
        </div>
        {handling && <div className="ikke-print flex shrink-0 gap-2">{handling}</div>}
      </header>
      <div className="pt-1">{children}</div>
    </section>
  );
}

/** Rubriknummeret i margenen. Signaturelementet, jf. DESIGN.md. */
export function Rubrik({ nr, aktiv = false }: { nr: 12 | 17 | 29 | 51; aktiv?: boolean }) {
  return (
    <span
      className={`tal shrink-0 text-2xs tracking-tight ${aktiv ? 'text-ink' : 'text-ink-faint'}`}
      title={`Rubrik ${nr} på årsopgørelsen`}
    >
      {nr}
    </span>
  );
}

export function Tabel({
  children,
  minBredde = 640,
}: {
  children: React.ReactNode;
  minBredde?: number;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full border-collapse text-left" style={{ minWidth: minBredde }}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  hoejre = false,
  bredde,
}: {
  children?: React.ReactNode;
  hoejre?: boolean;
  bredde?: string;
}) {
  return (
    <th
      scope="col"
      style={bredde ? { width: bredde } : undefined}
      className={`border-b border-rule-strong pb-1.5 pr-4 text-2xs font-medium uppercase tracking-wide text-ink-faint last:pr-0 ${
        hoejre ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  hoejre = false,
  tal = false,
  className = '',
}: {
  children?: React.ReactNode;
  hoejre?: boolean;
  tal?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-rule py-2 pr-4 align-top last:pr-0 ${
        hoejre ? 'text-right' : ''
      } ${tal ? 'tal' : ''} ${className}`}
    >
      {children}
    </td>
  );
}

/** Sumlinje. Linje over, nedsænket bund, samme kolonner som rækkerne. */
export function Sumraekke({
  celler,
}: {
  celler: { indhold: React.ReactNode; hoejre?: boolean; tal?: boolean; span?: number }[];
}) {
  return (
    <tr className="bg-sunk font-semibold">
      {celler.map((c, i) => (
        <td
          key={i}
          colSpan={c.span}
          className={`border-t-2 border-rule-strong py-2 pr-4 last:pr-0 ${
            c.hoejre ? 'text-right' : ''
          } ${c.tal ? 'tal' : ''}`}
        >
          {c.indhold}
        </td>
      ))}
    </tr>
  );
}

/* --------------------------------------------------------------- Beskeder */

export function Advarsel({
  children,
  art = 'negativ',
  titel,
}: {
  children: React.ReactNode;
  art?: 'negativ' | 'positiv' | 'neutral';
  titel?: string;
}) {
  const farver =
    art === 'negativ'
      ? 'border-negative/30 bg-negative-ground text-negative'
      : art === 'positiv'
        ? 'border-positive/30 bg-positive-ground text-positive'
        : 'border-rule bg-sunk text-ink-muted';

  return (
    <div role={art === 'negativ' ? 'alert' : undefined} className={`border ${farver} px-3 py-2.5`}>
      {titel && <p className="mb-0.5 text-xs font-semibold">{titel}</p>}
      <div className="text-2xs leading-relaxed">{children}</div>
    </div>
  );
}

export function TomTilstand({
  besked,
  handling,
}: {
  besked: string;
  handling?: React.ReactNode;
}) {
  return (
    <div className="border-b border-rule py-10 text-center">
      <p className="mx-auto max-w-[48ch] text-xs text-ink-muted">{besked}</p>
      {handling && <div className="mt-4 flex justify-center gap-2">{handling}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- Knapper */

type KnapArt = 'primaer' | 'sekundaer' | 'tekst' | 'fare';

const knapStil: Record<KnapArt, string> = {
  primaer: 'bg-ink text-surface hover:bg-ink/90 border border-ink',
  sekundaer: 'border border-rule-strong text-ink hover:bg-sunk',
  tekst: 'text-ink-muted hover:text-ink underline-offset-4 hover:underline',
  fare: 'border border-negative/40 text-negative hover:bg-negative-ground',
};

export function Knap({
  art = 'sekundaer',
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { art?: KnapArt }) {
  return (
    <button
      type="button"
      {...rest}
      className={`overgang inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-45 ${knapStil[art]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IkonKnap({
  label,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`overgang inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-ink-faint hover:bg-sunk hover:text-ink ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Felter */

const feltStil =
  'w-full rounded-[4px] border border-rule-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint disabled:bg-sunk disabled:text-ink-muted';

export function Felt({
  label,
  hjaelp,
  fejl,
  paakraevet,
  children,
}: {
  label: string;
  hjaelp?: string;
  fejl?: string | null;
  paakraevet?: boolean;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-2xs font-medium text-ink-muted">
        {label}
        {paakraevet && <span className="text-negative"> *</span>}
      </label>
      {children(id)}
      {fejl ? (
        <p className="mt-1 text-2xs text-negative">{fejl}</p>
      ) : hjaelp ? (
        <p className="mt-1 text-2xs text-ink-faint">{hjaelp}</p>
      ) : null}
    </div>
  );
}

export function Tekstfelt({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" {...rest} className={`${feltStil} ${className}`} />;
}

/**
 * Beløbsfelt.
 *
 * Værdien holdes som tekst, ikke som tal. Med et tal i value kan feltet ikke
 * tømmes: det snapper tilbage til 0, og man skal markere og overskrive for at
 * rette et beløb. Både komma og punktum virker som decimaltegn.
 */
export function BeloebFelt({
  vaerdi,
  onVaerdi,
  id,
  suffiks = 'kr.',
  ...rest
}: {
  vaerdi: string;
  onVaerdi: (tekst: string) => void;
  id?: string;
  suffiks?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      <input
        {...rest}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={vaerdi}
        onChange={(e) => onVaerdi(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        className={`${feltStil} tal pr-10 text-right`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-ink-faint">
        {suffiks}
      </span>
    </div>
  );
}

export const læsBeloeb = talFraFelt;

export function Datofelt({ className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" {...rest} className={`${feltStil} tal ${className}`} />;
}

export function Vaelger({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${feltStil} ${className}`}>
      {children}
    </select>
  );
}

/** Auto-udvidende tekstfelt. AI-skrevet tekst må aldrig blive klippet. */
export function Notatfelt({
  vaerdi,
  onVaerdi,
  id,
  ...rest
}: {
  vaerdi: string;
  onVaerdi: (tekst: string) => void;
  id?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  const tilpas = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <textarea
      {...rest}
      id={id}
      rows={1}
      value={vaerdi}
      ref={tilpas}
      onChange={(e) => {
        onVaerdi(e.target.value);
        tilpas(e.target);
      }}
      style={{ resize: 'none', overflow: 'hidden' }}
      className={feltStil}
    />
  );
}

export function Afkrydsning({
  label,
  hjaelp,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hjaelp?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        {...rest}
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[oklch(0.21_0.008_75)]"
      />
      <label htmlFor={id} className="text-xs text-ink">
        {label}
        {hjaelp && <span className="mt-0.5 block text-2xs text-ink-faint">{hjaelp}</span>}
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ Modal */

export function Modal({
  aaben,
  onLuk,
  titel,
  beskrivelse,
  bredde = 'max-w-2xl',
  children,
  bund,
}: {
  aaben: boolean;
  onLuk: () => void;
  titel: string;
  beskrivelse?: string;
  bredde?: string;
  children: React.ReactNode;
  bund?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titelId = useId();

  useEffect(() => {
    if (!aaben) return;

    document.body.style.overflow = 'hidden';
    const forrigeFokus = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [href]'
    )?.focus();

    const påTast = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onLuk();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;

      const fokusérbare = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (fokusérbare.length === 0) return;

      const foerste = fokusérbare[0];
      const sidste = fokusérbare[fokusérbare.length - 1];
      if (e.shiftKey && document.activeElement === foerste) {
        e.preventDefault();
        sidste.focus();
      } else if (!e.shiftKey && document.activeElement === sidste) {
        e.preventDefault();
        foerste.focus();
      }
    };

    document.addEventListener('keydown', påTast);
    return () => {
      document.removeEventListener('keydown', påTast);
      document.body.style.overflow = '';
      forrigeFokus?.focus();
    };
  }, [aaben, onLuk]);

  if (!aaben) return null;

  return (
    <div
      className="ikke-print fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-ink/25 sm:items-start sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onLuk();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        className={`min-h-full w-full bg-surface sm:min-h-0 sm:border sm:border-rule-strong sm:shadow-lg ${bredde}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-rule bg-surface px-5 py-4">
          <div>
            <h2 id={titelId} className="font-display text-base font-bold text-ink">
              {titel}
            </h2>
            {beskrivelse && (
              <p className="mt-0.5 max-w-[62ch] text-2xs text-ink-muted">{beskrivelse}</p>
            )}
          </div>
          <IkonKnap label="Luk" onClick={onLuk}>
            <span aria-hidden="true" className="text-lg leading-none">
              &times;
            </span>
          </IkonKnap>
        </header>

        <div className="px-5 py-5">{children}</div>

        {bund && (
          <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-rule bg-sunk px-5 py-3">
            {bund}
          </footer>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Mobil: stakkede rækker */

/**
 * En posteringslinje på mobil.
 *
 * Tabellerne er bygget til at kunne læses som et regnskab på en skærm, hvor
 * kolonnerne flugter. På en telefon virker det ikke: en tabel med syv
 * kolonner bliver til vandret scroll og støj. Her står den samme post
 * stakket, med beløbet som det tunge element og resten som understøttende
 * tekst.
 */
export function MobilPost({
  rubrik,
  titel,
  undertitel,
  beloeb,
  beloebNote,
  meta,
  handlinger,
}: {
  rubrik?: 12 | 17 | 29 | 51;
  titel: string;
  undertitel?: React.ReactNode;
  beloeb: string;
  beloebNote?: string;
  meta?: React.ReactNode;
  handlinger?: React.ReactNode;
}) {
  return (
    <li className="border-b border-rule py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {rubrik && <Rubrik nr={rubrik} aktiv />}
            <span className="truncate font-medium text-ink">{titel}</span>
          </div>
          {undertitel && (
            <div className="mt-0.5 text-2xs text-ink-faint">{undertitel}</div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span className="tal text-base font-semibold text-ink">{beloeb}</span>
          {beloebNote && (
            <span className="block text-2xs text-ink-faint">{beloebNote}</span>
          )}
        </div>
      </div>
      {meta && <div className="mt-1.5 text-2xs text-ink-muted">{meta}</div>}
      {handlinger && (
        <div className="ikke-print mt-2 flex flex-wrap gap-3">{handlinger}</div>
      )}
    </li>
  );
}

export function MobilSum({ tekst, beloeb }: { tekst: string; beloeb: string }) {
  return (
    <li className="flex items-baseline justify-between border-t-2 border-rule-strong bg-sunk px-1 py-3">
      <span className="text-xs font-semibold text-ink">{tekst}</span>
      <span className="tal text-base font-semibold text-ink">{beloeb}</span>
    </li>
  );
}

/** Tabel på skærme fra md og op, stakkede rækker derunder. */
export function Responsiv({
  tabel,
  liste,
}: {
  tabel: React.ReactNode;
  liste: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden md:block">{tabel}</div>
      <ul className="md:hidden">{liste}</ul>
    </>
  );
}
