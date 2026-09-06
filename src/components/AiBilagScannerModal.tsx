import React, { useState } from 'react';
import type {
  Bilag,
  BilagsAnalyse,
  Bilagsklassifikation,
  Fradrag,
  IndkomstAar,
  Investering,
  Job,
  TransportMiddel,
} from '../types';
import { SIKKERHEDSTAERSKEL } from '../types';
import { api, filTilBase64 } from '../lib/api';
import { datoLang, idag, kr } from '../lib/format';
import { KineticLoader } from './KineticLoader';
import {
  Advarsel,
  BeloebFelt,
  Datofelt,
  Felt,
  Knap,
  Modal,
  Notatfelt,
  Tekstfelt,
  Vaelger,
} from './ui';

interface Props {
  aaben: boolean;
  onLuk: () => void;
  indkomstAar: IndkomstAar;
  aiKlar: boolean;
  onGemJob: (job: Job) => Promise<unknown>;
  onGemFradrag: (fradrag: Fradrag) => Promise<unknown>;
  onGemInvestering: (inv: Investering) => Promise<unknown>;
  onNytBilag: (bilag: Bilag) => void;
}

type Trin = 'vaelg' | 'dublet' | 'laeser' | 'kladde' | 'gemt' | 'fejl';

const FASER = [
  'Læser bilaget…',
  'Finder beløb og datoer…',
  'Vurderer hvilken rubrik posten hører til…',
];

/** Sikkerheden pr. felt afgør, om feltet skal fremhæves til manuel kontrol. */
const usikkert = (sikkerhed: number | undefined) =>
  (sikkerhed ?? 0) < SIKKERHEDSTAERSKEL;

function UsikkerMarkering({ sikkerhed }: { sikkerhed: number | undefined }) {
  if (!usikkert(sikkerhed)) return null;
  return (
    <span className="ml-1.5 text-2xs font-normal text-negative">
      usikker aflæsning, kontrollér
    </span>
  );
}

export function AiBilagScannerModal({
  aaben,
  onLuk,
  indkomstAar,
  aiKlar,
  onGemJob,
  onGemFradrag,
  onGemInvestering,
  onNytBilag,
}: Props) {
  const [trin, setTrin] = useState<Trin>('vaelg');
  const [fejl, setFejl] = useState<string | null>(null);
  const [bilag, setBilag] = useState<Bilag | null>(null);
  const [dublet, setDublet] = useState<{ filnavn: string; uploadet: string } | null>(null);
  const [analyse, setAnalyse] = useState<BilagsAnalyse | null>(null);
  const [valgtType, setValgtType] = useState<Bilagsklassifikation>('UKENDT');
  const [gemmer, setGemmer] = useState(false);
  const [landede, setLandede] = useState<{ hvor: string; rubrik: string; beloeb: string } | null>(null);

  // Redigerbare kladdefelter. Alt kan rettes, før noget gemmes.
  const [tekst, setTekst] = useState<Record<string, string>>({});
  const [flag, setFlag] = useState<Record<string, boolean>>({});

  const nulstil = () => {
    setTrin('vaelg');
    setFejl(null);
    setBilag(null);
    setDublet(null);
    setAnalyse(null);
    setValgtType('UKENDT');
    setTekst({});
    setFlag({});
    setLandede(null);
  };

  const luk = () => {
    nulstil();
    onLuk();
  };

  const vaelgFil = async (fil: File) => {
    setFejl(null);
    try {
      const data = await filTilBase64(fil);
      const svar = await api.uploadBilag({
        data,
        mimeType: fil.type || 'application/pdf',
        filnavn: fil.name,
      });

      setBilag(svar.bilag);
      onNytBilag(svar.bilag);

      if (svar.dublet) {
        setDublet({ filnavn: svar.dublet.filnavn, uploadet: svar.dublet.uploadet });
        setTrin('dublet');
      } else {
        await analyser(svar.bilag);
      }
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Filen kunne ikke lægges op.');
      setTrin('fejl');
    }
  };

  const analyser = async (b: Bilag) => {
    setTrin('laeser');
    setFejl(null);
    try {
      const svar = await api.analyserBilag(b.id);
      setAnalyse(svar.analyse);
      setValgtType(svar.analyse.klassifikation);
      forbered(svar.analyse);
      setTrin('kladde');
    } catch (err) {
      setFejl(
        err instanceof Error
          ? err.message
          : 'Bilaget kunne ikke læses. Prøv igen, eller opret posten manuelt.'
      );
      setTrin('fejl');
    }
  };

  /**
   * Lægger udtrækket ind i redigerbare felter.
   * Et felt uden værdi bliver tomt. Der udfyldes aldrig med et gæt.
   */
  const forbered = (a: BilagsAnalyse) => {
    const t: Record<string, string> = {};
    const f: Record<string, boolean> = {};

    const læg = (kilde: Record<string, { vaerdi: unknown }> | undefined) => {
      if (!kilde) return;
      for (const [navn, felt] of Object.entries(kilde)) {
        if (typeof felt?.vaerdi === 'boolean') f[navn] = felt.vaerdi;
        else t[navn] = felt?.vaerdi == null ? '' : String(felt.vaerdi);
      }
    };

    læg(a.job as never);
    læg(a.fradrag as never);
    læg(a.investering as never);
    t.revisorNotat = a.revisorNotat;
    setTekst(t);
    setFlag(f);
  };

  const sik = (gruppe: 'job' | 'fradrag' | 'investering', navn: string): number | undefined =>
    (analyse?.[gruppe] as unknown as Record<string, { sikkerhed: number }> | undefined)?.[
      navn
    ]?.sikkerhed;

  const tal = (navn: string) => Number(String(tekst[navn] ?? '').replace(',', '.')) || 0;

  const gem = async () => {
    if (!bilag) return;
    setGemmer(true);
    setFejl(null);

    try {
      if (valgtType === 'JOB') {
        const start = tekst.startDato || idag();
        await onGemJob({
          id: `job-${Date.now()}`,
          indkomstAarId: indkomstAar.id,
          hvervgiver: tekst.hvervgiver || '',
          honorar: tal('honorar'),
          startDato: start,
          slutDato: tekst.slutDato || start,
          betalingsDato: tekst.betalingsDato || '',
          transportmiddel: (tekst.transportmiddel as TransportMiddel) || 'NONE',
          antalKm: tal('antalKm'),
          antalTure: Math.max(0, Math.round(tal('antalTure'))) || (tal('antalKm') ? 1 : 0),
          destinationAdresse: tekst.destinationAdresse || '',
          amBidragFritaget: Boolean(flag.amBidragFritaget),
          erRubrik17: Boolean(flag.erRubrik17),
          timerJob: tal('timerJob') || undefined,
          timerTransportForberedelse: tal('timerTransportForberedelse') || undefined,
          type: tekst.type || '',
          bilagIds: [bilag.id],
          noter: tekst.revisorNotat || '',
        });
        setLandede({
          hvor: 'Jobs og kørsel',
          rubrik: flag.erRubrik17 ? 'rubrik 17' : 'rubrik 12',
          beloeb: `${kr(tal('honorar'))} kr.`,
        });
      } else if (valgtType === 'FRADRAG') {
        const beloeb = tal('fakturaBeloeb');
        const procent = tekst.fradragsProcent === '' ? 100 : tal('fradragsProcent');
        await onGemFradrag({
          id: `fradrag-${Date.now()}`,
          indkomstAarId: indkomstAar.id,
          beskrivelse: tekst.beskrivelse || '',
          typeKategori: tekst.typeKategori || '',
          fakturaDato: tekst.fakturaDato || idag(),
          fakturaBeloeb: beloeb,
          fradragsProcent: procent,
          fradragIDKK: Math.round((beloeb * procent) / 100),
          bilagIds: [bilag.id],
          revisorNotat: tekst.revisorNotat || '',
        });
        setLandede({
          hvor: 'Fradrag',
          rubrik: 'rubrik 29',
          beloeb: `${kr(Math.round((beloeb * procent) / 100))} kr.`,
        });
      } else if (valgtType === 'INVESTERING') {
        await onGemInvestering({
          id: `inv-${Date.now()}`,
          indkomstAarId: indkomstAar.id,
          titel: tekst.titel || '',
          beloeb: tal('beloeb'),
          fakturaDato: tekst.fakturaDato || idag(),
          bilagIds: [bilag.id],
          noter: tekst.revisorNotat || '',
        });
        setLandede({
          hvor: 'Investeringer',
          rubrik: 'arkivet, uden for skatteberegningen',
          beloeb: `${kr(tal('beloeb'))} kr.`,
        });
      }
      setTrin('gemt');
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Posten kunne ikke gemmes.');
    } finally {
      setGemmer(false);
    }
  };

  const kanGemme =
    valgtType === 'JOB'
      ? Boolean(tekst.hvervgiver?.trim())
      : valgtType === 'FRADRAG'
        ? Boolean(tekst.beskrivelse?.trim())
        : valgtType === 'INVESTERING'
          ? Boolean(tekst.titel?.trim())
          : false;

  return (
    <Modal
      aaben={aaben}
      onLuk={luk}
      titel="Læs et bilag"
      beskrivelse="Kontrakt, honorarnota, faktura eller kvittering. Bilaget bliver gemt, og oplysningerne bliver til en kladde, du godkender."
      bund={
        trin === 'kladde' ? (
          <>
            <Knap onClick={luk}>Annullér</Knap>
            <Knap art="primaer" onClick={gem} disabled={gemmer || !kanGemme}>
              {gemmer ? 'Gemmer' : 'Godkend og opret posten'}
            </Knap>
          </>
        ) : trin === 'gemt' ? (
          <>
            <Knap onClick={luk}>Luk</Knap>
            <Knap art="primaer" onClick={nulstil}>
              Læs et bilag mere
            </Knap>
          </>
        ) : undefined
      }
    >
      {!aiKlar ? (
        <Advarsel titel="Bilagslæsning er slået fra">
          Der er ingen AI-nøgle på serveren. Sæt GEMINI_API_KEY eller DEEPSEEK_API_KEY i .env
          og start serveren igen. Indtil da oprettes posterne manuelt.
        </Advarsel>
      ) : trin === 'vaelg' ? (
        <div className="space-y-3">
          {/* Kameraet står først, fordi kvitteringen som regel ligger på bordet
              og telefonen i hånden. capture="environment" åbner bagkameraet
              direkte i stedet for et filgalleri. */}
          <label className="flex cursor-pointer items-center gap-4 border border-rule-strong bg-ink px-5 py-5 text-surface md:hidden">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const fil = e.target.files?.[0];
                if (fil) void vaelgFil(fil);
              }}
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.3-.75l.6-1a1.5 1.5 0 0 1 1.3-.75h4.2a1.5 1.5 0 0 1 1.3.75l.6 1A1.5 1.5 0 0 0 17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
            <span>
              <span className="block text-sm font-semibold">Tag et billede</span>
              <span className="mt-0.5 block text-2xs opacity-75">
                Hold kvitteringen fladt og fyld billedet ud
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-center justify-center border border-dashed border-rule-strong px-6 py-8 text-center hover:bg-sunk md:py-12">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,application/pdf,image/*"
              className="sr-only"
              onChange={(e) => {
                const fil = e.target.files?.[0];
                if (fil) void vaelgFil(fil);
              }}
            />
            <span>
              <span className="block text-sm font-medium text-ink">Vælg en fil</span>
              <span className="mt-1 block text-2xs text-ink-muted">
                PDF, PNG, JPG, WEBP eller HEIC. Højst 20 MB.
              </span>
            </span>
          </label>

          {fejl && <Advarsel titel="Filen blev ikke lagt op">{fejl}</Advarsel>}
        </div>
      ) : trin === 'dublet' ? (
        <div className="space-y-4">
          <Advarsel titel="Det her bilag ligger allerede i arkivet">
            En fil med præcis samme indhold blev lagt op som {dublet?.filnavn} den{' '}
            {datoLang(dublet?.uploadet ?? '')}. Er det den samme udgift, skal den ikke
            oprettes igen.
          </Advarsel>
          <div className="flex flex-wrap gap-2">
            <Knap onClick={luk}>Det er en dublet, luk</Knap>
            <Knap art="primaer" onClick={() => bilag && analyser(bilag)}>
              Læs det alligevel
            </Knap>
          </div>
        </div>
      ) : trin === 'laeser' ? (
        <div className="py-10">
          <KineticLoader faser={FASER} />
          <p className="mt-4 text-2xs text-ink-faint">{bilag?.filnavn}</p>
        </div>
      ) : trin === 'gemt' && landede ? (
        <div className="py-4">
          <Advarsel art="positiv" titel={`Lagt i ${landede.hvor}`}>
            Posten på {landede.beloeb} er oprettet og tæller nu med i {landede.rubrik}.
            Bilaget hænger på den, så dokumentationen kan findes frem igen.
          </Advarsel>
          <p className="mt-3 text-2xs text-ink-muted">
            Har du flere bilag liggende, er det hurtigere at tage dem nu end at
            lede efter dem i marts.
          </p>
        </div>
      ) : trin === 'fejl' ? (
        <div className="space-y-4">
          <Advarsel titel="Bilaget blev ikke læst">{fejl}</Advarsel>
          <p className="max-w-[64ch] text-2xs text-ink-muted">
            Der bliver ikke gættet på et resultat. Et opfundet beløb, der ser rigtigt ud,
            ender i en årsopgørelse, og det er værre end ingen aflæsning.
          </p>
          <div className="flex gap-2">
            <Knap onClick={nulstil}>Vælg en anden fil</Knap>
            {bilag && (
              <Knap art="primaer" onClick={() => analyser(bilag)}>
                Prøv igen
              </Knap>
            )}
          </div>
        </div>
      ) : analyse ? (
        <div className="space-y-5">
          {analyse.klassifikation === 'UKENDT' ? (
            <Advarsel titel="Bilaget kunne ikke placeres">
              {analyse.resume ||
                'Det står ikke klart, om bilaget er et job, et fradrag eller en investering.'}{' '}
              Vælg selv typen nedenfor. Intet er gemt endnu.
            </Advarsel>
          ) : (
            <p className="max-w-[68ch] text-xs text-ink-muted">{analyse.resume}</p>
          )}

          <Felt label="Posten oprettes som" paakraevet>
            {(id) => (
              <Vaelger
                id={id}
                value={valgtType}
                onChange={(e) => setValgtType(e.target.value as Bilagsklassifikation)}
              >
                <option value="UKENDT">Vælg type</option>
                <option value="JOB">Honorarjob, rubrik 12</option>
                <option value="FRADRAG">Fradrag, rubrik 29</option>
                <option value="INVESTERING">Investering, arkiv</option>
              </Vaelger>
            )}
          </Felt>

          {valgtType === 'JOB' && (
            <div className="space-y-4 border-t border-rule pt-4">
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Felt label="Hvervgiver" paakraevet>
                  {(id) => (
                    <>
                      <Tekstfelt
                        id={id}
                        value={tekst.hvervgiver ?? ''}
                        onChange={(e) => setTekst({ ...tekst, hvervgiver: e.target.value })}
                        className={usikkert(sik('job', 'hvervgiver')) ? 'border-negative' : ''}
                      />
                      <UsikkerMarkering sikkerhed={sik('job', 'hvervgiver')} />
                    </>
                  )}
                </Felt>
                <Felt label="Honorar" paakraevet>
                  {(id) => (
                    <>
                      <BeloebFelt
                        id={id}
                        vaerdi={tekst.honorar ?? ''}
                        onVaerdi={(v) => setTekst({ ...tekst, honorar: v })}
                      />
                      <UsikkerMarkering sikkerhed={sik('job', 'honorar')} />
                    </>
                  )}
                </Felt>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Felt label="Startdato" paakraevet>
                  {(id) => (
                    <>
                      <Datofelt
                        id={id}
                        value={tekst.startDato ?? ''}
                        onChange={(e) => setTekst({ ...tekst, startDato: e.target.value })}
                      />
                      <UsikkerMarkering sikkerhed={sik('job', 'startDato')} />
                    </>
                  )}
                </Felt>
                <Felt label="Slutdato">
                  {(id) => (
                    <Datofelt
                      id={id}
                      value={tekst.slutDato ?? ''}
                      onChange={(e) => setTekst({ ...tekst, slutDato: e.target.value })}
                    />
                  )}
                </Felt>
                <Felt label="Betalingsdato">
                  {(id) => (
                    <Datofelt
                      id={id}
                      value={tekst.betalingsDato ?? ''}
                      onChange={(e) => setTekst({ ...tekst, betalingsDato: e.target.value })}
                    />
                  )}
                </Felt>
              </div>

              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                <Felt label="Adresse for jobbet">
                  {(id) => (
                    <Tekstfelt
                      id={id}
                      value={tekst.destinationAdresse ?? ''}
                      onChange={(e) =>
                        setTekst({ ...tekst, destinationAdresse: e.target.value })
                      }
                    />
                  )}
                </Felt>
                <Felt label="Kilometer pr. tur">
                  {(id) => (
                    <BeloebFelt
                      id={id}
                      vaerdi={tekst.antalKm ?? ''}
                      onVaerdi={(v) => setTekst({ ...tekst, antalKm: v })}
                      suffiks="km"
                    />
                  )}
                </Felt>
                <Felt label="Antal ture">
                  {(id) => (
                    <BeloebFelt
                      id={id}
                      vaerdi={tekst.antalTure ?? ''}
                      onVaerdi={(v) => setTekst({ ...tekst, antalTure: v })}
                      suffiks=""
                    />
                  )}
                </Felt>
              </div>

              <Felt label="Transportmiddel" hjaelp="Bestemmer om kørslen lander i rubrik 29 eller 51.">
                {(id) => (
                  <Vaelger
                    id={id}
                    value={tekst.transportmiddel || 'NONE'}
                    onChange={(e) => setTekst({ ...tekst, transportmiddel: e.target.value })}
                  >
                    <option value="NONE">Ingen kørsel i eget transportmiddel</option>
                    <option value="OWN_CAR_MC">Egen bil eller motorcykel, rubrik 29</option>
                    <option value="OWN_BIKE">Egen cykel eller knallert, rubrik 29</option>
                    <option value="PASSENGER">Passager, rubrik 51</option>
                  </Vaelger>
                )}
              </Felt>

              <div className="space-y-2.5">
                <label className="flex items-start gap-2.5 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={Boolean(flag.amBidragFritaget)}
                    onChange={(e) =>
                      setFlag({ ...flag, amBidragFritaget: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 accent-[oklch(0.21_0.008_75)]"
                  />
                  <span>
                    Fritaget for AM-bidrag
                    <UsikkerMarkering sikkerhed={sik('job', 'amBidragFritaget')} />
                  </span>
                </label>
                <label className="flex items-start gap-2.5 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={Boolean(flag.erRubrik17)}
                    onChange={(e) => setFlag({ ...flag, erRubrik17: e.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-[oklch(0.21_0.008_75)]"
                  />
                  <span>Hører til i rubrik 17 i stedet for rubrik 12</span>
                </label>
              </div>
            </div>
          )}

          {valgtType === 'FRADRAG' && (
            <div className="space-y-4 border-t border-rule pt-4">
              <Felt label="Omkostning" paakraevet>
                {(id) => (
                  <>
                    <Tekstfelt
                      id={id}
                      value={tekst.beskrivelse ?? ''}
                      onChange={(e) => setTekst({ ...tekst, beskrivelse: e.target.value })}
                      className={usikkert(sik('fradrag', 'beskrivelse')) ? 'border-negative' : ''}
                    />
                    <UsikkerMarkering sikkerhed={sik('fradrag', 'beskrivelse')} />
                  </>
                )}
              </Felt>

              <div className="grid gap-4 sm:grid-cols-2">
                <Felt label="Type">
                  {(id) => (
                    <Tekstfelt
                      id={id}
                      value={tekst.typeKategori ?? ''}
                      onChange={(e) => setTekst({ ...tekst, typeKategori: e.target.value })}
                    />
                  )}
                </Felt>
                <Felt label="Fakturadato" paakraevet>
                  {(id) => (
                    <>
                      <Datofelt
                        id={id}
                        value={tekst.fakturaDato ?? ''}
                        onChange={(e) => setTekst({ ...tekst, fakturaDato: e.target.value })}
                      />
                      <UsikkerMarkering sikkerhed={sik('fradrag', 'fakturaDato')} />
                    </>
                  )}
                </Felt>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <Felt label="Fakturabeløb" paakraevet>
                  {(id) => (
                    <>
                      <BeloebFelt
                        id={id}
                        vaerdi={tekst.fakturaBeloeb ?? ''}
                        onVaerdi={(v) => setTekst({ ...tekst, fakturaBeloeb: v })}
                      />
                      <UsikkerMarkering sikkerhed={sik('fradrag', 'fakturaBeloeb')} />
                    </>
                  )}
                </Felt>
                <Felt
                  label="Fradragsprocent"
                  hjaelp="Forslaget er et skøn. Du hæfter selv for andelen."
                >
                  {(id) => (
                    <BeloebFelt
                      id={id}
                      vaerdi={tekst.fradragsProcent ?? '100'}
                      onVaerdi={(v) => setTekst({ ...tekst, fradragsProcent: v })}
                      suffiks="%"
                    />
                  )}
                </Felt>
                <div className="flex flex-col justify-end pb-1">
                  <span className="text-2xs text-ink-muted">Fradrag</span>
                  <span className="tal text-lg font-semibold text-ink">
                    {kr(
                      (tal('fakturaBeloeb') *
                        (tekst.fradragsProcent === '' ? 100 : tal('fradragsProcent'))) /
                        100
                    )}{' '}
                    kr.
                  </span>
                </div>
              </div>
            </div>
          )}

          {valgtType === 'INVESTERING' && (
            <div className="space-y-4 border-t border-rule pt-4">
              <Felt label="Investering" paakraevet>
                {(id) => (
                  <Tekstfelt
                    id={id}
                    value={tekst.titel ?? ''}
                    onChange={(e) => setTekst({ ...tekst, titel: e.target.value })}
                  />
                )}
              </Felt>
              <div className="grid gap-4 sm:grid-cols-2">
                <Felt label="Fakturadato" paakraevet>
                  {(id) => (
                    <Datofelt
                      id={id}
                      value={tekst.fakturaDato ?? ''}
                      onChange={(e) => setTekst({ ...tekst, fakturaDato: e.target.value })}
                    />
                  )}
                </Felt>
                <Felt label="Beløb" paakraevet>
                  {(id) => (
                    <BeloebFelt
                      id={id}
                      vaerdi={tekst.beloeb ?? ''}
                      onVaerdi={(v) => setTekst({ ...tekst, beloeb: v })}
                    />
                  )}
                </Felt>
              </div>
            </div>
          )}

          <div className="border-t border-rule pt-4">
            <Felt label="Note">
              {(id) => (
                <Notatfelt
                  id={id}
                  vaerdi={tekst.revisorNotat ?? ''}
                  onVaerdi={(v) => setTekst({ ...tekst, revisorNotat: v })}
                />
              )}
            </Felt>
          </div>

          {valgtType === 'UKENDT' && (
            <p className="text-2xs text-ink-muted">
              Vælg en type foroven, før posten kan oprettes. Bilaget er gemt i arkivet
              uanset hvad.
            </p>
          )}

          {fejl && <Advarsel titel="Posten blev ikke oprettet">{fejl}</Advarsel>}
        </div>
      ) : null}
    </Modal>
  );
}
