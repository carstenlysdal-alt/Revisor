import React, { useEffect, useMemo, useState } from 'react';

/**
 * Standardvisningen for "AI'en arbejder".
 *
 * Konfigurationen er fast og kopieret fra chatmodul-standarden. Rør kun
 * phrases, som skal beskrive faser, der faktisk sker. Et generisk spinner er
 * ikke godt nok, når vi ved mere end "der sker noget".
 */
export const KINETIC_LOADER_CONFIG = {
  variant: 'cascade',
  prefixGlyph: '\\',
  charDelayMs: 14,
  crossfadeMs: 260,
  rotateIntervalMs: 2400,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 14,
} as const;

interface Props {
  faser: string[];
  /** Sat når serveren melder en konkret fase. Ellers roterer visningen selv. */
  aktivFase?: string | null;
  stoerrelse?: number;
}

export function KineticLoader({ faser, aktivFase, stoerrelse }: Props) {
  const [indeks, setIndeks] = useState(0);
  const [synlig, setSynlig] = useState(true);
  const reducerBevaegelse = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Roterer kun, når serveren ikke selv fortæller, hvilken fase der er i gang.
  useEffect(() => {
    if (aktivFase || faser.length <= 1) return;

    const id = window.setInterval(() => {
      setSynlig(false);
      window.setTimeout(() => {
        setIndeks((i) => (i + 1) % faser.length);
        setSynlig(true);
      }, KINETIC_LOADER_CONFIG.crossfadeMs);
    }, KINETIC_LOADER_CONFIG.rotateIntervalMs);

    return () => window.clearInterval(id);
  }, [aktivFase, faser.length]);

  const tekst = aktivFase ?? faser[indeks] ?? '';

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex items-baseline gap-2"
      style={{
        fontFamily: KINETIC_LOADER_CONFIG.fontFamily,
        fontSize: stoerrelse ?? KINETIC_LOADER_CONFIG.fontSize,
      }}
    >
      <span aria-hidden="true" className="text-ink">
        {KINETIC_LOADER_CONFIG.prefixGlyph}
      </span>
      <span className="text-ink-muted">
        {reducerBevaegelse ? (
          tekst
        ) : (
          <span key={tekst}>
            {tekst.split('').map((tegn, i) => (
              <span
                key={`${tekst}-${i}`}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'pre',
                  opacity: synlig ? 1 : 0,
                  transform: synlig ? 'translateY(0)' : 'translateY(2px)',
                  transition: `opacity ${KINETIC_LOADER_CONFIG.crossfadeMs}ms cubic-bezier(0.22,1,0.36,1) ${
                    synlig ? i * KINETIC_LOADER_CONFIG.charDelayMs : 0
                  }ms, transform ${KINETIC_LOADER_CONFIG.crossfadeMs}ms cubic-bezier(0.22,1,0.36,1) ${
                    synlig ? i * KINETIC_LOADER_CONFIG.charDelayMs : 0
                  }ms`,
                }}
              >
                {tegn}
              </span>
            ))}
          </span>
        )}
      </span>
    </p>
  );
}
