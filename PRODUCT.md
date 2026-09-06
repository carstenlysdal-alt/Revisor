# revis

register: product

## Hvad produktet er

Et regnskabs- og skatteværktøj til danskere med B-indkomst. Brugeren registrerer honorarjobs, kørsel, driftsfradrag og investeringer, og værktøjet beregner løbende AM-bidrag og personskat efter danske regler, så det til enhver tid er tydeligt, hvad der skal sættes til side, og hvad der skal stå på årsopgørelsen.

Bilag kan uploades og bliver læst af en sprogmodel, der foreslår en postering. Forslaget er altid et udkast. Brugeren godkender.

## Brugere

Musikere, foredragsholdere, kunstnere, bestyrelsesmedlemmer og freelancere med honorarindtægt ved siden af eventuelt lønarbejde. De er ikke teknikere, men de er optaget af deres skat, fordi restskatten rammer dem personligt.

Den konkrete scene, produktet skal holde til: en musiker ved køkkenbordet klokken 23 i november, tre uger før fristen, med en skotøjsæske kvitteringer og en bærbar.

## Tone

Præcis og rolig. Fagsproget bliver stående: rubrik 29, AM-bidrag og ligningsmæssige fradrag er de rigtige ord, ikke jargon der skal forenkles væk. Til gengæld skal alt andet være almindeligt dansk.

Værktøjet lover ikke noget, det ikke kan holde. Det siger, hvad det ved, og hvad det ikke ved.

## Strategiske principper

1. **Tallene skal kunne efterprøves.** Al skatteberegning sker i en deterministisk regelmotor med årsversionerede satser. Sprogmodellen læser dokumenter og skriver tekst. Den regner aldrig.
2. **AI foreslår, mennesket godkender.** Intet bliver gemt, fordi en model var sikker på noget. Fradragsprocenten er et skøn med juridisk ansvar, og ansvaret er brugerens.
3. **Tomt er bedre end opdigtet.** Kan et felt ikke læses, står det tomt og markeret. En tom rubrik kan udfyldes. Et forkert tal, der ser rigtigt ud, bliver indberettet.
4. **Bilaget følger posteringen.** Et beløb uden dokumentation er ikke et fradrag. Filen gemmes, og den kan hentes frem igen.
5. **Tæthed frem for luft.** Det her er et arbejdsdokument. Brugeren skal kunne se hele året på én skærm, ikke scrolle gennem kort.

## Anti-referencer

- **Generisk AI-SaaS.** Lilla gradienter, glimt-ikoner, afrundede kort i kort, store tomme flader, hero-tal med tre støttetal under. Hvis skærmbilledet kunne komme fra en vilkårlig startup, er det forkert.
- **b-indkomst.dk's eget udtryk.** Værktøjet skal kunne det samme fagligt, men det skal ikke ligne det.
- **Dashboardet.** Produktet er et regnskab, ikke en oversigtsskærm med widgets.
- **Bankappen.** Ingen beroligende afrundethed. Det her er tal, man skal kunne kontrollere, ikke føle sig godt tilpas med.

## Uden for scope

Fakturering til hvervgivere, momsregnskab, fuld A-indkomstberegning, indberetning til SKAT, flerbrugeradgang.
