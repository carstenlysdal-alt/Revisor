# Designsystem

## Retning

**Revisionsprotokol.** Appen er et arbejdsdokument, ikke en oversigtsskærm. Indhold adskilles med typografi, hårfine linjer og hvidrum. Ikke med kort, og aldrig med kort inde i kort.

**Signaturelementet** er rubriknummeret. Hver eneste beløbslinje bærer sit rubriknummer (12, 17, 29, 51) sat i mono i venstre margen, og markøren går igen i Jobs, Fradrag, Overblik og Årsopgørelse. Man skal aldrig være i tvivl om, hvor et beløb ender på årsopgørelsen.

**Gitteret** er det andet bærende greb. Beløbskolonnen står samme sted på tværs af moduler, så tallene flugter, når man skifter fane.

## Farve

Strategi: **Restrained**, taget til sin yderste konsekvens. Grænsefladen er warm graphite på papir. Der er ingen brandfarve.

Det er en bevidst beslutning, ikke en mangel. Når intet andet på skærmen har kulør, betyder rød og grøn noget: rød er skat, der ikke er dækket ind, grøn er skat, der er. Havde grænsefladen også haft en dekorativ accentfarve, ville advarslen skulle konkurrere om opmærksomheden.

Aktiv tilstand markeres derfor med vægt og en 2px blæklinje, ikke med en kulør.

Alle værdier i OKLCH. Ingen neutral er ren hvid eller sort; alle er tonet mod hue 75 med kroma 0,003 til 0,010.

| Token | Værdi | Brug |
|---|---|---|
| `--ground` | `oklch(0.972 0.004 75)` | sidens bund |
| `--surface` | `oklch(0.993 0.003 75)` | tabelflade, formularflade |
| `--surface-sunk` | `oklch(0.955 0.005 75)` | sumlinjer, totalrækker |
| `--ink` | `oklch(0.210 0.008 75)` | brødtekst, tal, aktiv tilstand |
| `--ink-muted` | `oklch(0.500 0.010 75)` | labels, sekundær tekst |
| `--ink-faint` | `oklch(0.630 0.008 75)` | rubrikmarkører, metadata |
| `--rule` | `oklch(0.895 0.006 75)` | hårfin linje mellem rækker |
| `--rule-strong` | `oklch(0.780 0.008 75)` | linje over totaler, sektionsskel |
| `--negative` | `oklch(0.505 0.165 27)` | skyldig skat, rubrik 29-loft overskredet |
| `--negative-ground` | `oklch(0.955 0.030 27)` | bund bag advarsel |
| `--positive` | `oklch(0.455 0.085 150)` | skat er dækket ind |
| `--positive-ground` | `oklch(0.955 0.025 150)` | bund bag bekræftelse |
| `--focus` | `oklch(0.550 0.140 250)` | fokusring, kun tastaturnavigation |

Fokusringen er blå, fordi det er platformkonventionen. Den skal ikke læses som en brandfarve, og den bruges intet andet sted.

## Typografi

| Rolle | Font | Brug |
|---|---|---|
| Display | Plus Jakarta Sans | sidetitler, sektionsoverskrifter |
| Brød | IBM Plex Sans | al løbende tekst, labels, knapper |
| Tal | IBM Plex Mono | alle beløb, datoer, rubrikmarkører, kilometer |

Ingen Inter, Roboto, Arial eller systemfont.

Skala med mindst 1,25 mellem trin: 11, 12, 14, 16, 20, 26, 34. Brødtekst 14. Linjelængde højst 70 tegn i løbende tekst.

Alle tal sættes med `tabular-nums`. Det er ikke kun et layoutkrav; en beløbskolonne, hvor cifrene ikke står under hinanden, kan ikke læses som et regnskab.

## Linjer og rum

Hårfine linjer bærer strukturen. En tabelrække adskilles med `1px var(--rule)`, en sektion med `1px var(--rule-strong)`, en total med en linje over og `--surface-sunk` bag.

Radius: 4px på inputfelter og knapper, 0 på tabeller og sektioner. Ingen store afrundinger.

Skygger bruges kun til flydende lag: modaler og popover. Aldrig på tabelrækker eller sektioner.

Spacing varieres bevidst. Tæt inde i en posteringstabel, luftigere omkring sektionsskift. Samme padding overalt er monotoni.

## Motion

Ease-out, eksponentielle kurver. Ingen bounce, ingen elastic. Ingen animation af layoutegenskaber.

`prefers-reduced-motion` respekteres alle steder: varigheden sættes til 0, tilstanden skifter stadig.

## Mobil

Telefonen er ikke en smal udgave af skrivebordet. Den har sin egen opgave: bilaget ligger på bordet, telefonen er i hånden, og det skal registreres nu, ikke i marts.

**Hovedhandlingen er kameraet.** En fast bundlinje giver adgang til bilagslæsningen fra enhver skærm, med kameraet som primær knap og revisor-chatten ved siden af. Filvælgeren åbner bagkameraet direkte gennem `capture="environment"`, så vejen fra kvittering til postering er ét tryk.

**Tabellerne bliver til stakkede rækker.** Et regnskab med syv kolonner kan ikke læses på 375 px. Under `md` erstattes tabellen af en liste, hvor beløbet er det tunge element og resten står som understøttende tekst under. Ingen vandret scroll på siden, nogensinde.

**Årets tre tal ligger øverst.** Skat i alt, sat til side, og forskellen. Sidebaren er en skrivebordsting og skjules helt; på telefonen ville den ligge under hele posteringslisten, hvor ingen ser den.

**Færre handlinger pr. række.** Rediger og slet står i listen. Kopiér og kalender ligger i redigeringsvinduet, hvor der er plads til at forklare dem. Fire understregede links pr. række er støj.

**Vinduer fylder skærmen.** En dialog med marginer hele vejen rundt stjæler den plads, der skal bruges til at udfylde en kladde. Hoved og bund er klæbende, så titlen og godkend-knappen altid er synlige.

Brydepunkter: 375, 768, 1024, 1440. Berøringsmål mindst 48 px høje.

## Komponentsprog

- **Posteringslinje:** rubrikmarkør i margen, beskrivelse, metadata i `--ink-faint`, beløb højrestillet i mono. Ingen boks omkring.
- **Total:** linje over, `--surface-sunk` bag, samme kolonnejustering som rækkerne over.
- **Advarsel:** `--negative-ground` som bund, `--negative` tekst, fuld ramme. Aldrig en farvet kantstribe i venstre side.
- **Knap:** primær er fyldt blæk, sekundær er ramme, tertiær er ren tekst med understregning ved hover.
- **Felt:** label over feltet, hjælpetekst under, mindst 48px højt. Beløbsfelter er højrestillede og i mono.
- **Tom tilstand:** en sætning om hvad der mangler, og den handling der løser det. Ingen illustration.

## Bandlyst

Kantstriber i siden af en boks, gradienttekst, glassmorphism, hero-tal med støttetal under, ens kortgitre, modal som første indskydelse, glimt-ikoner på AI-funktioner, tankestreger i brugervendt tekst.
