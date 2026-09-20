import { useMemo, useState } from 'react';
import { Paperclip, Search } from 'lucide-react';
import type { Bilag, Fradrag, IndkomstAar, Investering, Job } from '../types';
import { api } from '../lib/api';
import { dato } from '../lib/format';
import {
  Advarsel,
  Knap,
  Modal,
  MobilPost,
  RaekkeKnap,
  Responsiv,
  Sektion,
  Tabel,
  Td,
  Tekstfelt,
  Th,
  TomTilstand,
  Vaelger,
} from './ui';

interface Props {
  bilag: Bilag[];
  jobs: Job[];
  fradrag: Fradrag[];
  investeringer: Investering[];
  indkomstAarListe: IndkomstAar[];
  onGemJob: (job: Job) => Promise<unknown>;
  onGemFradrag: (fradrag: Fradrag) => Promise<unknown>;
  onGemInvestering: (investering: Investering) => Promise<unknown>;
}

/** Den postering et bilag hænger på, uanset hvilken af de tre slags det er. */
interface Tilhoer {
  slags: 'job' | 'fradrag' | 'investering';
  id: string;
  navn: string;
  indkomstAarId: string;
}

const SLAGSNAVN: Record<Tilhoer['slags'], string> = {
  job: 'Indtægt',
  fradrag: 'Udgift',
  investering: 'Investering',
};

function filstoerrelse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Alle bilag ét sted, søgbare.
 *
 * Et bilag kunne før kun findes frem gennem den postering, det var hæftet på.
 * Uploadede man et bilag og fortrød posteringen, blev filen liggende i
 * databasen uden at være synlig nogen steder. Her står de allesammen, og et
 * bilag uden postering er markeret, så det kan hæftes på bagefter.
 */
export function BilagsArkivModule({
  bilag,
  jobs,
  fradrag,
  investeringer,
  indkomstAarListe,
  onGemJob,
  onGemFradrag,
  onGemInvestering,
}: Props) {
  const [soegning, setSoegning] = useState('');
  const [kunLoese, setKunLoese] = useState(false);
  const [haefterPaa, setHaefterPaa] = useState<Bilag | null>(null);
  const [fejl, setFejl] = useState<string | null>(null);

  /** Hvilken postering hvert bilag hænger på. Et bilag kan sidde flere steder. */
  const tilhoerPrBilag = useMemo(() => {
    const kort = new Map<string, Tilhoer[]>();
    const laeg = (t: Tilhoer, bilagIds: string[] | undefined) => {
      for (const id of bilagIds ?? []) {
        const liste = kort.get(id);
        if (liste) liste.push(t);
        else kort.set(id, [t]);
      }
    };
    for (const j of jobs) {
      laeg(
        { slags: 'job', id: j.id, navn: j.hvervgiver || 'Uden navn', indkomstAarId: j.indkomstAarId },
        j.bilagIds
      );
    }
    for (const f of fradrag) {
      laeg(
        {
          slags: 'fradrag',
          id: f.id,
          navn: f.beskrivelse || 'Uden navn',
          indkomstAarId: f.indkomstAarId,
        },
        f.bilagIds
      );
    }
    for (const inv of investeringer) {
      laeg(
        {
          slags: 'investering',
          id: inv.id,
          navn: inv.titel || 'Uden navn',
          indkomstAarId: inv.indkomstAarId,
        },
        inv.bilagIds
      );
    }
    return kort;
  }, [jobs, fradrag, investeringer]);

  const visteBilag = useMemo(() => {
    const soeg = soegning.trim().toLowerCase();
    return [...bilag]
      .sort((a, b) => (a.uploadet < b.uploadet ? 1 : -1))
      .filter((b) => {
        const tilhoer = tilhoerPrBilag.get(b.id) ?? [];
        if (kunLoese && tilhoer.length > 0) return false;
        if (!soeg) return true;
        // Der søges både i filnavnet og i navnet på det, bilaget hænger på,
        // så "Vega" finder kvitteringen, selv om filen hedder scan_0042.pdf.
        const felter = [b.filnavn, dato(b.uploadet), ...tilhoer.map((t) => t.navn)];
        return felter.some((f) => f.toLowerCase().includes(soeg));
      });
  }, [bilag, soegning, kunLoese, tilhoerPrBilag]);

  const antalLoese = useMemo(
    () => bilag.filter((b) => !tilhoerPrBilag.has(b.id)).length,
    [bilag, tilhoerPrBilag]
  );

  const haeftPaaPostering = async (valg: string) => {
    if (!haefterPaa) return;
    setFejl(null);
    const [slags, id] = valg.split(':');
    try {
      if (slags === 'job') {
        const job = jobs.find((j) => j.id === id);
        if (!job) return;
        await onGemJob({ ...job, bilagIds: [...(job.bilagIds ?? []), haefterPaa.id] });
      } else if (slags === 'fradrag') {
        const f = fradrag.find((x) => x.id === id);
        if (!f) return;
        await onGemFradrag({ ...f, bilagIds: [...(f.bilagIds ?? []), haefterPaa.id] });
      } else {
        const inv = investeringer.find((x) => x.id === id);
        if (!inv) return;
        await onGemInvestering({ ...inv, bilagIds: [...(inv.bilagIds ?? []), haefterPaa.id] });
      }
      setHaefterPaa(null);
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Bilaget kunne ikke hæftes på posteringen.');
    }
  };

  const aarFor = (indkomstAarId: string) =>
    indkomstAarListe.find((a) => a.id === indkomstAarId)?.aar;

  const tilhoerTekst = (t: Tilhoer[]) =>
    t.length === 0
      ? null
      : t.map((x) => `${SLAGSNAVN[x.slags]}: ${x.navn}`).join(' · ');

  return (
    <Sektion
      titel="Alle bilag"
      beskrivelse="Hvert bilag, du har lagt ind, ligger her — også dem, der endnu ikke hænger på en postering. Søg på filnavn, dato eller på navnet af det, bilaget hører til."
      id="bilagsarkiv"
    >
      {bilag.length === 0 ? (
        <TomTilstand besked="Der er endnu ikke lagt noget bilag ind. Læs et bilag med Revisor, så havner det her og bliver gemt i databasen." />
      ) : (
        <>
          <div className="ikke-print mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              />
              <Tekstfelt
                value={soegning}
                onChange={(e) => setSoegning(e.target.value)}
                placeholder="Søg i bilag"
                aria-label="Søg i bilag"
                className="pl-9"
              />
            </div>
            {antalLoese > 0 && (
              <RaekkeKnap
                onClick={() => setKunLoese(!kunLoese)}
                aria-pressed={kunLoese}
                className={kunLoese ? 'border-ink bg-sunk' : ''}
              >
                {kunLoese ? 'Vis alle bilag' : `Vis kun løse (${antalLoese})`}
              </RaekkeKnap>
            )}
            <span className="tal text-2xs text-ink-faint">
              {visteBilag.length} af {bilag.length}
            </span>
          </div>

          {fejl && (
            <div className="mb-4">
              <Advarsel titel="Bilaget blev ikke hæftet på">{fejl}</Advarsel>
            </div>
          )}

          {visteBilag.length === 0 ? (
            <TomTilstand besked="Ingen bilag passer på søgningen." />
          ) : (
            <Responsiv
              tabel={
                <Tabel minBredde={720}>
                  <thead>
                    <tr>
                      <Th>Filnavn</Th>
                      <Th>Lagt ind</Th>
                      <Th>Hører til</Th>
                      <Th hoejre>Størrelse</Th>
                      <Th hoejre>{''}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {visteBilag.map((b) => {
                      const tilhoer = tilhoerPrBilag.get(b.id) ?? [];
                      return (
                        <tr key={b.id}>
                          <Td>
                            <a
                              href={api.bilagUrl(b.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-ink underline underline-offset-2"
                            >
                              <Paperclip aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                              {b.filnavn}
                            </a>
                          </Td>
                          <Td tal>{dato(b.uploadet)}</Td>
                          <Td>
                            {tilhoer.length === 0 ? (
                              <span className="text-negative">Ikke hæftet på noget</span>
                            ) : (
                              <span className="text-ink-muted">
                                {tilhoerTekst(tilhoer)}
                                {aarFor(tilhoer[0]!.indkomstAarId) && (
                                  <span className="tal text-ink-faint">
                                    {' '}
                                    ({aarFor(tilhoer[0]!.indkomstAarId)})
                                  </span>
                                )}
                              </span>
                            )}
                          </Td>
                          <Td hoejre tal>
                            {filstoerrelse(b.stoerrelse)}
                          </Td>
                          <Td hoejre>
                            {tilhoer.length === 0 && (
                              <div className="ikke-print flex justify-end">
                                <RaekkeKnap onClick={() => setHaefterPaa(b)}>
                                  Hæft på
                                </RaekkeKnap>
                              </div>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabel>
              }
              liste={
                <>
                  {visteBilag.map((b) => {
                    const tilhoer = tilhoerPrBilag.get(b.id) ?? [];
                    return (
                      <MobilPost
                        key={b.id}
                        titel={b.filnavn}
                        undertitel={
                          tilhoer.length === 0 ? (
                            <span className="text-negative">Ikke hæftet på noget</span>
                          ) : (
                            tilhoerTekst(tilhoer)
                          )
                        }
                        beloeb={dato(b.uploadet)}
                        beloebNote={filstoerrelse(b.stoerrelse)}
                        handlinger={
                          <>
                            <RaekkeKnap
                              onClick={() => window.open(api.bilagUrl(b.id), '_blank')}
                            >
                              Åbn
                            </RaekkeKnap>
                            {tilhoer.length === 0 && (
                              <RaekkeKnap onClick={() => setHaefterPaa(b)}>Hæft på</RaekkeKnap>
                            )}
                          </>
                        }
                      />
                    );
                  })}
                </>
              }
            />
          )}
        </>
      )}

      <Modal
        aaben={haefterPaa !== null}
        onLuk={() => setHaefterPaa(null)}
        titel="Hæft bilaget på en postering"
        beskrivelse={haefterPaa ? haefterPaa.filnavn : undefined}
        bund={<Knap onClick={() => setHaefterPaa(null)}>Annullér</Knap>}
      >
        {jobs.length + fradrag.length + investeringer.length === 0 ? (
          <Advarsel art="neutral" titel="Der er ingen posteringer endnu">
            Opret et job, et fradrag eller en investering først. Så kan bilaget hæftes på.
          </Advarsel>
        ) : (
          <Vaelger
            defaultValue=""
            aria-label="Vælg posteringen, bilaget hører til"
            onChange={(e) => {
              if (e.target.value) void haeftPaaPostering(e.target.value);
            }}
          >
            <option value="">Vælg postering …</option>
            <optgroup label="Indtægter">
              {jobs.map((j) => (
                <option key={j.id} value={`job:${j.id}`}>
                  {j.hvervgiver || 'Uden navn'} — {dato(j.startDato)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Udgifter og fradrag">
              {fradrag.map((f) => (
                <option key={f.id} value={`fradrag:${f.id}`}>
                  {f.beskrivelse || 'Uden navn'} — {dato(f.fakturaDato)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Investeringer">
              {investeringer.map((inv) => (
                <option key={inv.id} value={`investering:${inv.id}`}>
                  {inv.titel || 'Uden navn'} — {dato(inv.fakturaDato)}
                </option>
              ))}
            </optgroup>
          </Vaelger>
        )}
      </Modal>
    </Sektion>
  );
}
