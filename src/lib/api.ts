import type {
  Bilag,
  BilagsAnalyse,
  Fradrag,
  IndkomstAar,
  Investering,
  Job,
  Kladde,
  OpsparingsTracker,
} from '../types';

export interface DataSnapshot {
  indkomstAar: IndkomstAar[];
  jobs: Job[];
  fradrag: Fradrag[];
  investeringer: Investering[];
  opsparing: Record<string, OpsparingsTracker>;
  bilag: Bilag[];
}

/** Bærer serverens egen fejlbesked videre, så brugeren får den at se. */
export class ApiFejl extends Error {
  constructor(besked: string, public readonly status: number) {
    super(besked);
    this.name = 'ApiFejl';
  }
}

async function kald<T>(sti: string, init?: RequestInit): Promise<T> {
  let svar: Response;
  try {
    svar = await fetch(`/api${sti}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiFejl('Der er ikke forbindelse til serveren. Kører den?', 0);
  }

  if (!svar.ok) {
    const krop = await svar.json().catch(() => ({}));
    throw new ApiFejl(krop.fejl || `Serveren svarede med fejl ${svar.status}.`, svar.status);
  }

  return svar.status === 204 ? (undefined as T) : ((await svar.json()) as T);
}

const gem = <T>(sti: string, krop: unknown) =>
  kald<T>(sti, { method: 'PUT', body: JSON.stringify(krop) });

const slet = (sti: string) => kald<void>(sti, { method: 'DELETE' });

export interface AuthStatus {
  kraeverLogin: boolean;
  loggetInd: boolean;
  kunLokalt: boolean;
}

export const api = {
  authStatus: () => kald<AuthStatus>('/auth/status'),
  login: (kodeord: string) =>
    kald<{ loggetInd: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ kodeord }),
    }),
  logout: () => kald<{ loggetInd: boolean }>('/auth/logout', { method: 'POST' }),

  hentAlt: () => kald<DataSnapshot>('/data'),
  aiStatus: () =>
    kald<{
      klar: boolean;
      udbyder: string | null;
      modeller: { tekst: string; billede: string } | null;
    }>('/ai/status'),

  gemIndkomstAar: (a: IndkomstAar) => gem<IndkomstAar>(`/indkomstaar/${a.id}`, a),
  sletIndkomstAar: (id: string) => slet(`/indkomstaar/${id}`),

  gemJob: (j: Job) => gem<Job>(`/jobs/${j.id}`, j),
  sletJob: (id: string) => slet(`/jobs/${id}`),

  gemFradrag: (f: Fradrag) => gem<Fradrag>(`/fradrag/${f.id}`, f),
  sletFradrag: (id: string) => slet(`/fradrag/${id}`),

  gemInvestering: (i: Investering) => gem<Investering>(`/investeringer/${i.id}`, i),
  sletInvestering: (id: string) => slet(`/investeringer/${id}`),

  gemOpsparing: (indkomstAarId: string, data: OpsparingsTracker) =>
    gem<void>(`/opsparing/${indkomstAarId}`, data),

  uploadBilag: (fil: { data: string; mimeType: string; filnavn: string }) =>
    kald<{ bilag: Bilag; dublet: Kladde['dublet'] | null }>('/bilag', {
      method: 'POST',
      body: JSON.stringify(fil),
    }),

  sletBilag: (id: string) => slet(`/bilag/${id}`),

  bilagUrl: (id: string) => `/api/bilag/${id}/fil`,

  analyserBilag: (bilagId: string) =>
    kald<{ id: string; bilag: Bilag; analyse: BilagsAnalyse }>('/ai/analyser-bilag', {
      method: 'POST',
      body: JSON.stringify({ bilagId }),
    }),

  rutestatus: () => kald<{ klar: boolean }>('/ruter/status'),

  beregnAfstand: (fra: string, til: string) =>
    kald<{ km: number }>(`/ruter/afstand?${new URLSearchParams({ fra, til }).toString()}`),

  googleDriveStatus: () =>
    kald<{
      konfigureret: boolean;
      forbundet: boolean;
      forbundetTidspunkt: string | null;
      sidsteFejl: string | null;
      sidsteFejlTidspunkt: string | null;
    }>('/google/status'),

  googleDriveAfbryd: () => kald<{ ok: true }>('/google/afbryd', { method: 'POST' }),
};

/** Læser en fil som base64 uden data-URL-præfikset. */
export function filTilBase64(fil: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const læser = new FileReader();
    læser.onload = () => {
      const resultat = String(læser.result);
      const komma = resultat.indexOf(',');
      resolve(komma >= 0 ? resultat.slice(komma + 1) : resultat);
    };
    læser.onerror = () => reject(new Error('Filen kunne ikke læses fra disken.'));
    læser.readAsDataURL(fil);
  });
}
