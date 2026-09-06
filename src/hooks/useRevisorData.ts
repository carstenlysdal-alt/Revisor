import { useCallback, useEffect, useState } from 'react';
import { ApiFejl, api, type DataSnapshot } from '../lib/api';
import type {
  Fradrag,
  IndkomstAar,
  Investering,
  Job,
  OpsparingsTracker,
} from '../types';

const tomt: DataSnapshot = {
  indkomstAar: [],
  jobs: [],
  fradrag: [],
  investeringer: [],
  opsparing: {},
  bilag: [],
};

export type IndlaesningsTilstand = 'indlaeser' | 'klar' | 'fejl';

/**
 * Al data kommer fra serveren. Skrivninger sendes med det samme og lægges
 * først ind lokalt, når serveren har bekræftet dem. Slår en skrivning fejl,
 * står tallet uændret på skærmen, og brugeren får fejlen at se. Det er
 * vigtigere end at UI'et føles hurtigt: et fradrag, der ser gemt ud uden at
 * være det, opdages først ved årsopgørelsen.
 */
export function useRevisorData(aktiv: boolean) {
  const [data, setData] = useState<DataSnapshot>(tomt);
  const [tilstand, setTilstand] = useState<IndlaesningsTilstand>('indlaeser');
  const [fejl, setFejl] = useState<string | null>(null);

  const hent = useCallback(async () => {
    setTilstand('indlaeser');
    setFejl(null);
    try {
      setData(await api.hentAlt());
      setTilstand('klar');
    } catch (err) {
      setFejl(err instanceof ApiFejl ? err.message : 'Data kunne ikke hentes.');
      setTilstand('fejl');
    }
  }, []);

  useEffect(() => {
    if (aktiv) void hent();
  }, [aktiv, hent]);

  const opsæt = <T extends { id: string }>(liste: T[], post: T): T[] => {
    const i = liste.findIndex((p) => p.id === post.id);
    if (i < 0) return [post, ...liste];
    const kopi = [...liste];
    kopi[i] = post;
    return kopi;
  };

  const gemIndkomstAar = useCallback(async (aar: IndkomstAar) => {
    const gemt = await api.gemIndkomstAar(aar);
    setData((d) => ({ ...d, indkomstAar: opsæt(d.indkomstAar, gemt) }));
    return gemt;
  }, []);

  const sletIndkomstAar = useCallback(async (id: string) => {
    await api.sletIndkomstAar(id);
    setData((d) => ({
      ...d,
      indkomstAar: d.indkomstAar.filter((a) => a.id !== id),
      jobs: d.jobs.filter((j) => j.indkomstAarId !== id),
      fradrag: d.fradrag.filter((f) => f.indkomstAarId !== id),
      investeringer: d.investeringer.filter((i) => i.indkomstAarId !== id),
    }));
  }, []);

  const gemJob = useCallback(async (job: Job) => {
    const gemt = await api.gemJob(job);
    setData((d) => ({ ...d, jobs: opsæt(d.jobs, gemt) }));
    return gemt;
  }, []);

  const sletJob = useCallback(async (id: string) => {
    await api.sletJob(id);
    setData((d) => ({ ...d, jobs: d.jobs.filter((j) => j.id !== id) }));
  }, []);

  const gemFradrag = useCallback(async (fradrag: Fradrag) => {
    const gemt = await api.gemFradrag(fradrag);
    setData((d) => ({ ...d, fradrag: opsæt(d.fradrag, gemt) }));
    return gemt;
  }, []);

  const sletFradrag = useCallback(async (id: string) => {
    await api.sletFradrag(id);
    setData((d) => ({ ...d, fradrag: d.fradrag.filter((f) => f.id !== id) }));
  }, []);

  const gemInvestering = useCallback(async (inv: Investering) => {
    const gemt = await api.gemInvestering(inv);
    setData((d) => ({ ...d, investeringer: opsæt(d.investeringer, gemt) }));
    return gemt;
  }, []);

  const sletInvestering = useCallback(async (id: string) => {
    await api.sletInvestering(id);
    setData((d) => ({
      ...d,
      investeringer: d.investeringer.filter((i) => i.id !== id),
    }));
  }, []);

  const gemOpsparing = useCallback(
    async (indkomstAarId: string, opsparing: OpsparingsTracker) => {
      await api.gemOpsparing(indkomstAarId, opsparing);
      setData((d) => ({
        ...d,
        opsparing: { ...d.opsparing, [indkomstAarId]: opsparing },
      }));
    },
    []
  );

  const tilfoejBilag = useCallback((bilag: DataSnapshot['bilag'][number]) => {
    setData((d) =>
      d.bilag.some((b) => b.id === bilag.id) ? d : { ...d, bilag: [bilag, ...d.bilag] }
    );
  }, []);

  return {
    data,
    tilstand,
    fejl,
    hentIgen: hent,
    gemIndkomstAar,
    sletIndkomstAar,
    gemJob,
    sletJob,
    gemFradrag,
    sletFradrag,
    gemInvestering,
    sletInvestering,
    gemOpsparing,
    tilfoejBilag,
  };
}
