import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { IndkomstAar, Job, Fradrag, SkatteBeregningResultat } from '../types';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  indkomstAar: IndkomstAar;
  jobs: Job[];
  fradragList: Fradrag[];
  skatteBeregning: SkatteBeregningResultat;
}

export const RevisorChatModal: React.FC<Props> = ({
  isOpen,
  onClose,
  indkomstAar,
  jobs,
  fradragList,
  skatteBeregning,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: `Hej! Jeg er din personlige Revisor AI. Jeg kender dine aktuelle tal for indkomstår ${indkomstAar.aar} (${jobs.length} jobs, ${skatteBeregning.honorarerAlt.toLocaleString('da-DK')} DKK i honorar, og ${skatteBeregning.oevrigeFradragRubrik29.toLocaleString('da-DK')} DKK i Rubrik 29-fradrag). Hvad kan jeg hjælpe dig med angående skat, fradrag eller kørselsgodtgørelse?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || isLoading) return;

    const newMsgs: Message[] = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);

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
        throw new Error('Fejl fra revisor-serveren');
      }

      const data = await response.json();
      setMessages([...newMsgs, { role: 'model', content: data.reply }]);
    } catch (err: any) {
      // Local fallback answer in case no key is configured
      const fallbackReply = generateFallbackRevisorReply(q, skatteBeregning);
      setMessages([...newMsgs, { role: 'model', content: fallbackReply }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackRevisorReply = (
    q: string,
    beregning: SkatteBeregningResultat
  ): string => {
    const lower = q.toLowerCase();
    if (lower.includes('hvor meget') && lower.includes('side')) {
      return `For dine samlede honorarer på ${beregning.honorarerAlt.toLocaleString('da-DK')} DKK i år er din beregnede skat og AM-bidrag ${beregning.samletSkatOgAM.toLocaleString('da-DK')} DKK (svarende til en effektiv skat på ca. ${beregning.effektivSkatteprocent}%). Vores klare anbefaling er at sætte ca. 38% af hvert udbetalt B-honorar til side på din skattekonto for at undgå restskat.`;
    }
    if (lower.includes('kørsel') || lower.includes('bil')) {
      return `Når du kører i egen bil eller motorcykel til et honorarjob, anvender du statens takst på 3,79 kr./km (i 2026). Det geniale ved B-indkomst er, at dette fradrag havner i Rubrik 29 (øvrige fradrag i personlig indkomst), hvilket giver fuld skatteværdi (op til ca. 52%) i stedet for det lavere ligningsmæssige befordringsfradrag i Rubrik 51.`;
    }
    if (lower.includes('rubrik 29') || lower.includes('loft') || lower.includes('underskud')) {
      return `Vigtig forretningsregel: Ifølge dansk skatteret må summen af dine fradrag i Rubrik 29 (driftsomkostninger + kørsel i egen bil) ALDRIG overstige din B-indkomst efter AM-bidrag. Du kan altså ikke skabe underskud i din personlige indkomst udelukkende via B-indkomstfradrag. Systemet holder øje med dette loft automatisk for dig.`;
    }
    return `Som din Revisor AI kan jeg bekræfte, at du altid bør gemme kvitteringer og kontrakter i 5 år. I ${indkomstAar.aar} har du i øjeblikket ${beregning.honorarerAlt.toLocaleString('da-DK')} DKK i B-honorarer (Rubrik 12) og ${beregning.oevrigeFradragRubrik29.toLocaleString('da-DK')} DKK i godkendte fradrag (Rubrik 29). Stil mig gerne specifikke spørgsmål om dit næste job eller udstyrskøb!`;
  };

  const sampleQuestions = [
    'Hvor meget skal jeg sætte til side til skat af min næste udbetaling?',
    'Hvorfor havner min bilkørsel i Rubrik 29 og ikke i Rubrik 51?',
    'Hvad er reglen om Rubrik 29-loftet for B-indkomst?',
    'Må jeg trække min computer eller telefon fra?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-6 flex flex-col h-[640px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Bot className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">
                Revisor AI Rådgiver — {indkomstAar.aar}
              </h3>
              <p className="text-[11px] text-stone-500">
                Kender dine reelle tal og dansk skattelovgivning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'model' && (
                <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-amber-300" />
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
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(sq)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 whitespace-nowrap transition shrink-0"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-stone-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Spørg om fradrag, kørsel, satser eller årsopgørelse..."
              className="flex-1 px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs focus:ring-1 focus:ring-stone-800"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
