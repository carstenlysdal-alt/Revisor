import { useCallback, useEffect, useState } from 'react';

export interface Visning {
  fane: string;
  aar: string | null;
}

export function normaliserFane(fane: string | null | undefined, standardFane = 'forside'): string {
  if (!fane) return standardFane;
  const ren = fane.toLowerCase().replace(/^[#/]+/, '').trim();
  if (ren === 'jobs' || ren === 'job' || ren === 'indkomst' || ren === 'indkomster' || ren === 'honorar') {
    return 'indtaegter';
  }
  if (ren === 'udgifter' || ren === 'udgift') {
    return 'fradrag';
  }
  if (ren === 'kørsel' || ren === 'bil' || ren === 'transport') {
    return 'koersel';
  }
  if (ren === 'investering' || ren === 'anlæg') {
    return 'investeringer';
  }
  if (ren === 'skat' || ren === 'skatteoverblik') {
    return 'overblik';
  }
  if (ren === 'årsopgørelse') {
    return 'aarsopgoerelse';
  }
  return ren || standardFane;
}

const KENDTE_FANER = new Set([
  'forside',
  'indtaegter',
  'koersel',
  'fradrag',
  'overblik',
  'aarsopgoerelse',
  'opsparing',
  'statistik',
  'investeringer',
  'dokumentation',
]);

const læsFraUrl = (standardFane: string): Visning => {
  const p = new URLSearchParams(window.location.search);
  const qFane = p.get('fane');
  const pathSegment = window.location.pathname.replace(/^\/+/, '').split('/')[0];
  const normaliseretPath = normaliserFane(pathSegment, '');
  const raaFane = qFane || (KENDTE_FANER.has(normaliseretPath) ? normaliseretPath : standardFane);
  return { fane: normaliserFane(raaFane, standardFane), aar: p.get('aar') };
};

/**
 * Holder den aktive fane og det valgte indkomstår i URL'en.
 *
 * Uden dette gør browserens tilbage-knap ingenting, og et genindlæs kaster
 * brugeren tilbage til startfanen. Begge dele er noget, folk opdager med det
 * samme og aldrig tilgiver.
 */
export function useUrlState(standardFane: string) {
  const [visning, setVisning] = useState<Visning>(() => læsFraUrl(standardFane));

  useEffect(() => {
    const påPopState = () => setVisning(læsFraUrl(standardFane));
    window.addEventListener('popstate', påPopState);
    return () => window.removeEventListener('popstate', påPopState);
  }, [standardFane]);

  const naviger = useCallback(
    (næste: Partial<Visning>, erstat = false) => {
      setVisning((forrige) => {
        const samlet = {
          ...forrige,
          ...næste,
          ...(næste.fane ? { fane: normaliserFane(næste.fane, standardFane) } : {}),
        };
        const p = new URLSearchParams();
        p.set('fane', samlet.fane);
        if (samlet.aar) p.set('aar', samlet.aar);
        const url = `/?${p.toString()}`;
        if (erstat) window.history.replaceState({}, '', url);
        else window.history.pushState({}, '', url);
        return samlet;
      });
    },
    [standardFane]
  );

  return { visning, naviger };
}

