import React, { useMemo, useState } from 'react';
import type { Bilag, IndkomstAar, Investering } from '../types';
import { dato, kr, talFraFelt } from '../lib/format';
import { api } from '../lib/api';
import {
  Advarsel,
  BeloebFelt,
  Datofelt,
  Felt,
  Knap,
  Modal,
  Notatfelt,
  MobilPost,
  MobilSum,
  Responsiv,
  Sektion,
  Sumraekke,
  Tabel,
  Td,
  Tekstfelt,
  Th,
  TomTilstand,
} from './ui';

interface Props {
  investeringer: Investering[];
  bilag: Bilag[];
  indkomstAar: IndkomstAar;
  onGem: (inv: Investering) => Promise<unknown>;
  onSlet: (id: string) => Promise<unknown>;
  onAabnScanner: () => void;
}

const nyInvestering = (indkomstAarId: string, aar: number): Investering => ({
  id: `inv-${Date.now()}`,
  indkomstAarId,
  titel: '',
  beloeb: 0,
  fakturaDato: `${aar}-01-01`,
  bilagIds: [],
  noter: '',
});

export function InvesteringerModule({
  investeringer,
  bilag,
  indkomstAar,
  onGem,
  onSlet,
  onAabnScanner,
}: Props) {
  const [redigerer, setRedigerer] = useState<Investering | null>(null);
  const [sletter, setSletter] = useState<Investering | null>(null);
  const [beloeb, setBeloeb] = useState('');
  const [fejl, setFejl] = useState<string | null>(null);

  const bilagIndeks = useMemo(() => new Map(bilag.map((b) => [b.id, b])), [bilag]);

  const aabn = (inv: Investering) => {
    setFejl(null);
    setRedigerer(inv);
    setBeloeb(inv.beloeb ? String(inv.beloeb) : '');
  };

  const gem = async () => {
    if (!redigerer) return;
    if (!redigerer.titel.trim()) {
      setFejl('Skriv hvad der er købt.');
      return;
    }
    try {
      await onGem({ ...redigerer, beloeb: talFraFelt(beloeb) });
      setRedigerer(null);
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Investeringen kunne ikke gemmes.');
    }
  };

  const laast = indkomstAar.laast;

  return (
    <Sektion
      titel="Investeringer"
      beskrivelse="Arkiv over større indkøb af udstyr og anlægsaktiver."
      handling={
        laast ? null : (
          <>
            <Knap onClick={onAabnScanner} className="hidden lg:inline-flex">
              Læs en faktura
            </Knap>
            <Knap art="primaer" onClick={() => aabn(nyInvestering(indkomstAar.id, indkomstAar.aar))}>
              Ny investering
            </Knap>
          </>
        )
      }
    >
      <div className="mb-4">
        <Advarsel art="neutral" titel="Investeringer indgår ikke i skatteberegningen">
          Modulet er et arkiv, hvor du kan samle dokumentationen for større indkøb. Beløbene
          tæller ikke med i rubrik 29 og påvirker ikke skatten. Skal et aktiv afskrives, eller
          skal en del af købet fratrækkes, opretter du den del som et fradrag med den andel,
          der er erhvervsmæssig.
        </Advarsel>
      </div>

      {investeringer.length === 0 ? (
        <TomTilstand besked="Der er ingen investeringer i året. Modulet er til større indkøb, du vil kunne finde dokumentationen for senere." />
      ) : (
        <Responsiv
          tabel={
            <Tabel minBredde={640}>
          <thead>
            <tr>
              <Th>Investering</Th>
              <Th bredde="8rem">Fakturadato</Th>
              <Th hoejre bredde="9rem">Beløb</Th>
              <Th bredde="8rem" />
            </tr>
          </thead>
          <tbody>
            {investeringer.map((inv) => (
              <tr key={inv.id}>
                <Td>
                  <span className="font-medium text-ink">{inv.titel}</span>
                  {inv.noter && (
                    <span className="block text-2xs text-ink-faint">{inv.noter}</span>
                  )}
                  {inv.bilagIds.map((id) => {
                    const b = bilagIndeks.get(id);
                    return b ? (
                      <a
                        key={id}
                        href={api.bilagUrl(id)}
                        target="_blank"
                        rel="noreferrer"
                        className="mr-2 text-2xs text-ink-muted underline underline-offset-2 hover:text-ink"
                      >
                        {b.filnavn}
                      </a>
                    ) : null;
                  })}
                </Td>
                <Td tal>{dato(inv.fakturaDato)}</Td>
                <Td hoejre tal>
                  {kr(inv.beloeb)}
                </Td>
                <Td hoejre>
                  {!laast && (
                    <div className="ikke-print flex justify-end gap-1">
                      <Knap art="tekst" onClick={() => aabn(inv)}>
                        Rediger
                      </Knap>
                      <Knap art="tekst" onClick={() => setSletter(inv)}>
                        Slet
                      </Knap>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
            <Sumraekke
              celler={[
                { indhold: 'I alt', span: 2 },
                {
                  indhold: kr(investeringer.reduce((s, i) => s + i.beloeb, 0)),
                  hoejre: true,
                  tal: true,
                },
                { indhold: '' },
              ]}
            />
          </tbody>
            </Tabel>
          }
          liste={
            <>
              {investeringer.map((inv) => (
                <MobilPost
                  key={inv.id}
                  titel={inv.titel}
                  undertitel={dato(inv.fakturaDato)}
                  beloeb={`${kr(inv.beloeb)} kr.`}
                  handlinger={
                    laast ? undefined : (
                      <>
                        <button
                          type="button"
                          onClick={() => aabn(inv)}
                          className="text-2xs text-ink-muted underline underline-offset-4"
                        >
                          Rediger
                        </button>
                        <button
                          type="button"
                          onClick={() => setSletter(inv)}
                          className="text-2xs text-negative underline underline-offset-4"
                        >
                          Slet
                        </button>
                      </>
                    )
                  }
                />
              ))}
              <MobilSum
                tekst="I alt"
                beloeb={`${kr(investeringer.reduce((s, i) => s + i.beloeb, 0))} kr.`}
              />
            </>
          }
        />
      )}

      <Modal
        aaben={Boolean(redigerer)}
        onLuk={() => setRedigerer(null)}
        titel={investeringer.some((i) => i.id === redigerer?.id) ? 'Rediger investering' : 'Ny investering'}
        bredde="max-w-xl"
        bund={
          <>
            <Knap onClick={() => setRedigerer(null)}>Annullér</Knap>
            <Knap art="primaer" onClick={gem}>
              Gem investering
            </Knap>
          </>
        }
      >
        {redigerer && (
          <div className="space-y-5">
            {fejl && <Advarsel titel="Investeringen blev ikke gemt">{fejl}</Advarsel>}
            <Felt label="Investering" paakraevet>
              {(id) => (
                <Tekstfelt
                  id={id}
                  value={redigerer.titel}
                  placeholder="Hvad er købt"
                  onChange={(e) => setRedigerer({ ...redigerer, titel: e.target.value })}
                />
              )}
            </Felt>
            <div className="grid gap-4 sm:grid-cols-2">
              <Felt label="Fakturadato" paakraevet>
                {(id) => (
                  <Datofelt
                    id={id}
                    value={redigerer.fakturaDato}
                    onChange={(e) => setRedigerer({ ...redigerer, fakturaDato: e.target.value })}
                  />
                )}
              </Felt>
              <Felt label="Beløb" paakraevet hjaelp="Inklusive moms.">
                {(id) => <BeloebFelt id={id} vaerdi={beloeb} onVaerdi={setBeloeb} />}
              </Felt>
            </div>
            <Felt label="Noter">
              {(id) => (
                <Notatfelt
                  id={id}
                  vaerdi={redigerer.noter ?? ''}
                  onVaerdi={(v) => setRedigerer({ ...redigerer, noter: v })}
                />
              )}
            </Felt>
          </div>
        )}
      </Modal>

      <Modal
        aaben={Boolean(sletter)}
        onLuk={() => setSletter(null)}
        titel="Slet investeringen?"
        bredde="max-w-lg"
        bund={
          <>
            <Knap onClick={() => setSletter(null)}>Behold</Knap>
            <Knap
              art="fare"
              onClick={async () => {
                if (sletter) await onSlet(sletter.id);
                setSletter(null);
              }}
            >
              Slet investeringen
            </Knap>
          </>
        }
      >
        <p className="text-xs text-ink-muted">
          {sletter?.titel} forsvinder fra arkivet. Bilaget bliver liggende.
        </p>
      </Modal>
    </Sektion>
  );
}
