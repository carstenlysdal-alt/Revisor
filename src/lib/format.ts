const kroner = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
const kronerMedOerer = new Intl.NumberFormat('da-DK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const kr = (v: number | null | undefined): string =>
  kroner.format(Math.round(Number(v) || 0));

export const krPraecis = (v: number | null | undefined): string =>
  kronerMedOerer.format(Number(v) || 0);

/** Negative beløb sættes med minus foran, ikke i parentes. */
export const krMedFortegn = (v: number | null | undefined): string => {
  const tal = Math.round(Number(v) || 0);
  return tal > 0 ? `+${kroner.format(tal)}` : kroner.format(tal);
};

export const pct = (v: number | null | undefined, decimaler = 1): string =>
  `${(Number(v) || 0).toFixed(decimaler).replace('.', ',')} %`;

export const dato = (iso: string | undefined | null): string => {
  if (!iso) return '';
  const [aar, maaned, dag] = iso.split('-');
  if (!aar || !maaned || !dag) return iso;
  return `${dag}.${maaned}.${aar}`;
};

export const datoLang = (iso: string | undefined | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const idag = (): string => new Date().toISOString().slice(0, 10);

/**
 * Læser et beløbsfelt, brugeren har tastet i.
 * Både komma og punktum skal virke som decimaltegn, og et tomt felt er 0.
 */
export const talFraFelt = (vaerdi: string): number => {
  const rent = vaerdi.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const tal = parseFloat(rent);
  return Number.isFinite(tal) ? tal : 0;
};

export const timer = (v: number | undefined | null): string => {
  const t = Number(v) || 0;
  if (t === 0) return '';
  const hele = Math.floor(t);
  const minutter = Math.round((t - hele) * 60);
  return minutter === 0 ? `${hele} t` : `${hele} t ${minutter} min`;
};
