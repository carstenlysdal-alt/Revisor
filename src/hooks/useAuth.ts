import { useCallback, useEffect, useState } from 'react';
import { api, type AuthStatus } from '../lib/api';

export type AuthTilstand = 'tjekker' | 'aaben' | 'kraever-login' | 'utilgaengelig';

/**
 * Holder styr på, om brugeren er lukket ind.
 *
 * "aaben" dækker to tilfælde: enten er der logget ind, eller også kører appen
 * lokalt uden kodeord. Serveren afgør hvilket, og den lukker kun loopback ind
 * i det sidste tilfælde.
 */
export function useAuth() {
  const [tilstand, setTilstand] = useState<AuthTilstand>('tjekker');
  const [status, setStatus] = useState<AuthStatus | null>(null);

  const tjek = useCallback(async () => {
    try {
      const s = await api.authStatus();
      setStatus(s);
      setTilstand(s.loggetInd ? 'aaben' : 'kraever-login');
    } catch {
      setTilstand('utilgaengelig');
    }
  }, []);

  useEffect(() => {
    void tjek();
  }, [tjek]);

  const logUd = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setTilstand('kraever-login');
  }, []);

  return { tilstand, status, tjekIgen: tjek, logUd };
}
