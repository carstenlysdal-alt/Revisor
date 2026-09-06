import fs from 'fs/promises';
import path from 'path';
import { Pool, types } from 'pg';
import type {
  Bilag,
  Fradrag,
  IndkomstAar,
  Investering,
  Job,
  OpsparingsTracker,
} from '../../src/types';
import { BilagFindesIkkeError, type BilagsLager } from '../storage/lager';
import { beregnHash } from '../storage/bilag';
import { DataSnapshot, Repository, tomtSnapshot } from './repository';

// pg returnerer numeric som streng for ikke at tabe præcision. Beløbene her
// ligger langt inden for det, en double kan bære, og resten af koden regner
// med tal, så de parses her ét sted i stedet for spredt ud i kaldene.
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : Number(v)));

const tal = (v: unknown): number => Number(v) || 0;
const dato = (v: unknown): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);

type Postype = 'job' | 'fradrag' | 'investering';

export class PostgresRepository implements Repository, BilagsLager {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      // Railway udstiller Postgres med et certifikat, Node ikke kender i
      // forvejen. Forbindelsen er stadig krypteret.
      ssl: /localhost|127\.0\.0\.1/.test(connectionString)
        ? undefined
        : { rejectUnauthorized: false },
    });
  }

  /** Kører skemaet ved opstart. Alt er IF NOT EXISTS, så det er idempotent. */
  async migrer(): Promise<void> {
    const sti = path.join(__dirname, 'schema.sql');
    let skema: string;
    try {
      skema = await fs.readFile(sti, 'utf8');
    } catch {
      // I produktionsbundtet ligger schema.sql ved siden af den bundlede fil.
      skema = await fs.readFile(path.join(process.cwd(), 'dist', 'schema.sql'), 'utf8');
    }
    await this.pool.query(skema);
  }

  async luk(): Promise<void> {
    await this.pool.end();
  }

  /* ------------------------------------------------------------- Læsning */

  private async bilagPrPost(type: Postype): Promise<Map<string, string[]>> {
    const { rows } = await this.pool.query<{ post_id: string; bilag_id: string }>(
      'SELECT post_id, bilag_id FROM bilag_tilknytning WHERE post_type = $1',
      [type]
    );
    const kort = new Map<string, string[]>();
    for (const r of rows) {
      kort.set(r.post_id, [...(kort.get(r.post_id) ?? []), r.bilag_id]);
    }
    return kort;
  }

  async hentAlt(): Promise<DataSnapshot> {
    const [aar, jobs, fradrag, investeringer, opsparing, bilag] = await Promise.all([
      this.pool.query('SELECT * FROM indkomstaar ORDER BY aar DESC'),
      this.pool.query('SELECT * FROM job ORDER BY start_dato DESC'),
      this.pool.query('SELECT * FROM fradrag ORDER BY faktura_dato DESC'),
      this.pool.query('SELECT * FROM investering ORDER BY faktura_dato DESC'),
      this.pool.query('SELECT * FROM opsparing'),
      this.pool.query('SELECT id, sha256, filnavn, mime_type, stoerrelse, uploadet FROM bilag ORDER BY uploadet DESC'),
    ]);

    const [jobBilag, fradragBilag, investeringBilag] = await Promise.all([
      this.bilagPrPost('job'),
      this.bilagPrPost('fradrag'),
      this.bilagPrPost('investering'),
    ]);

    const snapshot = tomtSnapshot();

    snapshot.indkomstAar = aar.rows.map(
      (r): IndkomstAar => ({
        id: r.id,
        aar: tal(r.aar),
        hjemmeadresse: r.hjemmeadresse ?? '',
        kommune: r.kommune ?? '',
        kommuneSkatteprocent: tal(r.kommune_skatteprocent),
        kirkeskatteprocent: tal(r.kirkeskatteprocent),
        forventetAIndkomst: tal(r.forventet_a_indkomst),
        forventetPensionSUDagpenge: tal(r.forventet_pension_su_dagpenge),
        forventedeFradragAIndkomst: tal(r.forventede_fradrag_a_indkomst),
        medlemFolkekirken: Boolean(r.medlem_folkekirken),
        enligForsoerger: Boolean(r.enlig_forsoerger),
        laast: Boolean(r.laast),
      })
    );

    snapshot.jobs = jobs.rows.map(
      (r): Job => ({
        id: r.id,
        indkomstAarId: r.indkomstaar_id,
        hvervgiver: r.hvervgiver ?? '',
        honorar: tal(r.honorar),
        startDato: dato(r.start_dato),
        slutDato: dato(r.slut_dato),
        betalingsDato: r.betalings_dato ? dato(r.betalings_dato) : '',
        transportmiddel: r.transportmiddel,
        antalKm: tal(r.antal_km),
        antalTure: tal(r.antal_ture),
        destinationAdresse: r.destination_adresse ?? '',
        amBidragFritaget: Boolean(r.am_bidrag_fritaget),
        erRubrik17: Boolean(r.er_rubrik17),
        timerJob: r.timer_job === null ? undefined : tal(r.timer_job),
        timerTransportForberedelse:
          r.timer_transport_forberedelse === null
            ? undefined
            : tal(r.timer_transport_forberedelse),
        type: r.type ?? '',
        bilagIds: jobBilag.get(r.id) ?? [],
        noter: r.noter ?? '',
        erEksempel: Boolean(r.er_eksempel),
      })
    );

    snapshot.fradrag = fradrag.rows.map(
      (r): Fradrag => ({
        id: r.id,
        indkomstAarId: r.indkomstaar_id,
        beskrivelse: r.beskrivelse ?? '',
        typeKategori: r.type_kategori ?? '',
        fakturaDato: dato(r.faktura_dato),
        fakturaBeloeb: tal(r.faktura_beloeb),
        fradragsProcent: tal(r.fradrags_procent),
        fradragIDKK: tal(r.fradrag_i_dkk),
        bilagIds: fradragBilag.get(r.id) ?? [],
        revisorNotat: r.revisor_notat ?? '',
        erEksempel: Boolean(r.er_eksempel),
      })
    );

    snapshot.investeringer = investeringer.rows.map(
      (r): Investering => ({
        id: r.id,
        indkomstAarId: r.indkomstaar_id,
        titel: r.titel ?? '',
        beloeb: tal(r.beloeb),
        fakturaDato: dato(r.faktura_dato),
        bilagIds: investeringBilag.get(r.id) ?? [],
        noter: r.noter ?? '',
        erEksempel: Boolean(r.er_eksempel),
      })
    );

    for (const r of opsparing.rows) {
      snapshot.opsparing[r.indkomstaar_id] = {
        indbetaltTilSkat: tal(r.indbetalt_til_skat),
        opsparetPrivat: tal(r.opsparet_privat),
      };
    }

    snapshot.bilag = bilag.rows.map(
      (r): Bilag => ({
        id: r.id,
        sha256: r.sha256,
        filnavn: r.filnavn,
        mimeType: r.mime_type,
        stoerrelse: tal(r.stoerrelse),
        uploadet: r.uploadet instanceof Date ? r.uploadet.toISOString() : String(r.uploadet),
      })
    );

    return snapshot;
  }

  /* ------------------------------------------------------------ Skrivning */

  private async saetBilagstilknytning(
    type: Postype,
    postId: string,
    bilagIds: string[]
  ): Promise<void> {
    await this.pool.query(
      'DELETE FROM bilag_tilknytning WHERE post_type = $1 AND post_id = $2',
      [type, postId]
    );
    for (const bilagId of bilagIds) {
      await this.pool.query(
        `INSERT INTO bilag_tilknytning (bilag_id, post_type, post_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [bilagId, type, postId]
      );
    }
  }

  async gemIndkomstAar(a: IndkomstAar): Promise<IndkomstAar> {
    await this.pool.query(
      `INSERT INTO indkomstaar (id, aar, hjemmeadresse, kommune, kommune_skatteprocent,
         kirkeskatteprocent, forventet_a_indkomst, forventet_pension_su_dagpenge,
         forventede_fradrag_a_indkomst, medlem_folkekirken, enlig_forsoerger, laast)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         aar = EXCLUDED.aar,
         hjemmeadresse = EXCLUDED.hjemmeadresse,
         kommune = EXCLUDED.kommune,
         kommune_skatteprocent = EXCLUDED.kommune_skatteprocent,
         kirkeskatteprocent = EXCLUDED.kirkeskatteprocent,
         forventet_a_indkomst = EXCLUDED.forventet_a_indkomst,
         forventet_pension_su_dagpenge = EXCLUDED.forventet_pension_su_dagpenge,
         forventede_fradrag_a_indkomst = EXCLUDED.forventede_fradrag_a_indkomst,
         medlem_folkekirken = EXCLUDED.medlem_folkekirken,
         enlig_forsoerger = EXCLUDED.enlig_forsoerger,
         laast = EXCLUDED.laast`,
      [
        a.id, a.aar, a.hjemmeadresse, a.kommune, a.kommuneSkatteprocent,
        a.kirkeskatteprocent, a.forventetAIndkomst, a.forventetPensionSUDagpenge,
        a.forventedeFradragAIndkomst, a.medlemFolkekirken, a.enligForsoerger, a.laast,
      ]
    );
    return a;
  }

  async sletIndkomstAar(id: string): Promise<void> {
    // Jobs, fradrag, investeringer og opsparing hænger på året med
    // ON DELETE CASCADE, så de forsvinder med.
    await this.pool.query('DELETE FROM indkomstaar WHERE id = $1', [id]);
  }

  async gemJob(j: Job): Promise<Job> {
    await this.pool.query(
      `INSERT INTO job (id, indkomstaar_id, hvervgiver, honorar, start_dato, slut_dato,
         betalings_dato, transportmiddel, antal_km, antal_ture, destination_adresse,
         am_bidrag_fritaget, er_rubrik17, timer_job, timer_transport_forberedelse,
         type, noter, er_eksempel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO UPDATE SET
         indkomstaar_id = EXCLUDED.indkomstaar_id,
         hvervgiver = EXCLUDED.hvervgiver,
         honorar = EXCLUDED.honorar,
         start_dato = EXCLUDED.start_dato,
         slut_dato = EXCLUDED.slut_dato,
         betalings_dato = EXCLUDED.betalings_dato,
         transportmiddel = EXCLUDED.transportmiddel,
         antal_km = EXCLUDED.antal_km,
         antal_ture = EXCLUDED.antal_ture,
         destination_adresse = EXCLUDED.destination_adresse,
         am_bidrag_fritaget = EXCLUDED.am_bidrag_fritaget,
         er_rubrik17 = EXCLUDED.er_rubrik17,
         timer_job = EXCLUDED.timer_job,
         timer_transport_forberedelse = EXCLUDED.timer_transport_forberedelse,
         type = EXCLUDED.type,
         noter = EXCLUDED.noter,
         er_eksempel = EXCLUDED.er_eksempel`,
      [
        j.id, j.indkomstAarId, j.hvervgiver, j.honorar, j.startDato, j.slutDato,
        j.betalingsDato || null, j.transportmiddel, j.antalKm, j.antalTure,
        j.destinationAdresse ?? null, j.amBidragFritaget, Boolean(j.erRubrik17),
        j.timerJob ?? null, j.timerTransportForberedelse ?? null, j.type ?? null,
        j.noter ?? null, Boolean(j.erEksempel),
      ]
    );
    await this.saetBilagstilknytning('job', j.id, j.bilagIds);
    return j;
  }

  async sletJob(id: string): Promise<void> {
    await this.pool.query('DELETE FROM bilag_tilknytning WHERE post_type = $1 AND post_id = $2', ['job', id]);
    await this.pool.query('DELETE FROM job WHERE id = $1', [id]);
  }

  async gemFradrag(f: Fradrag): Promise<Fradrag> {
    await this.pool.query(
      `INSERT INTO fradrag (id, indkomstaar_id, beskrivelse, type_kategori, faktura_dato,
         faktura_beloeb, fradrags_procent, fradrag_i_dkk, revisor_notat, er_eksempel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         indkomstaar_id = EXCLUDED.indkomstaar_id,
         beskrivelse = EXCLUDED.beskrivelse,
         type_kategori = EXCLUDED.type_kategori,
         faktura_dato = EXCLUDED.faktura_dato,
         faktura_beloeb = EXCLUDED.faktura_beloeb,
         fradrags_procent = EXCLUDED.fradrags_procent,
         fradrag_i_dkk = EXCLUDED.fradrag_i_dkk,
         revisor_notat = EXCLUDED.revisor_notat,
         er_eksempel = EXCLUDED.er_eksempel`,
      [
        f.id, f.indkomstAarId, f.beskrivelse, f.typeKategori, f.fakturaDato,
        f.fakturaBeloeb, f.fradragsProcent, f.fradragIDKK, f.revisorNotat ?? null,
        Boolean(f.erEksempel),
      ]
    );
    await this.saetBilagstilknytning('fradrag', f.id, f.bilagIds);
    return f;
  }

  async sletFradrag(id: string): Promise<void> {
    await this.pool.query('DELETE FROM bilag_tilknytning WHERE post_type = $1 AND post_id = $2', ['fradrag', id]);
    await this.pool.query('DELETE FROM fradrag WHERE id = $1', [id]);
  }

  async gemInvestering(i: Investering): Promise<Investering> {
    await this.pool.query(
      `INSERT INTO investering (id, indkomstaar_id, titel, beloeb, faktura_dato, noter, er_eksempel)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         indkomstaar_id = EXCLUDED.indkomstaar_id,
         titel = EXCLUDED.titel,
         beloeb = EXCLUDED.beloeb,
         faktura_dato = EXCLUDED.faktura_dato,
         noter = EXCLUDED.noter,
         er_eksempel = EXCLUDED.er_eksempel`,
      [i.id, i.indkomstAarId, i.titel, i.beloeb, i.fakturaDato, i.noter ?? null, Boolean(i.erEksempel)]
    );
    await this.saetBilagstilknytning('investering', i.id, i.bilagIds);
    return i;
  }

  async sletInvestering(id: string): Promise<void> {
    await this.pool.query('DELETE FROM bilag_tilknytning WHERE post_type = $1 AND post_id = $2', ['investering', id]);
    await this.pool.query('DELETE FROM investering WHERE id = $1', [id]);
  }

  async gemOpsparing(indkomstAarId: string, data: OpsparingsTracker): Promise<void> {
    await this.pool.query(
      `INSERT INTO opsparing (indkomstaar_id, indbetalt_til_skat, opsparet_privat)
       VALUES ($1,$2,$3)
       ON CONFLICT (indkomstaar_id) DO UPDATE SET
         indbetalt_til_skat = EXCLUDED.indbetalt_til_skat,
         opsparet_privat = EXCLUDED.opsparet_privat`,
      [indkomstAarId, data.indbetaltTilSkat, data.opsparetPrivat]
    );
  }

  /* ---------------------------------------------------------------- Bilag */

  async gemBilag(b: Bilag): Promise<Bilag> {
    await this.pool.query(
      `INSERT INTO bilag (id, sha256, filnavn, mime_type, stoerrelse, uploadet)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET filnavn = EXCLUDED.filnavn`,
      [b.id, b.sha256, b.filnavn, b.mimeType, b.stoerrelse, b.uploadet]
    );
    return b;
  }

  async findBilagVedHash(sha256: string): Promise<Bilag | null> {
    const { rows } = await this.pool.query(
      'SELECT id, sha256, filnavn, mime_type, stoerrelse, uploadet FROM bilag WHERE sha256 = $1',
      [sha256]
    );
    return rows[0] ? this.tilBilag(rows[0]) : null;
  }

  async hentBilag(id: string): Promise<Bilag | null> {
    const { rows } = await this.pool.query(
      'SELECT id, sha256, filnavn, mime_type, stoerrelse, uploadet FROM bilag WHERE id = $1',
      [id]
    );
    return rows[0] ? this.tilBilag(rows[0]) : null;
  }

  private tilBilag(r: Record<string, unknown>): Bilag {
    return {
      id: String(r.id),
      sha256: String(r.sha256),
      filnavn: String(r.filnavn),
      mimeType: String(r.mime_type),
      stoerrelse: tal(r.stoerrelse),
      uploadet: r.uploadet instanceof Date ? r.uploadet.toISOString() : String(r.uploadet),
    };
  }

  async sletBilag(id: string): Promise<void> {
    const bilag = await this.hentBilag(id);
    await this.pool.query('DELETE FROM bilag_tilknytning WHERE bilag_id = $1', [id]);
    await this.pool.query('DELETE FROM bilag WHERE id = $1', [id]);

    // Indholdet slettes kun, hvis ingen anden post peger på samme hash.
    if (bilag) {
      await this.pool.query(
        `DELETE FROM bilag_indhold
         WHERE sha256 = $1 AND NOT EXISTS (SELECT 1 FROM bilag WHERE sha256 = $1)`,
        [bilag.sha256]
      );
    }
  }

  /* ------------------------------------------------- BilagsLager-rollen */

  async gem(indhold: Buffer, _mimeType: string): Promise<{ sha256: string }> {
    const sha256 = beregnHash(indhold);
    await this.pool.query(
      'INSERT INTO bilag_indhold (sha256, indhold) VALUES ($1,$2) ON CONFLICT (sha256) DO NOTHING',
      [sha256, indhold]
    );
    return { sha256 };
  }

  async hent(sha256: string, _mimeType: string): Promise<Buffer> {
    const { rows } = await this.pool.query('SELECT indhold FROM bilag_indhold WHERE sha256 = $1', [
      sha256,
    ]);
    if (!rows[0]) throw new BilagFindesIkkeError();
    return rows[0].indhold as Buffer;
  }

  async slet(sha256: string, _mimeType: string): Promise<void> {
    await this.pool.query('DELETE FROM bilag_indhold WHERE sha256 = $1', [sha256]);
  }

  async erstatAlt(snapshot: DataSnapshot): Promise<void> {
    for (const a of snapshot.indkomstAar) await this.gemIndkomstAar(a);
    for (const j of snapshot.jobs) await this.gemJob(j);
    for (const f of snapshot.fradrag) await this.gemFradrag(f);
    for (const i of snapshot.investeringer) await this.gemInvestering(i);
    for (const [id, o] of Object.entries(snapshot.opsparing)) await this.gemOpsparing(id, o);
  }
}
