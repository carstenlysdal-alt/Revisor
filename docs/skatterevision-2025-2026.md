# Skatterevision af Revisor AI — 2025 og 2026

Kontrolleret 13. september 2026. Gennemgangen omfatter de satser og regler, som appens nuværende beregningsmotor faktisk bruger: personskat, AM-bidrag, arbejdsfradrag, kommuneskat, kirkeskat, honorarfradrag og kørsel. Kun Skattestyrelsen, Skatteministeriet og Retsinformation er brugt som regelkilder.

## Kontrollerede satser

| Sats | 2025 | 2026 | Primær kilde |
|---|---:|---:|---|
| AM-bidrag | 8 % | 8 % | [Skattestyrelsen](https://skat.dk/borger/am-bidrag) |
| Bundskat | 12,01 % | 12,01 % | [Skatteministeriet: personskatteloven](https://svmn.dk/tal-og-metode/satser/satser-og-beloebsgraenser-i-lovgivningen/personskatteloven) |
| Personfradrag | 51.600 kr. | 54.100 kr. | [Skatteministeriet: personskatteloven](https://svmn.dk/tal-og-metode/satser/satser-og-beloebsgraenser-i-lovgivningen/personskatteloven) |
| Topskat / mellemskat efter AM-bidrag | 15 % over 611.800 kr. | 7,5 % over 641.200 kr. | [Skattestyrelsen](https://skat.dk/hjaelp/bundskat-mellemskat-topskat-og-toptopskat) |
| Topskat og top-topskat i 2026 | — | 7,5 % over 777.900 kr.; 5 % over 2.592.700 kr. | [Skattestyrelsen](https://skat.dk/hjaelp/bundskat-mellemskat-topskat-og-toptopskat) |
| Skråt skatteloft | 52,07 % | 44,57 % for første progressive lag | [Skatteministeriet: personskatteloven](https://svmn.dk/tal-og-metode/satser/satser-og-beloebsgraenser-i-lovgivningen/personskatteloven) |
| Beskæftigelsesfradrag | 12,3 %, maks. 55.600 kr. | 12,75 %, maks. 63.300 kr. | [Skattestyrelsen](https://skat.dk/borger/fradrag/arbejdsrelaterede-fradrag/beskaeftigelses-og-jobfradrag) |
| Jobfradrag | 4,5 % over 224.500 kr., maks. 2.900 kr. | 4,5 % over 235.200 kr., maks. 3.100 kr. | [Skattestyrelsen](https://skat.dk/borger/fradrag/arbejdsrelaterede-fradrag/beskaeftigelses-og-jobfradrag) |
| Ekstra fradrag til enlig forsørger | 11,5 %, maks. 48.300 kr. | 11,5 %, maks. 50.600 kr. | [Skattestyrelsen](https://skat.dk/borger/fradrag/arbejdsrelaterede-fradrag/beskaeftigelses-og-jobfradrag) |
| Seniorfradrag | — | 1,4 %, maks. 6.100 kr. | [Skatteministeriet: ligningsloven](https://svmn.dk/tal-og-metode/satser/satser-og-beloebsgraenser-i-lovgivningen/ligningsloven) |
| Erhvervskørsel i bil/mc | 3,81 / 2,23 kr. | 3,94 / 2,28 kr. | [2025-bekendtgørelse](https://www.retsinformation.dk/eli/lta/2024/1189), [2026-bekendtgørelse](https://www.retsinformation.dk/eli/lta/2025/1333) |
| Erhvervskørsel på cykel/knallert | 0,63 kr. | 0,64 kr. | Samme bekendtgørelser som ovenfor |
| Almindeligt befordringsfradrag | 2,23 / 1,12 kr. | 3,17 / 1,59 kr. | [Skattestyrelsen](https://skat.dk/borger/fradrag/koerselsfradrag/koerselsfradrag-befordringsfradrag), [2026-lovændring](https://www.retsinformation.dk/eli/lta/2026/616) |
| Forhøjet befordringssats i yderområder | 2,47 kr. | 3,51 kr. | [Skatteministeriets historik](https://svmn.dk/tal-og-metode/satser/skattehistorik/befordringsfradraget-en-historisk-oversigt) |
| Lavindkomsttillæg til befordring | 64 %, maks. 15.400 kr.; udfases 325.800–375.800 kr. | 64 %, maks. 30.800 kr.; udfases 341.500–391.500 kr. | [Skattestyrelsen](https://skat.dk/borger/fradrag/koerselsfradrag/koerselsfradrag-befordringsfradrag) |

Kommuneskat og kirkeskat er kontrolleret for samtlige 98 kommuner i både 2025 og 2026 mod Skatteministeriets officielle årsregneark: [Kommuneskatteprocenter siden 1977](https://svmn.dk/tal-og-metode/satser/statistik-i-kommunerne/kommuneskatteprocenter-siden-1977).

## Fejl rettet i beregningsmotoren

- Beskæftigelsesfradrag, jobfradrag og de ekstra beskæftigelsesfradrag beregnes nu af AM-grundlaget før AM-bidrag. Tidligere brugte appen nettoindkomsten efter AM-bidrag og gav derfor for små fradrag.
- Det skrå skatteloft beregnes én gang mod det første progressive skattelag. Tidligere kunne samme overskridelse blive trukket fra igen ved topskat og top-topskat i 2026.
- Valget om enlig forsørger påvirker nu beregningen og er præciseret til modtagere af ekstra børnetilskud.
- Seniorfradraget for 2026 kan vælges og gemmes på indkomståret.
- 20.000 km-grænsen for erhvervskørsel gælder nu særskilt pr. hvervgiver. Cykelkørsel bruger ikke af bilens kilometergrænse.
- Yderkommuner genkendes automatisk. De ti småøer kan markeres særskilt, fordi kommunen alene ikke kan identificere dem.
- Det automatiske lavindkomsttillæg til befordringsfradraget indgår i skatteoverslaget uden at blive lagt i rubrik 51.
- Dagpenge gemmes særskilt fra pension og SU, så indkomstgrundlaget for lavindkomsttillægget kan beregnes korrekt.
- Honoraret placeres som praktisk standard efter jobbets slutår, som normalt svarer til retserhvervelsen for et afsluttet job. Betalingsdatoen flytter ikke i sig selv indkomsten. Aftalens faktiske retserhvervelsestidspunkt har altid forrang. Se [Skattestyrelsens juridiske vejledning](https://info.skat.dk/data.aspx?oid=1976709).
- AI'en må kun markere AM-fritagelse, når bilaget klart dokumenterer en relevant rettighedsbetaling eller et legat uden konkret modydelse. Ved tvivl skal feltet stå ubesvaret.
- AI'en kan nu genkende bestyrelses-, udvalgs- og kommissionshverv. Valget gemmes i databasen og styrer, om kørslen skal behandles som almindelig befordring.

## Afgrænsning

Beregningen er et årsoverslag for honorar- og B-indkomst oven på de indkomsttal, brugeren oplyser. Den beregner ikke kapitalindkomst, aktieindkomst, ægtefælleoverførsler, pensionsindbetalinger, ejendomsskatter, udenlandsk skat, begrænset skattepligt eller særlige personfradragsregler. Bro-, færge- og flyfradrag ved almindelig befordring kræver dokumenterede beløb og behandles ikke automatisk af kilometerfeltet. Sådanne forhold skal afstemmes mod forskuds- eller årsopgørelsen.

Satser for et nyt indkomstår må ikke kopieres frem. `getSatser()` stopper beregningen, indtil det nye år er tilføjet og kontrolleret mod primære kilder.
