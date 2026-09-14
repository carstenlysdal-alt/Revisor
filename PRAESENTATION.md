# revis — Intelligent regnskabs- og skatteplatform til B-indkomst

> **revis** er et specialiseret, agentisk regnskabs- og skatteværktøj bygget til musikere, kunstnere, freelancere, foredragsholdere og andre danskere med B-indkomst og honorarer.
> 
> Platformen forener **deterministisk skatteberegning** med en **kontekstbevidst AI-revisor**, der automatiserer bilagsaflæsning, ruteberegning og årsopgørelsesklargøring — uden gætterier og med fuld transparens.

---

## 1. Formål & Vision

### Problemet vi løser
For selvstændigt virkende uden eget selskab eller momsregistrering er skattereglerne en konstant kilde til usikkerhed:
- **Restskattefælden**: Honorarer udbetales uden indeholdt A-skat eller AM-bidrag. Mange opdager først for sent, hvad der reelt skulle have været lagt til side.
- **Komplekse fradragsregler**: Forskellen på driftsomkostninger (rubrik 29), befordringsfradrag med bundgrænse (rubrik 51), kørsel efter Ligningslovens § 9 B (rubrik 29), og legater/hverv uden AM-bidrag (rubrik 17) er notorisk uigennemskuelig.
- **Skotøjsæske-panikken**: Kvitteringer, fotos og kontrakter samles i bunker, indtil fristen for TastSelv rammer i foråret.

### Filosofien: "Deterministisk matematik + forklarende AI"
- **Regnemaskinen gætter aldrig**: Al beregning af AM-bidrag, personskat, topskatter og kørselsfradrag udføres i en 100 % regelbaseret motor med officielle, årsversionerede satser. Sprogmodeller regner aldrig på tallene.
- **AI foreslår — mennesket godkender**: Sprogmodellen aflæser bilag, finder adresser og formulerer forslag. Intet bogføres automatisk uden brugerens aktive accept.
- **Et arbejdsdokument, ikke et pyntet dashboard**: Platformen taler et roligt, skandinavisk regnskabssprog (Plus Jakarta Sans, IBM Plex Sans og IBM Plex Mono) med fokus på overblik, tæthed og rubriknumre.

---

## 2. Platformens Hovedfunktioner

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 revis                                       │
├───────────────────┬─────────────────────────────┬───────────────────────────┤
│    DAGLIG DRIFT   │        AGENTISK AI          │      ÅRSOPGØRELSE         │
│  • Honorarjobs    │  • "Spørg Revisor" i moduler│  • Matcher TastSelv 1:1   │
│  • Kørsel & ruter │  • Multimodal bilagsscanner │  • Skatteoverblik & satser│
│  • Driftsudgifter │  • Auto-berigelse af ruter  │  • Opsparing til restskat │
│  • Investeringer  │  • Kontekstuelle forslag    │  • Kalender- & dataeksport│
└───────────────────┴─────────────────────────────┴───────────────────────────┘
```

### 1. Agentisk AI-Revisor ("Spørg Revisor")
- **Kontekstuel rådgivning i alle moduler**: Uanset om du står i indtægter, kørsel, driftsfradrag eller skatteoverblik, har du adgang til en integreret AI-revisor via `[ ✦ Spørg Revisor ]`.
- **Dybt regnskabskendskab**: AI'en kender automatisk dit aktive indkomstår, dine registrerede honorarer, din marginalskat og din aktuelle opsparingssaldo. Den kan svare præcist på spørgsmål som:
  - *"Hvor meget skal jeg lægge til side af et honorar på 12.000 kr.?"*
  - *"Kan jeg trække et nyt lydkort fra som driftsudgift eller er det en investering?"*
  - *"Hvordan påvirker kørslen til Kolding min samlede restskat?"*
- **Tale- og tekstinput**: Diktering på dansk direkte i browseren.

### 2. Intelligent Rute- & Afstandsberegning
- **Tur/retur er altid standard**: I overensstemmelse med Ligningslovens regler beregnes alle kørselsruter automatisk som tur/retur fra bopælen (`turRetur = true`). Enkelt-tur kan let vælges, hvis turen kun er én vej.
- **Mellemstationer (stop undervejs)**: Mulighed for at tilføje et eller flere stop på ruten (f.eks. øvelokale, opsamling af kollega, grejlager) via `+ Tilføj mellemstation`. Ruten beregnes i præcis vejnet-rækkefølge frem og tilbage.
- **Åben, dansk geospatial arkitektur**:
  - **DAWA** (*Danmarks Adressers Web API*): Officielle danske vejnavne og husnumre med lynhurtig autocomplete.
  - **OpenStreetMap Nominatim**: Genkender kultursteder, spillesteder, biblioteker og institutioner (*"Vega"*, *"Kolding Bibliotek"*, *"Musikhuset Aarhus"*).
  - **OSRM** (*Open Source Routing Machine*): Faktisk bilkørsel over vejnettet.
  - **Gratis og uden API-nøgler**: Kræver intet betalingskort eller opsætning fra brugerens side.

### 3. Multimodal Bilagsscanner
- **Fotografer kvitteringen på farten**: Mobiloptimeret kamerasystem (`capture="environment"`), så kvitteringer kan scannes direkte ved kassen eller i bilen.
- **Automatisk udtræk**: Udlæser beløb, dato, modpart, CVR og kategoriserer posten som job, driftsomkostning eller investering.
- **Usikkerhedsmarkering**: Felter med lav konfidens markeres tydeligt i grænsefladen til manuel kontrol.
- **Bilaget følger posten**: Originalfilen arkiveres og kan altid fremvises som dokumentation over for Skattestyrelsen.

### 4. Skatteberegner & Opsparingsvejleder
- **Løbende restskatteprognose**: Beregner præcist, hvad du skylder i skat lige nu, og hvad du har lagt til side på din skattekonto.
- **Fuld progression**: Håndterer AM-bidrag, personfradrag, kommuneskat, kirkeskat, bundskat, mellemskat, topskat og toptopskat samt seniorfradrag og ø-fradrag.
- **Kørselsfradragsdifferentiering**:
  - Kunstnere/musikere: Fradrag i rubrik 29 efter statens høje takster (Ligningslovens § 9 B).
  - Bestyrelseshverv/almindelig befordring: Fradrag i rubrik 51 med bundgrænse på 24 km (Ligningslovens § 9 C).

### 5. Årsopgørelse & TastSelv-Afstemning
- **1:1 spejling af TastSelv**: Når skatteåret er omme, viser modulet en klar tabel over præcis, hvad der skal tastes i:
  - **Rubrik 12**: B-indkomst, hvor der skal betales AM-bidrag.
  - **Rubrik 17**: B-indkomst uden AM-bidrag (f.eks. legater eller bestyrelseshonorarer).
  - **Rubrik 29**: Erhvervsmæssige driftsomkostninger og kunstnerkørsel.
  - **Rubrik 51**: Befordringsfradrag.
- **Kalendereksport**: Opretter automatisk kalenderbegivenheder (`.ics` eller Google Calendar) for alle jobs inkl. beregnet kørselsfradrag og nettohonorar.

### 6. Datasikkerhed & Arkivering
- **Single-tenant arkitektur**: Kører som en privat, isoleret instans — enten lokalt eller i skyen (f.eks. Railway).
- **Automatiske snapshots**: Hver eneste ændring danner en versionshistorik, så fejlagtige rettelser altid kan rulles tilbage.
- **Google Drive & JSON-backup**: Automatisk backup af alle data og bilag til brugerens egen Google Drive-konto eller som én samlet ZIP/JSON-fil.

---

## 3. Målgruppe

| Brugerprofil | Primære behov i platformen |
|---|---|
| **Musikere & Scenekunstnere** | Omfattende kørsel til spillesteder, instrumentinvesteringer, øvelokaleleje og varierende honorarer fra mange hvervgivere. |
| **Freelancere & Konsulenter** | Fradrag for software, udstyr og kontorhold; præcis opsparingsprocent til B-skatteraterne. |
| **Foredragsholdere & Forfattere** | Blanding af royalty/legater (rubrik 17) og honorarer (rubrik 12) samt lange køreafstande. |
| **Bestyrelsesmedlemmer** | Hverv uden skattefri kørselsgodtgørelse, korrekt placering i rubrik 51 med 24 km-bundgrænse. |

---

## 4. Teknisk Stack

- **Frontend**: React 19, TypeScript, TailwindCSS (stramt designsystem baseret på OKLCH-farver og `DESIGN.md`), Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, SQLite / filbaseret JSON-repository med versionskontrol.
- **AI-motorer**: Google Gemini (`gemini-2.5-flash` / `gemini-3.8-flash`) og DeepSeek (`deepseek-chat`).
- **Geodata & Ruter**: DAWA (Danmarks Adressers Web API), OpenStreetMap Nominatim, OSRM (Open Source Routing Machine).
- **Deployment**: Optimeret til cloud-drift på Railway med Node.js 22, automatisk HTTPS og robust procesovervågning.

---

## 5. Konklusion

**revis** fjerner frygten for skat og B-indkomst ved at gøre regnskabet til en gennemskuelig, daglig rutine. Platformen overlader aldrig regnestykket til tilfældigheder, men udnytter moderne kunstig intelligens der, hvor den skaber reel værdi: til at aflæse bilag, finde adresser og give personlig, rolig vejledning ved køkkenbordet.
