import type { Fradrag, IndkomstAar, Investering, Job, OpsparingsTracker } from '../types';

export const INITIAL_INDKOMSTAAR: IndkomstAar[] = [
  {
    id: 'aar-2026', aar: 2026, hjemmeadresse: '', kommune: 'København',
    kommuneSkatteprocent: 23.5, kirkeskatteprocent: 0.8,
    forventetAIndkomst: 0, forventetPensionSUDagpenge: 0,
    forventedeFradragAIndkomst: 0, medlemFolkekirken: false,
    enligForsoerger: false, laast: false,
  },
];

export const INITIAL_JOBS: Job[] = [];
export const INITIAL_FRADRAG: Fradrag[] = [];
export const INITIAL_INVESTERINGER: Investering[] = [];
export const INITIAL_OPSPARING: Record<string, OpsparingsTracker> = {};
