import { useEffect, useRef, useState } from 'react';

interface SpeechAlternativeLike { transcript: string }
interface SpeechResultLike { 0: SpeechAlternativeLike; length: number }
interface SpeechResultListLike { [index: number]: SpeechResultLike; length: number }
interface SpeechEventLike extends Event { results: SpeechResultListLike }
interface SpeechErrorLike extends Event { error?: string }

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: SpeechErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

export function useDictation(value: string, onChange: (value: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef('');
  const [isListening, setIsListening] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const isSupported = typeof window !== 'undefined' && Boolean(getSpeechRecognition());

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const stopDictation = () => {
    if (isListening) recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startDictation = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition || isListening) return;
    const recognition = new Recognition();
    baseTextRef.current = value.trim();
    recognition.lang = 'da-DK';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const spokenText = Array.from({ length: event.results.length }, (_, index) => event.results[index]?.[0]?.transcript ?? '')
        .join(' ')
        .trim();
      onChange([baseTextRef.current, spokenText].filter(Boolean).join(' '));
    };
    recognition.onerror = (event) => {
      setDictationError(event.error === 'not-allowed'
        ? 'Mikrofonadgang blev afvist i browseren.'
        : 'Dikteringen blev afbrudt. Prøv igen.');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setDictationError(null);
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setDictationError('Dikteringen kunne ikke startes. Prøv igen.');
    }
  };

  return { isSupported, isListening, dictationError, startDictation, stopDictation };
}
