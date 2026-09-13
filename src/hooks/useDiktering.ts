import { useEffect, useRef, useState } from 'react';

interface TaleResultat {
  isFinal: boolean;
  0: { transcript: string };
}

interface TaleGenkendelse {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<TaleResultat> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type TaleGenkendelseKonstruktor = new () => TaleGenkendelse;

function konstruktor(): TaleGenkendelseKonstruktor | undefined {
  const browser = window as typeof window & {
    SpeechRecognition?: TaleGenkendelseKonstruktor;
    webkitSpeechRecognition?: TaleGenkendelseKonstruktor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

/**
 * Fejl, der ikke er brugerens — genkendelsen forsøges bare igen i stedet for
 * at vise noget. Safari på iPhone er kendt for at afslutte genkendelsen af
 * sig selv efter en kort pause, selv med continuous: true, og kan svare
 * "aborted" eller "no-speech", uden at brugeren har gjort noget forkert.
 */
const GENSTARTES_STILLE = new Set(['no-speech', 'aborted', 'network']);

/** Giver op efter så mange stille genstarter i træk uden et eneste ord opfanget. */
const MAKS_GENSTARTER = 6;
const GENSTART_VENTETID_MS = 250;

export function useDiktering(tekst: string, onTekst: (tekst: string) => void) {
  const genkendelse = useRef<TaleGenkendelse | null>(null);
  const tekstRef = useRef(tekst);
  const brugerStoppede = useRef(true);
  const genstarter = useRef(0);
  const genstartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lytter, setLytter] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const understøttet = typeof window !== 'undefined' && Boolean(konstruktor());

  useEffect(() => {
    tekstRef.current = tekst;
  }, [tekst]);

  useEffect(
    () => () => {
      brugerStoppede.current = true;
      if (genstartTimer.current) clearTimeout(genstartTimer.current);
      genkendelse.current?.stop();
    },
    []
  );

  const stop = () => {
    brugerStoppede.current = true;
    if (genstartTimer.current) clearTimeout(genstartTimer.current);
    genkendelse.current?.stop();
    genkendelse.current = null;
    setLytter(false);
  };

  const opretOgStart = () => {
    const Tale = konstruktor();
    if (!Tale) return;
    const instans = new Tale();
    instans.lang = 'da-DK';
    instans.continuous = true;
    instans.interimResults = false;

    instans.onresult = (event) => {
      genstarter.current = 0;
      const dele: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const resultat = event.results[i];
        if (resultat?.isFinal && resultat[0]?.transcript) dele.push(resultat[0].transcript.trim());
      }
      if (!dele.length) return;
      const nyTekst = [tekstRef.current.trim(), ...dele].filter(Boolean).join(' ');
      tekstRef.current = nyTekst;
      onTekst(nyTekst);
    };

    instans.onerror = (event) => {
      if (GENSTARTES_STILLE.has(event.error)) return; // onend følger og prøver igen
      brugerStoppede.current = true;
      setFejl(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Mikrofonadgang blev afvist. Tillad mikrofonen i browseren og prøv igen.'
          : event.error === 'audio-capture'
            ? 'Der blev ikke fundet nogen mikrofon.'
            : 'Dikteringen blev afbrudt. Prøv igen.'
      );
    };

    instans.onend = () => {
      genkendelse.current = null;
      if (brugerStoppede.current) {
        setLytter(false);
        return;
      }

      genstarter.current += 1;
      if (genstarter.current > MAKS_GENSTARTER) {
        brugerStoppede.current = true;
        setLytter(false);
        setFejl('Dikteringen blev afbrudt. Prøv igen.');
        return;
      }

      // En lille ventetid, før mikrofonen tages i brug igen — starter man en
      // ny genkendelse for hurtigt efter den forrige sluttede, kan Safari
      // fejle med det samme.
      genstartTimer.current = setTimeout(opretOgStart, GENSTART_VENTETID_MS);
    };

    genkendelse.current = instans;
    try {
      instans.start();
    } catch {
      instans.onend?.();
    }
  };

  const start = () => {
    if (!konstruktor() || lytter) return;
    setFejl(null);
    brugerStoppede.current = false;
    genstarter.current = 0;
    setLytter(true);
    opretOgStart();
  };

  return { understøttet, lytter, fejl, start, stop };
}
