import { useCallback, useEffect, useState } from 'react';

export interface Visning {
  fane: string;
  aar: string | null;
}

const læsFraUrl = (standardFane: string): Visning => {
  const p = new URLSearchParams(window.location.search);
  return { fane: p.get('fane') || standardFane, aar: p.get('aar') };
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
        const samlet = { ...forrige, ...næste };
        const p = new URLSearchParams();
        p.set('fane', samlet.fane);
        if (samlet.aar) p.set('aar', samlet.aar);
        const url = `${window.location.pathname}?${p.toString()}`;
        if (erstat) window.history.replaceState({}, '', url);
        else window.history.pushState({}, '', url);
        return samlet;
      });
    },
    []
  );

  return { visning, naviger };
}
