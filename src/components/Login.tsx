import React, { useState } from 'react';
import { ApiFejl, api } from '../lib/api';
import { Advarsel, Felt, Knap } from './ui';

/**
 * Login til én bruger.
 *
 * Appen indeholder honorarer, adresse og bilag med personoplysninger, også om
 * andre end brugeren selv. Der er ingen "fortsæt uden at logge ind".
 */
export function Login({ onLoggetInd }: { onLoggetInd: () => void }) {
  const [kodeord, setKodeord] = useState('');
  const [sender, setSender] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeord || sender) return;

    setSender(true);
    setFejl(null);
    try {
      await api.login(kodeord);
      setKodeord('');
      onLoggetInd();
    } catch (err) {
      setFejl(err instanceof ApiFejl ? err.message : 'Der kunne ikke logges ind.');
      setSender(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          revis
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          Regnskab og skat for B-indkomst.
        </p>
      </div>

      <form onSubmit={send} className="space-y-4 border-t border-rule-strong pt-6">
        {fejl && <Advarsel titel="Der blev ikke logget ind">{fejl}</Advarsel>}

        <Felt label="Kodeord" paakraevet>
          {(id) => (
            <input
              id={id}
              type="password"
              autoComplete="current-password"
              autoFocus
              value={kodeord}
              onChange={(e) => setKodeord(e.target.value)}
              className="w-full rounded-[4px] border border-rule-strong bg-surface px-3 py-3 text-sm text-ink"
            />
          )}
        </Felt>

        <Knap
          art="primaer"
          type="submit"
          disabled={sender || !kodeord}
          className="w-full justify-center py-3"
        >
          {sender ? 'Logger ind' : 'Log ind'}
        </Knap>
      </form>

      <p className="mt-8 border-t border-rule pt-4 text-2xs text-ink-faint">
        Kodeordet er sat på serveren og kan ikke nulstilles herfra. Er det væk, laves
        et nyt med <span className="tal">npm run kodeord</span> og sættes som
        AUTH_PASSWORD_HASH.
      </p>
    </main>
  );
}
