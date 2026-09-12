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
npm run check
npm start
```

## Den primære arbejdsgang

1. Åbn **Indkomstår**, angiv kommune og kontrollér kommune-/kirkeskat mod forskudsopgørelsen. Indtast derefter forventet A-indkomst, pension/SU/dagpenge og øvrige fradrag.
2. Åbn **Agentindbakke**. Skriv, diktér på dansk eller upload PDF/billede.
3. Agenten foreslår `JOB`, `FRADRAG`, `INVESTERING` eller `UNKNOWN` og vælger et oprettet indkomstår ud fra dokumentets dato.
4. Ret de udtrukne felter og kontrollér det foreslåede år. Kontrollér især rubrik, AM-fritagelse, erhvervsandel, dato, km pr. arbejdsdag og antal arbejdsdage.
5. Vælg **Godkend og opret**. Posten placeres på det kontrollerede indkomstår, og det relevante modul åbnes.
6. Følg estimatet under **Skat overblik**, afstem opsparing og brug **Årsopgørelse** som tjekliste til TastSelv.
7. Under **Indkomstår → Årsarkiv** kan du se og gendanne automatiske versioner eller eksportere det valgte år med dets bilag.
8. Hent jævnligt **Backup** fra headeren. Den komplette backup indeholder aktuelle appdata, alle originalbilag og hele versionshistorikken.

Diktering bruger browserens talegenkendelse med sproget `da-DK`. Knappen vises kun, når browseren tilbyder Web Speech Recognition. Mikrofonen kræver browserens tilladelse og normalt HTTPS eller localhost. Browserleverandøren kan behandle lyden som del af sin talegenkendelsestjeneste; appens egen server gemmer ikke lyd.

Når en skrevet eller dikteret registrering godkendes, gemmes den oprindelige tekst sammen med posten og kan åbnes via **Vis oprindelig note**. Uploadede filer gemmes som originalbilag. Uafklarede forslag gemmes ikke som regnskabsposter.

## Data og database

IndexedDB er appens primære lokale database:

- `app-state` indeholder indkomstår, jobs, fradrag, investeringer og opsparing.
- `documents` indeholder de originalfiler, der blev godkendt sammen med et forslag.
- `snapshots` indeholder en automatisk version, hver gang appens økonomiske data reelt ændres. Identiske tilstande gemmes ikke igen.
- Bilag slettes ikke, når en job-, fradrags- eller investeringspost slettes. Dermed virker gendannelse af ældre versioner fortsat.
- Eksisterende localStorage-data bruges som migrationskilde første gang databasen åbnes og vedligeholdes som lokal fallback.
- Data er bundet til browserprofilen og enhedens origin. Rydning af browserdata sletter dem.
- **Eksporter år** opretter et selvstændigt JSON-arkiv med det valgte års poster og tilknyttede bilag. Ved import erstattes kun samme kalenderår; andre år bevares.
- Den komplette JSON-backup omfatter aktuelle poster, alle bilag og versionshistorik. Import valideres og kræver bekræftelse, fordi den erstatter den aktuelle database.

Det automatiske versionsarkiv ligger i samme browserdatabase som de aktuelle data. Det beskytter mod fejlagtige ændringer og sletninger, men ikke mod tab af browserprofil eller enhed. Den downloadede komplette backup er derfor den eksterne kopi. Der er ingen cloud-database eller synkronisering mellem enheder i version 0.1.0.

## AI-laget

`POST /api/gemini/analyze-bilag` sender den valgte note eller fil til den konfigurerede Gemini-model. Serveren kræver struktureret JSON og validerer klassifikation, datoer, beløb, procenter, transport og filstørrelse igen. Dokumentindhold behandles som data, så prompts inde i et bilag skal ignoreres. Ved timeout, manglende nøgle, rate limit eller ugyldigt modelsvar vises en fejl; appen fremstiller aldrig et lokalt reservesvar med opdigtede økonomiske data.

`POST /api/gemini/revisor-chat` sender de seneste 20 chatbeskeder og et begrænset resumé af det aktive års beregning. Chatten forklarer estimatet og kan ikke selv bogføre. Registrering foregår gennem agentindbakken, hvor forslaget kan kontrolleres før oprettelse.

Standardmodellen er `gemini-3.8-flash` og kan ændres med `GEMINI_MODEL`. AI-endpoints har samme-origin-kontrol, en proceslokal rate limit og en timeout på 45 sekunder.

## Beregninger

Satserne ligger i `src/data/danishTaxData.ts` og er eksplicit versionsstyret for 2025 og 2026. Beregningen:

- udelader jobs med status `AFLYST`;
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
npm run typecheck  # streng TypeScript-kontrol
npm test           # skatteregler, km-grænser, aflyste jobs og kalenderformat
npm run build      # klient- og ESM-serverartefakter
npm audit          # kendte npm-sårbarheder
```

Den dokumenterede releasekontrol kræver, at alle kommandoer passerer, at `/api/health` svarer, at ukendte API-/filruter giver 404, og at cross-site API-kald afvises.
