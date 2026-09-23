import { useState } from 'react';
import type { BrugerProfil, TransportMiddel } from '../types';
import { KOMMUNENAVNE, getKommuneSatser } from '../lib/tax/kommuner';
import { AdresseInput } from './AdresseInput';
import {
  Afkrydsning,
  Felt,
  Knap,
  Modal,
  Tekstfelt,
  Vaelger,
} from './ui';

interface Props {
  aaben: boolean;
  profil: BrugerProfil;
  onLuk: () => void;
  onGem: (profil: BrugerProfil) => Promise<unknown>;
  onHentBackup: () => Promise<unknown>;
  onNulstil: () => Promise<unknown>;
}

export function ProfilModal({
  aaben,
  profil: startProfil,
  onLuk,
  onGem,
  onHentBackup,
  onNulstil,
}: Props) {
  const [form, setForm] = useState<BrugerProfil>(() => ({
    navn: startProfil.navn ?? '',
    kunstnerNavn: startProfil.kunstnerNavn ?? '',
    cprNummer: startProfil.cprNummer ?? '',
    cvrNummer: startProfil.cvrNummer ?? '',
    email: startProfil.email ?? '',
    telefon: startProfil.telefon ?? '',
    hjemmeadresse: startProfil.hjemmeadresse ?? '',
    kommune: startProfil.kommune ?? '',
    kommuneSkatteprocent: startProfil.kommuneSkatteprocent,
    kirkeskatteprocent: startProfil.kirkeskatteprocent,
    medlemFolkekirken: Boolean(startProfil.medlemFolkekirken),
    standardTransportmiddel: startProfil.standardTransportmiddel ?? 'OWN_CAR_MC',
    standardBilorMærke: startProfil.standardBilorMærke ?? '',
    fastBooker: startProfil.fastBooker ?? startProfil.fastHvervgiver ?? '',
    noter: startProfil.noter ?? '',
  }));

  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [visNulstil, setVisNulstil] = useState(false);
  const [bekraeftelse, setBekraeftelse] = useState('');
  const [nulstiller, setNulstiller] = useState(false);
  const [henterBackup, setHenterBackup] = useState(false);
  const [backupHentet, setBackupHentet] = useState(false);

  const vaelgKommune = (kommuneNavn: string) => {
    const satser = kommuneNavn ? getKommuneSatser(kommuneNavn, new Date().getFullYear()) : null;
    setForm((prev) => ({
      ...prev,
      kommune: kommuneNavn,
      kommuneSkatteprocent: satser?.kommuneskat ?? prev.kommuneSkatteprocent,
      kirkeskatteprocent: satser?.kirkeskat ?? prev.kirkeskatteprocent,
    }));
  };

  const haandterGem = async () => {
    setGemmer(true);
    setFejl(null);
    setSucces(false);
    try {
      if (!form.navn.trim()) {
        setFejl('Skriv venligst dit navn.');
        setGemmer(false);
        return;
      }
      await onGem(form);
      setSucces(true);
      setTimeout(() => {
        onLuk();
      }, 750);
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Profilen kunne ikke gemmes.');
    } finally {
      setGemmer(false);
    }
  };

  const haandterNulstil = async () => {
    if (bekraeftelse !== 'SLET ALT') return;
    setNulstiller(true);
    setFejl(null);
    try {
      await onNulstil();
      setVisNulstil(false);
      setBekraeftelse('');
      onLuk();
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Regnskabet kunne ikke nulstilles.');
    } finally {
      setNulstiller(false);
    }
  };

  const haandterBackup = async () => {
    setHenterBackup(true);
    setBackupHentet(false);
    setFejl(null);
    try {
      await onHentBackup();
      setBackupHentet(true);
    } catch (err) {
      setFejl(err instanceof Error ? err.message : 'Sikkerhedskopien kunne ikke hentes.');
    } finally {
      setHenterBackup(false);
    }
  };

  return (
    <Modal
      aaben={aaben}
      titel="Min profil & faste stamdata"
      onLuk={onLuk}
      bredde="max-w-2xl"
      bund={
        <div className="flex w-full items-center justify-between">
          <div>
            {succes && <span className="text-xs font-medium text-positive">Profil gemt!</span>}
            {fejl && <span className="text-xs text-negative">{fejl}</span>}
          </div>
          <div className="flex gap-2">
            <Knap onClick={onLuk} disabled={gemmer}>
              Luk
            </Knap>
            <Knap art="primaer" onClick={haandterGem} disabled={gemmer}>
              {gemmer ? 'Gemmer…' : 'Gem profil'}
            </Knap>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-xs text-ink-muted">
          Dine faste oplysninger bruges som grundlag i hele appen. Revisor AI kender altid din
          bopæl og dine kørselsvaner, så ruteberegninger automatisk regnes fra dit hjem.
        </p>

        {/* 1. Person & Virksomhed */}
        <section className="space-y-3">
          <h3 className="font-display text-sm font-semibold tracking-tight text-ink">
            Personlige oplysninger
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Felt label="Fulde navn" paakraevet>
              {(id) => (
                <Tekstfelt
                  id={id}
                  value={form.navn}
                  placeholder="F.eks. Carsten Lysdal"
                  onChange={(e) => setForm({ ...form, navn: e.target.value })}
                />
              )}
            </Felt>
            <Felt label="Kunstnernavn / Alias" hjaelp="Valgfrit bandnavn eller alias">
              {(id) => (
                <Tekstfelt
                  id={id}
                  value={form.kunstnerNavn ?? ''}
                  placeholder="F.eks. DJ / Musiker / Forfatter"
                  onChange={(e) => setForm({ ...form, kunstnerNavn: e.target.value })}
                />
              )}
            </Felt>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Felt label="E-mail" hjaelp="Valgfrit">
              {(id) => (
                <Tekstfelt
                  id={id}
                  type="email"
                  value={form.email ?? ''}
                  placeholder="navn@domæne.dk"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              )}
            </Felt>
            <Felt label="Telefon" hjaelp="Valgfrit">
              {(id) => (
                <Tekstfelt
                  id={id}
                  type="tel"
                  value={form.telefon ?? ''}
                  placeholder="+45 12 34 56 78"
                  onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                />
              )}
            </Felt>
          </div>

          <Felt
            label="Fast booker (valgfrit)"
            hjaelp="Bookingbureau, agent eller person, der ofte booker dine jobs. Den, der udbetaler honoraret, registreres separat som hvervgiver på jobbet."
          >
            {(id) => (
              <Tekstfelt
                id={id}
                value={form.fastBooker ?? ''}
                placeholder="F.eks. Tajmer Booking, PDH Music eller en agent"
                onChange={(e) => setForm({ ...form, fastBooker: e.target.value })}
              />
            )}
          </Felt>
        </section>

        {/* 2. Lokal sikkerhedskopi */}
        <section className="space-y-3 border-t border-rule pt-4">
          <h3 className="font-display text-sm font-semibold tracking-tight text-ink">
            Lokal sikkerhedskopi
          </h3>
          <p className="text-xs text-ink-muted">
            Henter profil, regnskab, chathistorik og alle originale bilag i én ZIP-fil.
            Gem filen i en privat, lokalt synkroniseret mappe.
          </p>
          <Knap onClick={haandterBackup} disabled={henterBackup}>
            {henterBackup ? 'Samler sikkerhedskopi…' : 'Hent komplet sikkerhedskopi'}
          </Knap>
          {backupHentet && (
            <p className="text-xs font-medium text-positive">Sikkerhedskopien er hentet.</p>
          )}
        </section>

        {/* 3. Fast Bopæl & Skattekommune */}
        <section className="space-y-3 border-t border-rule pt-4">
          <h3 className="font-display text-sm font-semibold tracking-tight text-ink">
            Fast bopæl & Skat
          </h3>
          <Felt
            label="Fast bopælsadresse (Hjemmeadresse)"
            hjaelp="Ruteberegning og Revisor AI starter altid automatisk herfra."
          >
            {(id) => (
              <AdresseInput
                id={id}
                value={form.hjemmeadresse}
                placeholder="F.eks. Stjernebakken 12, 4200 Slagelse"
                onChange={(v) => setForm({ ...form, hjemmeadresse: v })}
              />
            )}
          </Felt>

          <div className="grid gap-3 sm:grid-cols-2">
            <Felt label="Bopælskommune">
              {(id) => (
                <Vaelger
                  id={id}
                  value={form.kommune}
                  onChange={(e) => vaelgKommune(e.target.value)}
                >
                  <option value="">Vælg kommune…</option>
                  {KOMMUNENAVNE.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Vaelger>
              )}
            </Felt>
            <div className="flex items-center pt-5">
              <Afkrydsning
                label="Medlem af Folkekirken"
                checked={Boolean(form.medlemFolkekirken)}
                onChange={(e) => setForm({ ...form, medlemFolkekirken: e.target.checked })}
              />
            </div>
          </div>
        </section>

        {/* 4. Transport & Kørebog */}
        <section className="space-y-3 border-t border-rule pt-4">
          <h3 className="font-display text-sm font-semibold tracking-tight text-ink">
            Transport & Kørselspræferencer
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Felt
              label="Standard transportmiddel"
              hjaelp="Brugt som standard for nye honorarjobs og kørsel."
            >
              {(id) => (
                <Vaelger
                  id={id}
                  value={form.standardTransportmiddel || 'OWN_CAR_MC'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      standardTransportmiddel: e.target.value as TransportMiddel,
                    })
                  }
                >
                  <option value="OWN_CAR_MC">Egen bil / MC, rubrik 29</option>
                  <option value="OWN_BIKE">Egen cykel, rubrik 29</option>
                  <option value="PASSENGER">Passager, rubrik 51</option>
                  <option value="NONE">Ingen kørsel som udgangspunkt</option>
                </Vaelger>
              )}
            </Felt>
            <Felt
              label="Køretøj / reg.nr. (valgfrit)"
              hjaelp="Til dokumentation og kørebog."
            >
              {(id) => (
                <Tekstfelt
                  id={id}
                  value={form.standardBilorMærke ?? ''}
                  placeholder="F.eks. VW Golf (AB 12 345)"
                  onChange={(e) => setForm({ ...form, standardBilorMærke: e.target.value })}
                />
              )}
            </Felt>
          </div>
        </section>

        {/* 5. Noter og faste instruktioner til Revisor AI */}
        <section className="space-y-2 border-t border-rule pt-4">
          <Felt
            label="Faste noter til Revisor AI"
            hjaelp="Særlige faste oplysninger du vil have at AI'en altid husker (f.eks. 'Jeg er musiker i et fast jazzorkester og spiller ofte i Jylland')"
          >
            {(id) => (
              <textarea
                id={id}
                rows={2}
                value={form.noter ?? ''}
                placeholder="F.eks. særlige fradragsforhold, brancher eller faste spillesteder..."
                onChange={(e) => setForm({ ...form, noter: e.target.value })}
                className="w-full rounded-[4px] border border-rule-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
              />
            )}
          </Felt>
        </section>

        <section className="space-y-3 border-t border-rule pt-4">
          <h3 className="font-display text-sm font-semibold tracking-tight text-negative">
            Start helt forfra
          </h3>
          <p className="text-xs text-ink-muted">
            Sletter alle indkomstår, jobs, udgifter, investeringer, skatteopsparing, bilag og
            Revisor-chathistorik fra appen. Din profil og dine faste stamdata bevares.
            Sikkerhedskopier, du allerede har hentet, påvirkes ikke.
          </p>
          {!visNulstil ? (
            <Knap art="fare" onClick={() => setVisNulstil(true)}>
              Nulstil hele regnskabet…
            </Knap>
          ) : (
            <div className="space-y-3 border border-negative p-3">
              <p className="text-xs text-negative">
                Det kan ikke fortrydes. Skriv <strong>SLET ALT</strong> for at fortsætte.
              </p>
              <Tekstfelt
                value={bekraeftelse}
                onChange={(e) => setBekraeftelse(e.target.value)}
                placeholder="SLET ALT"
                autoComplete="off"
              />
              <div className="flex gap-2">
                <Knap onClick={() => { setVisNulstil(false); setBekraeftelse(''); }} disabled={nulstiller}>
                  Fortryd
                </Knap>
                <Knap art="fare" onClick={haandterNulstil} disabled={nulstiller || bekraeftelse !== 'SLET ALT'}>
                  {nulstiller ? 'Nulstiller…' : 'Slet alle regnskabsdata'}
                </Knap>
              </div>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
