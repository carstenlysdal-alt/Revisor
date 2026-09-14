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

`OPENROUTESERVICE_API_KEY` er også valgfri — uden den virker "Beregn
afstand"-knappen ved kørselsfelterne bare ikke, og man taster kilometer
manuelt som hidtil. Gratis nøgle uden betalingskort på openrouteservice.org.

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` og `GOOGLE_REDIRECT_URI` er også
valgfri — se afsnittet "Google Drev-backup" nedenfor. Uden dem vises
Drev-blokken i sidepanelet slet ikke.

## 3. Udrul

Railway læser `railway.json`. Nixpacks' egen installationsfase installerer alle
afhængigheder (inklusive devDependencies — moderne npm skjuler dem ikke længere
ud fra `NODE_ENV`), og `buildCommand` kører derefter kun `npm run build`. Kør
ikke `npm ci` igen i `buildCommand` — et andet `npm ci`-kald oven på et allerede
udfyldt `node_modules` rammer en fillås på Nixpacks' cache-mount og fejler
bygningen med `EBUSY: resource busy or locked, rmdir '.../node_modules/.cache'`.
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

## Google Drev-backup

Sidepanelet får en "Forbind Google Drev"-knap, når `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET` og `GOOGLE_REDIRECT_URI` alle er sat. Herefter
sikkerhedskopieres hvert uploadet bilag automatisk, plus et opdateret
datasnapshot af hele regnskabet efter hver ændring. Det er endnu en kopi,
ikke et lager appen
selv læser fra. Dette er ekstra sikkerhed oven på Postgres, ikke en
erstatning for den.

**Sådan sættes det op:**

1. Opret et projekt i [Google Cloud Console](https://console.cloud.google.com),
   aktivér Google Drive API, og opret et OAuth-klient-id under
   **API'er og tjenester → Legitimationsoplysninger** (type: webapplication).
2. Sæt "Authorized redirect URI" til `https://din-app.up.railway.app/api/google/callback`
   — den skal matche `GOOGLE_REDIRECT_URI` byte for byte.
3. Sæt de tre variabler i Railway.

**Vigtigt, og let at overse:** så længe OAuth-samtykkeskærmen i Google Cloud
Console står i status **"Testing"**, udløber ethvert refresh token efter
nøjagtigt 7 dage — uanset hvor ofte appen bruges, og uanset om du har
tilføjet dig selv som testbruger (det løser kun 100-brugergrænsen, ikke
levetiden). Sæt samtykkeskærmen til **"In production"**, før forbindelsen
bruges til noget, det ville være et problem at miste. Fordi scopet
(`drive.file`) tæller som "sensitive" hos Google, viser browseren en
"Google har ikke verificeret denne app"-advarsel ved forbindelse — for en
enkeltbrugerapp er løsningen at klikke sig igennem den (Avanceret → Gå til
appen), ikke at gennemgå Googles fulde appverifikationsproces.

Bliver forbindelsen ugyldig (tilbagekaldt manuelt, eller udløbet), viser
sidepanelet det tydeligt i stedet for at fejle stille. Appen forsøger igen
ved næste ændring og efter en genstart; genforbind, hvis tokenet er udløbet.

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
