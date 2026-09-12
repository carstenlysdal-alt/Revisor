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

export function useDiktering(tekst: string, onTekst: (tekst: string) => void) {
  const genkendelse = useRef<TaleGenkendelse | null>(null);
  const tekstRef = useRef(tekst);
  const [lytter, setLytter] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const understøttet = typeof window !== 'undefined' && Boolean(konstruktor());

  useEffect(() => { tekstRef.current = tekst; }, [tekst]);
  useEffect(() => () => genkendelse.current?.stop(), []);

  const stop = () => {
    genkendelse.current?.stop();
    genkendelse.current = null;
    setLytter(false);
  };

  const start = () => {
    const Tale = konstruktor();
    if (!Tale || lytter) return;
    setFejl(null);
    const instans = new Tale();
    instans.lang = 'da-DK';
    instans.continuous = true;
    instans.interimResults = false;
    instans.onresult = (event) => {
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
      setFejl(event.error === 'not-allowed'
        ? 'Mikrofonadgang blev afvist. Tillad mikrofonen i browseren og prøv igen.'
        : 'Dikteringen blev afbrudt. Prøv igen.');
      stop();
    };
    instans.onend = () => {
      genkendelse.current = null;
      setLytter(false);
    };
    genkendelse.current = instans;
    setLytter(true);
    instans.start();
  };

  return { understøttet, lytter, fejl, start, stop };
}
