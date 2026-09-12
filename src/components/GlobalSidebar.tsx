import React, { useEffect, useState } from 'react';
import type { IndkomstAar, OpsparingsTracker } from '../types';
import type { SkatteBeregning } from '../lib/tax/beregn';
import { kr, pct } from '../lib/format';
import { api } from '../lib/api';
import { Advarsel, Knap } from './ui';

interface Props {
  indkomstAar: IndkomstAar;
  beregning: SkatteBeregning;
  opsparing: OpsparingsTracker;
  aiKlar: boolean;
  aiUdbyder: string | null;
  aiModel: string | null;
  onAabnScanner: () => void;
  onAabnChat: () => void;
  onGaaTil: (fane: string) => void;
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

interface GoogleDriveStatus {
  konfigureret: boolean;
  forbundet: boolean;
  sidsteFejl: string | null;
  sikkerhedskopieredeBilag: number;
  afventendeBilag: number;
}

/**
 * Egen fetch, ligesom rutestatus i JobsModule — sidebaren behøver ikke gå
 * gennem App.tsx for en status, kun den selv bruger.
 */
function GoogleDriveStatusBlok() {
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
  const [urlBesked, setUrlBesked] = useState<string | null>(null);
  const [afbryderLige, setAfbryderLige] = useState(false);

  const hentStatus = () => api.googleDriveStatus().then(setStatus).catch(() => setStatus(null));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drev = params.get('drev');
    if (drev) {
      setUrlBesked(
        drev === 'forbundet'
          ? 'Google Drev blev forbundet.'
          : drev === 'ikke-konfigureret'
            ? 'Google Drev er ikke sat op på serveren endnu.'
            : 'Forbindelsen til Google Drev fejlede. Prøv igen.'
      );
      params.delete('drev');
      const rest = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
    }
    void hentStatus();
    const interval = window.setInterval(() => void hentStatus(), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!status) return null;

  async function afbryd() {
    if (
      !window.confirm(
        'Afbryd forbindelsen til Google Drev? Filer, der allerede ligger der, bliver ikke slettet.'
      )
    ) {
      return;
    }
    setAfbryderLige(true);
    try {
      await api.googleDriveAfbryd();
      await hentStatus();
    } finally {
      setAfbryderLige(false);
    }
  }

  return (
    <div className="mt-5 border-t border-rule pt-4">
      <p className="text-2xs uppercase tracking-wide text-ink-faint">Google Drev-backup</p>

      {!status.konfigureret && (
        <p className="mt-1.5 text-2xs text-ink-muted">
          Alt gemmes løbende i appens database. Ekstern Google Drev-backup er ikke sat op
          på serveren endnu.
        </p>
      )}

      {urlBesked && <p className="mt-1.5 text-2xs text-ink-muted">{urlBesked}</p>}

      {status.konfigureret && status.forbundet && !status.sidsteFejl && (
        <>
          <p className="mt-1.5 text-2xs text-ink-muted">
            Forbundet. {status.sikkerhedskopieredeBilag} bilag er sikkerhedskopieret
            {status.afventendeBilag > 0
              ? `; ${status.afventendeBilag} afventer.`
              : '. Datasnapshottet er ajour.'}
          </p>
          <button
            type="button"
            onClick={afbryd}
            disabled={afbryderLige}
            className="mt-1.5 text-2xs text-ink-muted underline underline-offset-2"
          >
            Afbryd forbindelse
          </button>
        </>
      )}

      {status.konfigureret && status.forbundet && status.sidsteFejl && (
        <div className="mt-1.5">
          <Advarsel titel="Backup kræver opmærksomhed">{status.sidsteFejl}</Advarsel>
          <a
            href="/api/google/start"
            className="mt-1.5 inline-block text-2xs text-ink-muted underline underline-offset-2"
          >
            Prøv at genforbinde Google Drev
          </a>
        </div>
      )}

      {status.konfigureret && !status.forbundet && (
        <a
          href="/api/google/start"
          className="mt-1.5 inline-block text-2xs text-ink-muted underline underline-offset-2"
        >
          Forbind Google Drev
        </a>
      )}
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
  onAabnScanner,
  onAabnChat,
  onGaaTil,
}: Props) {
  const afsat = opsparing.indbetaltTilSkat + opsparing.opsparetPrivat;
  const mangler = Math.max(0, beregning.samletSkatOgAM - afsat);

  return (
    <aside className="ikke-print w-full shrink-0 lg:w-72">
      <div className="lg:sticky lg:top-24">
        <h2 className="border-b border-rule-strong pb-1.5 font-display text-sm font-bold text-ink">
          Året {beregning.aar}
        </h2>

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
          <Knap onClick={onAabnScanner} disabled={!aiKlar} className="w-full justify-center">
            Læs et bilag
          </Knap>
          <Knap onClick={onAabnChat} disabled={!aiKlar} className="w-full justify-center">
            Spørg revisoren
          </Knap>
          {!aiKlar && (
            <p className="text-2xs text-ink-faint">
              Begge dele kræver en AI-nøgle på serveren. Sæt GEMINI_API_KEY eller
              DEEPSEEK_API_KEY i .env.
            </p>
          )}
        </div>

        <GoogleDriveStatusBlok />

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
      </div>
    </aside>
  );
}
