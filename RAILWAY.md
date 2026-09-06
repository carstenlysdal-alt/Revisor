# Udrulning på Railway

## Før du begynder

Appen indeholder honorarer, hjemmeadresse og bilag med personoplysninger, også
om andre end dig selv. Den skal ikke ligge åbent på internettet. To variabler
afgør det, og uden dem svarer serveren kun på kald fra samme maskine.

## 1. Lav et kodeord

```bash
npm run kodeord
```

Scriptet beder om et kodeord og skriver to variabler ud. Kodeordet i sig selv
gemmes ingen steder, kun hashet, så det kan ikke findes frem igen. Vælg noget
langt: fire tilfældige ord slår ét kryptisk.

## 2. Sæt variablerne i Railway

Under **Variables** på servicen:

| Variabel | Værdi |
|---|---|
| `AUTH_PASSWORD_HASH` | fra `npm run kodeord` |
| `SESSION_SECRET` | fra `npm run kodeord` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `GEMINI_API_KEY` | din nøgle fra Google AI Studio |
| `NODE_ENV` | `production` |

`DATABASE_URL` skrives som en reference til Postgres-servicen i samme projekt,
ikke som en kopieret streng. Så følger den med, hvis databasen genskabes.

`TAVILY_API_KEY` er valgfri. Uden den bruger revisor-chatten DuckDuckGo, når
den skal slå en regel op på skat.dk.

## 3. Udrul

Railway læser `railway.json` og bygger med `npm ci --include=dev && npm run build`.
Skemaet i `server/db/schema.sql` køres automatisk ved opstart, og alt i det er
`IF NOT EXISTS`, så en genudrulning rører ikke eksisterende data.

Sundhedstjekket ligger på `/api/health` og kræver ikke login. Det svarer kun,
at containeren lever, og røber intet om indholdet.

## Hvor bilagene ligger

I databasen, som `bytea` i tabellen `bilag_indhold`, nøglet på filens
SHA-256-sum. Det er ikke for at spare en volume: en container på Railway får
nyt filsystem ved hver udrulning, så en fil på disk ville være væk, første gang
appen blev opdateret. I databasen følger bilagene med i backuppen af den, og
det samme bilag lagt op to gange fylder kun én gang.

## Backup til din egen maskine

```bash
REVISOR_URL="https://din-app.up.railway.app" npm run backup
```

Scriptet beder om kodeordet, henter hele regnskabet som `data.json` og hvert
bilag som den fil, det blev lagt op som. Alt lander i `backup/revisor-<dato>/`.

Backuppen går gennem appens eget API, ikke direkte i databasen. Det betyder,
at databasen ikke behøver være åben mod internettet, for at du kan tage en
kopi, og at der ikke findes en vej til bilagene, som ikke går gennem login.

Vil du lægge kodeordet i miljøet i stedet for at taste det hver gang:

```bash
REVISOR_URL="https://din-app.up.railway.app" REVISOR_KODEORD="..." npm run backup
```

Mappen `backup/` er i `.gitignore` og bliver aldrig committet.

## Det du selv skal tage stilling til

**Databehandleraftale.** Bilag sendes videre til Google, når de skal læses. De
kan indeholde oplysninger om andre end dig: kontaktpersoner, kontonumre,
adresser. Det kræver en aftale med udbyderen. Vil du ikke det, kan du slå
bilagslæsningen fra ved at lade `GEMINI_API_KEY` stå tom og oprette posterne
manuelt; resten af appen virker uændret.

**Hvor Railway hoster.** Vælg en region i EU, hvis dataene skal blive i EU.

**Kodeordet kan ikke nulstilles indefra.** Mister du det, laver du et nyt hash
med `npm run kodeord` og udskifter `AUTH_PASSWORD_HASH`. Skifter du
`SESSION_SECRET`, bliver alle åbne sessioner logget ud med det samme.
