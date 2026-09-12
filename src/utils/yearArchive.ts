import type { AppData } from './appDatabase';

export function mergeYearData(current: AppData, source: AppData, yearId: string): AppData {
  const sourceYear = source.indkomstAarList.find((year) => year.id === yearId);
  if (!sourceYear) throw new Error('Det valgte indkomstår findes ikke i versionen.');
  const currentYear = current.indkomstAarList.find((year) => year.aar === sourceYear.aar);
  const targetYearId = currentYear?.id ?? sourceYear.id;
  const withoutYear = <T extends { indkomstAarId: string }>(items: T[]) => items.filter((item) => item.indkomstAarId !== targetYearId);
  const fromYear = <T extends { indkomstAarId: string }>(items: T[]) => items
    .filter((item) => item.indkomstAarId === yearId)
    .map((item) => ({ ...item, indkomstAarId: targetYearId }));
  const opsparinger = { ...current.opsparinger };
  if (source.opsparinger[yearId]) opsparinger[targetYearId] = source.opsparinger[yearId];
  else delete opsparinger[targetYearId];
  return {
    activeAarId: targetYearId,
    indkomstAarList: [
      ...current.indkomstAarList.filter((year) => year.id !== targetYearId),
      { ...sourceYear, id: targetYearId },
    ].sort((left, right) => right.aar - left.aar),
    jobs: [...withoutYear(current.jobs), ...fromYear(source.jobs)],
    fradragList: [...withoutYear(current.fradragList), ...fromYear(source.fradragList)],
    investeringer: [...withoutYear(current.investeringer), ...fromYear(source.investeringer)],
    opsparinger,
  };
}
