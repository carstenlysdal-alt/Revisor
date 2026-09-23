# Revisor AI

Revisor AI er en lokal, enkeltbruger revisoragent til danske honorarer og B-indkomst. Du kan fortælle agenten om en hændelse med tale eller tekst eller uploade et bilag. Agenten udtrækker oplysninger, foreslår om de hører til som honorarjob, driftsudgift eller investering og viser et redigerbart forslag. Intet forslag bogføres før du godkender det.

Appen giver et forklarligt **estimat** og et arbejdsgrundlag. Den indberetter ikke til Skattestyrelsen, afgør ikke skattemæssig fradragsret og erstatter ikke TastSelv eller konkret rådgivning.

## Kom i gang

Krav: Node.js 22–24 og npm 11.

```bash
npm install
cp .env.example .env
npm run dev
```

Sæt `GEMINI_API_KEY` i `.env` for at bruge agentindbakken og rådgiverchatten. Appens manuelle registrering, database, beregninger og eksport virker uden AI-nøgle.

Produktionskontrol og start:

```bash
npm run lint
npm test
npm run build
npm start
```

## Den primære arbejdsgang

1. Åbn **Indkomstår**, angiv kommune og kontrollér kommune-/kirkeskat mod forskudsopgørelsen. Indtast derefter forventet A-indkomst, pension/SU/dagpenge og øvrige fradrag.
2. Åbn **Agentindbakke**. Skriv, diktér på dansk eller upload PDF/billede.
3. Agenten foreslår `JOB`, `FRADRAG`, `INVESTERING` eller `UNKNOWN` og vælger et oprettet indkomstår ud fra dokumentets dato.
4. Ret de udtrukne felter og kontrollér det foreslåede år. Kontrollér især rubrik, AM-fritagelse, erhvervsandel, dato, km pr. arbejdsdag og antal arbejdsdage.
5. Vælg **Godkend og opret**. Posten placeres på det kontrollerede indkomstår, og det relevante modul åbnes.
6. Følg estimatet under **Skat overblik**, afstem opsparing og brug **Årsopgørelse** som tjekliste til TastSelv.
7. Under **Dokumentation** kan du åbne alle uploadede originalbilag og udskrive årets samlede opgørelse.
8. Hent jævnligt **Komplet sikkerhedskopi** fra sidepanelet eller din profil. ZIP-filen indeholder hele regnskabet og alle originale bilag og kan gemmes i en lokalt synkroniseret mappe.

Diktering bruger browserens talegenkendelse med sproget `da-DK`. Knappen vises kun, når browseren tilbyder Web Speech Recognition. Mikrofonen kræver browserens tilladelse og normalt HTTPS eller localhost. Browserleverandøren kan behandle lyden som del af sin talegenkendelsestjeneste; appens egen server gemmer ikke lyd.

Når en skrevet eller dikteret registrering godkendes, gemmes den oprindelige tekst sammen med posten og kan åbnes via **Vis oprindelig note**. Uploadede filer gemmes som originalbilag. Uafklarede forslag gemmes ikke som regnskabsposter.

## Data og database

Appen gemmer alle regnskabsdata på serveren. I produktion bruges PostgreSQL til både poster og selve bilagsfilerne, så en ny Railway-udrulning ikke fjerner dem. Ved lokal udvikling uden `DATABASE_URL` bruges `data/data.json` og `data/bilag/`.

- `indkomstaar`, `job`, `fradrag`, `investering` og `opsparing` indeholder regnskabet.
- `bilag` og `bilag_indhold` indeholder metadata og originalfiler; alle filer kan åbnes under **Dokumentation**.
- Den komplette lokale ZIP-backup indeholder `data.json`, `chat-historik.json`, `manifest.json`, en læsevejledning og alle originalfiler i `bilag/`.
- Funktionen **Start helt forfra** sletter regnskab, bilag og chathistorik fra appen, men bevarer profilen og sikkerhedskopier, der allerede er downloadet.
- `npm run backup` kan hente et komplet lokalt arkiv gennem appens beskyttede API.

## AI-laget

`POST /api/ai/analyser-bilag` sender den valgte fil til den konfigurerede AI-model. Serveren kræver struktureret JSON og validerer klassifikation, datoer, beløb, procenter, transport og filstørrelse igen. Dokumentindhold behandles som data, så prompts inde i et bilag skal ignoreres. Ved timeout, manglende nøgle, rate limit eller ugyldigt modelsvar vises en fejl; appen fremstiller aldrig et lokalt reservesvar med opdigtede økonomiske data.

`POST /api/ai/chat` sender de seneste chatbeskeder og et begrænset resumé af det aktive års beregning. Chatten kan foreslå en postering, men den gemmes først, når brugeren godkender det redigerbare forslag.

Standardmodellen er `gemini-3.8-flash` og kan ændres med `GEMINI_MODEL`. AI-endpoints har samme-origin-kontrol, en proceslokal rate limit og en timeout på 45 sekunder.

## Beregninger

Satserne ligger i `src/data/danishTaxData.ts` og er eksplicit versionsstyret for 2025 og 2026. Beregningen:

- holder rubrik 12 og 17 adskilt;
- beregner AM-bidrag af jobs, der ikke er markeret som dokumenteret fritaget;
- begrænser rubrik 29-fradrag til B-indkomst efter AM-bidrag;
- beregner almindeligt befordringsfradrag pr. arbejdsdag med 24/120-km-grænser;
- anvender bil/MC-satsens 20.000-km-grænse pr. hvervgiver;
- beregner mellemskat, topskat og toptopskat som mer-skat, der kan henføres til B-indkomsten;
- indregner A-indkomst, pension/SU/dagpenge, kommune, kirkeskat og øvrige forventede fradrag i estimatet.

Modellen dækker ikke kapitalindkomst, aktieindkomst, beskæftigelsesfradragets fulde personlige variation, yderkommunesats, broer/færger, virksomhedsordning, moms, afskrivning eller alle særlige skatteregler. Kontrollér resultatet i TastSelv. Satser er senest kildekontrolleret 12. september 2026 mod Skattestyrelsens sider om [progressionsskatter](https://skat.dk/hjaelp/bundskat-mellemskat-topskat-og-toptopskat), [kørselsgodtgørelse](https://skat.dk/erhverv/ansatte-og-loen/koerselsgodtgoerelse/koerselsgodtgoerelse-skattepligtig-og-skattefri) og [kørselsfradrag](https://skat.dk/borger/fradrag/koerselsfradrag/beregn-dit-koerselsfradrag).

## Sikker drift

Gemini-nøglen findes kun på serveren. Produktionsserveren sender CSP, `nosniff`, referrer- og permissions-headers, afviser cross-site API-kald og serverer kun `dist/client`. Ukendte filstier og API-ruter giver 404.

Til en privat installation kan hele appen beskyttes med HTTP Basic Auth:

```dotenv
APP_USERNAME=dit-brugernavn
APP_PASSWORD=en-lang-unik-adgangskode
```

Begge værdier skal sættes. Brug altid HTTPS ved adgang over netværk; Basic Auth er kun sikker over en krypteret forbindelse.

## Kvalitetskontrol

```bash
npm run lint       # streng TypeScript-kontrol
npm test           # skatteregler, km-grænser, aflyste jobs og kalenderformat
npm run build      # klient- og ESM-serverartefakter
npm audit          # kendte npm-sårbarheder
```

Den dokumenterede releasekontrol kræver, at alle kommandoer passerer, at `/api/health` svarer, at ukendte API-/filruter giver 404, og at cross-site API-kald afvises.
