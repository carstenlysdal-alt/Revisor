import type { Fradrag, IndkomstAar, Investering, Job } from '../types';

/**
 * Eksempeldata til at prøve appen med.
 *
 * Dette er ikke opstartstilstanden. En ny bruger starter tom, fordi opdigtede
 * posteringer i et skatteregnskab er værre end ingen posteringer: de tæller med
 * i beregningen, de ser ægte ud, og de bliver først opdaget, når tallene skal
 * bruges. Posterne herfra er markeret med erEksempel, så de kan fjernes samlet.
 */
export function byggEksempeldata(aar: number): {
  indkomstAar: IndkomstAar;
  jobs: Job[];
  fradrag: Fradrag[];
  investeringer: Investering[];
} {
  const id = `aar-eksempel-${aar}`;

  return {
    indkomstAar: {
      id,
      aar,
      hjemmeadresse: 'Vesterbrogade 42, 1620 København V',
      kommune: 'København',
      kommuneSkatteprocent: 23.39,
      kirkeskatteprocent: 0.8,
      forventetAIndkomst: 80_000,
      forventetPensionSUDagpenge: 0,
      forventedeFradragAIndkomst: 0,
      medlemFolkekirken: true,
      enligForsoerger: false,
      laast: false,
    },
    jobs: [
      {
        id: `job-eksempel-1-${aar}`,
        indkomstAarId: id,
        hvervgiver: 'Vega Musikhus',
        honorar: 12_500,
        startDato: `${aar}-03-14`,
        slutDato: `${aar}-03-14`,
        betalingsDato: `${aar}-03-31`,
        transportmiddel: 'OWN_CAR_MC',
        antalKm: 28,
        antalTure: 2,
        destinationAdresse: 'Enghavevej 40, 1674 København V',
        amBidragFritaget: false,
        timerJob: 4.5,
        timerTransportForberedelse: 3,
        type: 'Musik og koncert',
        bilagIds: [],
        noter: 'Spillejob med kvartet.',
        erEksempel: true,
      },
      {
        id: `job-eksempel-2-${aar}`,
        indkomstAarId: id,
        hvervgiver: 'Aarhus Universitet',
        honorar: 8_000,
        startDato: `${aar}-04-20`,
        slutDato: `${aar}-04-20`,
        betalingsDato: `${aar}-04-30`,
        transportmiddel: 'OWN_CAR_MC',
        antalKm: 310,
        antalTure: 2,
        destinationAdresse: 'Nordre Ringgade 1, 8000 Aarhus C',
        amBidragFritaget: false,
        timerJob: 3,
        timerTransportForberedelse: 5,
        type: 'Foredrag',
        bilagIds: [],
        noter: 'Gæsteforelæsning om den kreative branche.',
        erEksempel: true,
      },
      {
        id: `job-eksempel-3-${aar}`,
        indkomstAarId: id,
        hvervgiver: 'Statens Kunstfond',
        honorar: 15_000,
        startDato: `${aar}-05-01`,
        slutDato: `${aar}-05-01`,
        betalingsDato: `${aar}-05-15`,
        transportmiddel: 'NONE',
        antalKm: 0,
        antalTure: 0,
        amBidragFritaget: true,
        type: 'Legat',
        bilagIds: [],
        noter: 'Arbejdslegat til komposition. Fritaget for AM-bidrag.',
        erEksempel: true,
      },
    ],
    fradrag: [
      {
        id: `fradrag-eksempel-1-${aar}`,
        indkomstAarId: id,
        beskrivelse: 'Storebæltsbroen, tur og retur til foredrag i Aarhus',
        typeKategori: 'Broafgift',
        fakturaDato: `${aar}-04-20`,
        fakturaBeloeb: 550,
        fradragsProcent: 100,
        fradragIDKK: 550,
        bilagIds: [],
        revisorNotat: 'Dokumenteret broafgift i forbindelse med honorarjob. Fuldt fradrag i rubrik 29.',
        erEksempel: true,
      },
      {
        id: `fradrag-eksempel-2-${aar}`,
        indkomstAarId: id,
        beskrivelse: 'Parkering ved spillested',
        typeKategori: 'Parkering',
        fakturaDato: `${aar}-03-14`,
        fakturaBeloeb: 145,
        fradragsProcent: 100,
        fradragIDKK: 145,
        bilagIds: [],
        revisorNotat: 'Parkering i forbindelse med job er fuldt fradragsberettiget.',
        erEksempel: true,
      },
      {
        id: `fradrag-eksempel-3-${aar}`,
        indkomstAarId: id,
        beskrivelse: 'Studiemonitorer, blandet brug',
        typeKategori: 'Udstyr',
        fakturaDato: `${aar}-02-10`,
        fakturaBeloeb: 2_400,
        fradragsProcent: 50,
        fradragIDKK: 1_200,
        bilagIds: [],
        revisorNotat: 'Halvdelen vurderet erhvervsmæssig, fordi højttalerne også bruges privat.',
        erEksempel: true,
      },
    ],
    investeringer: [
      {
        id: `inv-eksempel-1-${aar}`,
        indkomstAarId: id,
        titel: 'MacBook Pro til studiebrug',
        beloeb: 19_500,
        fakturaDato: `${aar}-01-15`,
        bilagIds: [],
        erEksempel: true,
      },
    ],
  };
}
