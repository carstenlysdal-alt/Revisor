import { MessageSquareText } from 'lucide-react';

interface Props {
  text?: string;
}

export function KildeTekst({ text }: Props) {
  if (!text) return null;
  return (
    <details className="mt-1 max-w-sm text-[11px] font-normal text-stone-500">
      <summary className="inline-flex cursor-pointer items-center gap-1 font-semibold text-stone-600 hover:text-stone-900">
        <MessageSquareText className="h-3 w-3" aria-hidden="true" />Vis oprindelig note
      </summary>
      <p className="mt-1 whitespace-pre-wrap rounded bg-stone-100 p-2 leading-relaxed text-stone-700">{text}</p>
    </details>
  );
}
