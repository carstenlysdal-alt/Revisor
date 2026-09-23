import { useState } from 'react';
import type { BrugerProfil, IndkomstAar, OpsparingsTracker } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { kr, pct } from '../lib/format';
import { Advarsel, Knap, Kort } from './ui';

/** Samme opdeling som topnavigationen i App.tsx — kun til forklaringskortet. */
const FANER_DRIFT_NAVNE = ['Indtægter', 'Udgifter & fradrag', 'Kørsel', 'Investeringer'];
const FANER_OVERBLIK_NAVNE = ['Skatteoverblik', 'Årsopgørelse', 'Statistik', 'Dokumentation'];

interface Props {
  indkomstAar: IndkomstAar;
  beregning: SkatteBeregning;
  opsparing: OpsparingsTracker;
  aiKlar: boolean;
  aiUdbyder: string | null;
  aiModel: string | null;
  profil?: BrugerProfil;
  onAabnProfil?: () => void;
  onAabnScanner: () => void;
  onHentBackup: () => Promise<unknown>;
  onGaaTil: (fane: string) => void;
  /** Kun sat fra Forsiden. */
  antalJobs?: number;
  investeringerIAlt?: number;
  /** Forklaringskortet om Daglig drift/Samlet overblik — kun på Forsiden. */
  visForklaring?: boolean;
}

function Noegletal({
  label,
  vaerdi,
  note,
  fremhaev = false,
}: {
  label: string;
  vaerdi: string;
  note?: string;
  fremhaev?: boolean;
}) {
  return (
    <div className="border-b border-rule py-2.5 last:border-b-0">
      <p className="text-2xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p
        className={`tal mt-0.5 ${fremhaev ? 'text-xl font-semibold' : 'text-base'} text-ink`}
      >
        {vaerdi}
      </p>
      {note && <p className="mt-0.5 text-2xs text-ink-muted">{note}</p>}
    </div>
  );
}

export function GlobalSidebar({
  indkomstAar,
  beregning,
  opsparing,
  aiKlar,
  aiUdbyder,
  aiModel,
  profil,
  onAabnProfil,
  onAabnScanner,
  onHentBackup,
  onGaaTil,
  antalJobs,
  investeringerIAlt,
  visForklaring = false,
}: Props) {
  const afsat = opsparing.indbetaltTilSkat + opsparing.opsparetPrivat;
  const mangler = Math.max(0, beregning.samletSkatOgAM - afsat);
  const [henterBackup, setHenterBackup] = useState(false);
  const [backupFejl, setBackupFejl] = useState<string | null>(null);

  const hentBackup = async () => {
    setHenterBackup(true);
    setBackupFejl(null);
    try {
      await onHentBackup();
    } catch (err) {
      setBackupFejl(err instanceof Error ? err.message : 'Sikkerhedskopien kunne ikke hentes.');
    } finally {
      setHenterBackup(false);
    }
  };

  return (
    <aside className="ikke-print w-full shrink-0 lg:w-72">
      <div className="lg:sticky lg:top-24">
        {profil && (
          <div className="mb-4 pb-3 border-b border-rule">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-2xs uppercase tracking-wide text-ink-faint">Profil</p>
                <p className="font-semibold text-sm text-ink truncate">
                  {profil.navn || profil.kunstnerNavn || 'Brugerprofil'}
                </p>
              </div>
              {onAabnProfil && (
                <button
                  type="button"
                  onClick={onAabnProfil}
                  className="shrink-0 text-2xs text-ink-muted underline underline-offset-2 hover:text-ink cursor-pointer"
                >
                  Rediger
                </button>
              )}
            </div>
            {profil.hjemmeadresse ? (
              <p className="text-2xs text-ink-muted truncate mt-0.5" title={profil.hjemmeadresse}>
                📍 {profil.hjemmeadresse}
              </p>
            ) : (
              onAabnProfil && (
                <button
                  type="button"
                  onClick={onAabnProfil}
                  className="text-2xs text-amber-800 dark:text-amber-400 underline underline-offset-2 mt-0.5 text-left block"
                >
                  + Tilføj fast bopælsadresse
                </button>
              )
            )}
          </div>
        )}

        <h2 className="border-b border-rule-strong pb-1.5 font-display text-sm font-bold text-ink">
          Dit overblik i {beregning.aar}
        </h2>

        {antalJobs !== undefined && (
          <Noegletal
            label="B-indkomst i år"
            vaerdi={`${kr(beregning.honorarerRubrik12 + beregning.rubrik17Indkomst)} kr.`}
            note={`${antalJobs} ${antalJobs === 1 ? 'job' : 'job'} indberettet`}
          />
        )}
        <Noegletal
          label="Skat og AM-bidrag"
          vaerdi={`${kr(beregning.samletSkatOgAM)} kr.`}
          note={`Effektivt ${pct(beregning.effektivSkatteprocent)} af honorarerne.`}
          fremhaev
        />
        <Noegletal label="Sat til side" vaerdi={`${kr(afsat)} kr.`} />
        <Noegletal
          label="Tilbage efter skat"
          vaerdi={`${kr(beregning.indtaegtEfterSkat)} kr.`}
        />
        <Noegletal
          label="Fradrag i rubrik 29"
          vaerdi={`${kr(beregning.anvendtFradragRubrik29)} kr.`}
          note={
            beregning.rubrik29LoftOverskredet
              ? `${kr(beregning.overskydendeFradrag)} kr. kan ikke bruges i år.`
              : undefined
          }
        />
        {investeringerIAlt !== undefined && (
          <Noegletal label="Investeringer" vaerdi={`${kr(investeringerIAlt)} kr.`} />
        )}

        {mangler > 0 && (
          <div className="mt-4">
            <Advarsel titel="Der mangler at blive sat penge til side">
              Du står til at skulle betale {kr(mangler)} kr. mere, end der er dækket ind.
              <button
                type="button"
                onClick={() => onGaaTil('opsparing')}
                className="mt-1.5 block underline underline-offset-2"
              >
                Se hvad der skal til
              </button>
            </Advarsel>
          </div>
        )}

        {mangler === 0 && beregning.samletSkatOgAM > 0 && (
          <div className="mt-4">
            <Advarsel art="positiv" titel="Skatten er dækket ind">
              Der er sat nok til side til årets skat og AM-bidrag, som det ser ud nu.
            </Advarsel>
          </div>
        )}

        <div className="mt-5 space-y-2 border-t border-rule pt-4">
          {/*
            Ikke disabled på aiKlar: en deaktiveret knap giver ingen forklaring,
            og ser ud som om funktionen slet ikke findes. Klikker brugeren
            alligevel, åbner modalen og viser selv hvorfor den er slået fra.
            Revisor-chatten har sin egen faste knap i headeren og på
            forsiden — den gentages ikke her.
          */}
          <Knap onClick={onAabnScanner} className="w-full justify-center">
            Læs et bilag
          </Knap>
          {!aiKlar && (
            <p className="text-2xs text-ink-faint">
              Kræver en AI-nøgle på serveren. Sæt GEMINI_API_KEY eller DEEPSEEK_API_KEY i .env.
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-rule pt-4">
          <p className="text-2xs uppercase tracking-wide text-ink-faint">Lokal sikkerhedskopi</p>
          <p className="mt-1.5 text-2xs text-ink-muted">
            Hent alle data og originale bilag i én ZIP-fil. Gem den gerne i en mappe,
            som din computer synkroniserer til Google Drev eller iCloud.
          </p>
          <Knap onClick={hentBackup} disabled={henterBackup} className="mt-2 w-full justify-center">
            {henterBackup ? 'Samler sikkerhedskopi…' : 'Hent komplet sikkerhedskopi'}
          </Knap>
          {backupFejl && <p className="mt-1.5 text-2xs text-negative">{backupFejl}</p>}
        </div>

        <div className="mt-5 border-t border-rule pt-4 text-2xs text-ink-faint">
          <p>
            Beregnet med satserne for {beregning.satser.aar} og kommuneskat{' '}
            {indkomstAar.kommuneSkatteprocent.toString().replace('.', ',')} % i{' '}
            {indkomstAar.kommune || 'ukendt kommune'}.
          </p>
          <p className="mt-1.5">
            Tallene er et beslutningsgrundlag, ikke en årsopgørelse. Kontrollér dem mod
            skat.dk, før du indberetter.
          </p>
          {aiKlar && aiUdbyder && (
            <p className="mt-1.5">
              Bilag læses af {aiUdbyder}
              {aiModel ? ` (${aiModel})` : ''}. Forslagene skal godkendes, før de
              bliver til posteringer.
            </p>
          )}
        </div>

        {visForklaring && (
          <Kort className="mt-4 p-4">
            <p className="font-display text-sm font-bold text-ink">To områder – én løsning</p>
            <p className="mt-1 text-2xs text-ink-muted">
              Revis er delt op i to hovedområder, så du nemt kan holde styr på hverdagen og
              det store overblik.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-2xs">
              <div>
                <p className="font-medium text-ink">Daglig drift</p>
                <ul className="mt-1 space-y-0.5 text-ink-muted">
                  {FANER_DRIFT_NAVNE.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-ink">Samlet overblik</p>
                <ul className="mt-1 space-y-0.5 text-ink-muted">
                  {FANER_OVERBLIK_NAVNE.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Kort>
        )}
      </div>
    </aside>
  );
}
