import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  Mic,
  MicOff
} from 'lucide-react';
import { IndkomstAar, Job, SkatteBeregningResultat } from '../types';
import { useDictation } from '../hooks/useDictation';
import { useModal } from '../hooks/useModal';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  indkomstAar: IndkomstAar;
  jobs: Job[];
  skatteBeregning: SkatteBeregningResultat;
}

function createWelcomeMessage(
  indkomstAar: IndkomstAar,
  jobs: Job[],
  skatteBeregning: SkatteBeregningResultat,
): Message {
  return {
    id: crypto.randomUUID(),
    role: 'model',
    content: `Hej! Jeg kan forklare appens vejledende estimat for ${indkomstAar.aar}: ${jobs.length} poster, ${skatteBeregning.honorarerAlt.toLocaleString('da-DK')} DKK i rubrik 12 og ${skatteBeregning.anvendtFradragRubrik29.toLocaleString('da-DK')} DKK anvendt som rubrik 29-fradrag. Hvad vil du undersøge?`,
  };
}

export const RevisorChatModal: React.FC<Props> = ({
  isOpen,
  onClose,
  indkomstAar,
  jobs,
  skatteBeregning,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    createWelcomeMessage(indkomstAar, jobs, skatteBeregning),
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dictation = useDictation(input, setInput);
  const closeModal = () => {
    dictation.stopDictation();
    onClose();
  };
  useModal(isOpen, closeModal);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    setMessages([createWelcomeMessage(indkomstAar, jobs, skatteBeregning)]);
    setInput('');
    setErrorMessage(null);
  }, [isOpen, indkomstAar.id]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || isLoading) return;
    dictation.stopDictation();

    const newMsgs: Message[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: q }];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/revisor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          contextData: {
            aar: indkomstAar.aar,
            kommune: indkomstAar.kommune,
            honorarerTotal: skatteBeregning.honorarerAlt,
            amBidrag: skatteBeregning.amBidrag,
            rubrik29Total: skatteBeregning.oevrigeFradragRubrik29,
            samletSkatOgAM: skatteBeregning.samletSkatOgAM,
            indtaegtEfterSkat: skatteBeregning.indtaegtEfterSkat,
            effektivSkatteprocent: skatteBeregning.effektivSkatteprocent,
            rubrik29LoftOverskredet: skatteBeregning.rubrik29LoftOverskredet,
          },
        }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || 'AI-chatten kunne ikke svare.');
      }

      const data: unknown = await response.json();
      const reply = data && typeof data === 'object' && 'reply' in data && typeof data.reply === 'string'
        ? data.reply
        : undefined;
      if (!reply) throw new Error('AI-chatten returnerede et ugyldigt svar.');
      setMessages([...newMsgs, { id: crypto.randomUUID(), role: 'model', content: reply }]);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'AI-chatten kunne ikke svare.');
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'Hvor meget skal jeg sætte til side til skat af min næste udbetaling?',
    'Hvorfor havner min bilkørsel i Rubrik 29 og ikke i Rubrik 51?',
    'Hvad er reglen om Rubrik 29-loftet for B-indkomst?',
    'Må jeg trække min computer eller telefon fra?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="revisor-chat-title">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-6 flex flex-col h-[640px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Bot className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 id="revisor-chat-title" className="font-bold text-stone-900 text-sm">
                Revisor AI Rådgiver — {indkomstAar.aar}
              </h3>
              <p className="text-[11px] text-stone-500">
                Forklarer appens estimat — kontrollér altid i TastSelv
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            type="button"
            aria-label="Luk AI-chat"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'model' && (
                <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-amber-300" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-stone-900 text-white rounded-tr-xs'
                    : 'bg-stone-100 text-stone-800 rounded-tl-xs border border-stone-200/60'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 text-xs text-stone-500 items-center">
              <Loader2 className="w-4 h-4 animate-spin text-stone-700" />
              Revisor AI tænker og konsulterer skatteregler...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt chips */}
        <div className="px-6 py-2 border-t border-stone-100 bg-stone-50/50 flex gap-2 overflow-x-auto">
          {sampleQuestions.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => handleSend(sq)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 whitespace-nowrap transition shrink-0"
            >
              {sq}
            </button>
          ))}
        </div>

        {errorMessage && <div role="alert" className="mx-4 mb-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">{errorMessage} Du kan fortsat bruge appens manuelle registrering og beregning.</div>}

        {/* Input bar */}
        <div className="p-4 border-t border-stone-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {dictation.isSupported && (
              <button
                type="button"
                onClick={dictation.isListening ? dictation.stopDictation : dictation.startDictation}
                aria-label={dictation.isListening ? 'Stop diktering' : 'Diktér besked på dansk'}
                aria-pressed={dictation.isListening}
                className={`p-2.5 rounded-xl border transition ${dictation.isListening ? 'border-red-300 bg-red-50 text-red-700' : 'border-stone-300 text-stone-600 hover:bg-stone-100'}`}
              >
                {dictation.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <input
              aria-label="Besked til AI-chat"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Spørg om fradrag, kørsel, satser eller årsopgørelse..."
              className="flex-1 px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-1 focus:ring-stone-800"
            />
            <button
              type="submit"
              aria-label="Send besked"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          {dictation.dictationError && <p role="alert" className="mt-2 text-xs text-red-700">{dictation.dictationError}</p>}
        </div>
      </div>
    </div>
  );
};
