/**
 * Læser en server-sent-event-strøm fra et POST-kald.
 *
 * EventSource kan kun lave GET, og chatten skal sende hele samtalen og
 * beregningen med, så strømmen læses manuelt fra fetch-svarets krop.
 */
export async function laesEventStroem(
  sti: string,
  krop: unknown,
  paaEvent: (type: string, data: unknown) => void,
  signal?: AbortSignal
): Promise<void> {
  const svar = await fetch(sti, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(krop),
    signal,
  });

  if (!svar.ok || !svar.body) {
    const fejl = await svar.json().catch(() => ({}));
    throw new Error(fejl.fejl || `Serveren svarede med fejl ${svar.status}.`);
  }

  const læser = svar.body.getReader();
  const dekoder = new TextDecoder();
  let rest = '';

  for (;;) {
    const { done, value } = await læser.read();
    if (done) break;

    rest += dekoder.decode(value, { stream: true });
    const blokke = rest.split('\n\n');
    rest = blokke.pop() ?? '';

    for (const blok of blokke) {
      let type = 'message';
      const datalinjer: string[] = [];

      for (const linje of blok.split('\n')) {
        if (linje.startsWith('event:')) type = linje.slice(6).trim();
        else if (linje.startsWith('data:')) datalinjer.push(linje.slice(5).trim());
      }

      if (datalinjer.length === 0) continue;
      try {
        paaEvent(type, JSON.parse(datalinjer.join('\n')));
      } catch {
        // En ufuldstændig blok springes over frem for at vælte hele strømmen.
      }
    }
  }
}
