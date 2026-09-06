-- Revisor AI, Postgres-skema.
--
-- Skemaet er specifikationen for både fil-driveren og den kommende
-- Postgres-driver. Det tages i brug, når DATABASE_URL peger på Railway.
--
-- Beløb gemmes som numeric, aldrig som float. En afrundingsfejl i en
-- skatteberegning er ikke til at finde bagefter.

CREATE TABLE IF NOT EXISTS indkomstaar (
  id                          text PRIMARY KEY,
  aar                         integer NOT NULL,
  hjemmeadresse               text NOT NULL DEFAULT '',
  kommune                     text NOT NULL DEFAULT '',
  kommune_skatteprocent       numeric(6,3) NOT NULL DEFAULT 0,
  kirkeskatteprocent          numeric(6,3) NOT NULL DEFAULT 0,
  forventet_a_indkomst        numeric(14,2) NOT NULL DEFAULT 0,
  forventet_pension_su_dagpenge numeric(14,2) NOT NULL DEFAULT 0,
  forventede_fradrag_a_indkomst numeric(14,2) NOT NULL DEFAULT 0,
  medlem_folkekirken          boolean NOT NULL DEFAULT false,
  enlig_forsoerger            boolean NOT NULL DEFAULT false,
  laast                       boolean NOT NULL DEFAULT false,
  UNIQUE (aar)
);

CREATE TABLE IF NOT EXISTS bilag (
  id          text PRIMARY KEY,
  sha256      text NOT NULL,
  filnavn     text NOT NULL,
  mime_type   text NOT NULL,
  stoerrelse  bigint NOT NULL,
  uploadet    timestamptz NOT NULL DEFAULT now()
);

-- Samme indhold uploadet to gange skal kunne opdages.
CREATE UNIQUE INDEX IF NOT EXISTS bilag_sha256_idx ON bilag (sha256);

-- Selve filen. Nøglet på indholdets hash, så to uploads af samme bilag kun
-- fylder én gang. Filerne ligger i databasen frem for på disk, fordi en
-- container på Railway får nyt filsystem ved hver udrulning, og fordi
-- dokumentationen for et fradrag skal kunne findes frem år efter.
CREATE TABLE IF NOT EXISTS bilag_indhold (
  sha256   text PRIMARY KEY,
  indhold  bytea NOT NULL
);

CREATE TABLE IF NOT EXISTS job (
  id                            text PRIMARY KEY,
  indkomstaar_id                text NOT NULL REFERENCES indkomstaar(id) ON DELETE CASCADE,
  hvervgiver                    text NOT NULL DEFAULT '',
  honorar                       numeric(14,2) NOT NULL DEFAULT 0,
  start_dato                    date NOT NULL,
  slut_dato                     date NOT NULL,
  betalings_dato                date,
  transportmiddel               text NOT NULL DEFAULT 'NONE'
                                  CHECK (transportmiddel IN ('NONE','OWN_CAR_MC','OWN_BIKE','PASSENGER')),
  antal_km                      numeric(10,2) NOT NULL DEFAULT 0,
  antal_ture                    integer NOT NULL DEFAULT 0,
  destination_adresse           text,
  am_bidrag_fritaget            boolean NOT NULL DEFAULT false,
  er_rubrik17                   boolean NOT NULL DEFAULT false,
  timer_job                     numeric(6,2),
  timer_transport_forberedelse  numeric(6,2),
  type                          text,
  noter                         text,
  er_eksempel                   boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS job_indkomstaar_idx ON job (indkomstaar_id);

CREATE TABLE IF NOT EXISTS fradrag (
  id                text PRIMARY KEY,
  indkomstaar_id    text NOT NULL REFERENCES indkomstaar(id) ON DELETE CASCADE,
  beskrivelse       text NOT NULL DEFAULT '',
  type_kategori     text NOT NULL DEFAULT '',
  faktura_dato      date NOT NULL,
  faktura_beloeb    numeric(14,2) NOT NULL DEFAULT 0,
  fradrags_procent  numeric(5,2) NOT NULL DEFAULT 100
                      CHECK (fradrags_procent >= 0 AND fradrags_procent <= 100),
  fradrag_i_dkk     numeric(14,2) NOT NULL DEFAULT 0,
  revisor_notat     text,
  er_eksempel       boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS fradrag_indkomstaar_idx ON fradrag (indkomstaar_id);

CREATE TABLE IF NOT EXISTS investering (
  id              text PRIMARY KEY,
  indkomstaar_id  text NOT NULL REFERENCES indkomstaar(id) ON DELETE CASCADE,
  titel           text NOT NULL DEFAULT '',
  beloeb          numeric(14,2) NOT NULL DEFAULT 0,
  faktura_dato    date NOT NULL,
  noter           text,
  er_eksempel     boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS investering_indkomstaar_idx ON investering (indkomstaar_id);

-- Bilag kan hænge på et job, et fradrag eller en investering.
CREATE TABLE IF NOT EXISTS bilag_tilknytning (
  bilag_id    text NOT NULL REFERENCES bilag(id) ON DELETE CASCADE,
  post_type   text NOT NULL CHECK (post_type IN ('job','fradrag','investering')),
  post_id     text NOT NULL,
  PRIMARY KEY (bilag_id, post_type, post_id)
);

CREATE INDEX IF NOT EXISTS bilag_tilknytning_post_idx ON bilag_tilknytning (post_type, post_id);

CREATE TABLE IF NOT EXISTS opsparing (
  indkomstaar_id      text PRIMARY KEY REFERENCES indkomstaar(id) ON DELETE CASCADE,
  indbetalt_til_skat  numeric(14,2) NOT NULL DEFAULT 0,
  opsparet_privat     numeric(14,2) NOT NULL DEFAULT 0
);
