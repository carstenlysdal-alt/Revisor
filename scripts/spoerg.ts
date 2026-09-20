import readline from 'readline';

/**
 * Spørgsmål i terminalen.
 *
 * Et kodeord må ikke ekkoes. Gør det det, bliver det stående i terminalens
 * scrollback resten af dagen, og enhver, der kigger med over skulderen eller
 * ruller op bagefter, kan læse det. Derfor skrives der en stjerne pr. tegn i
 * stedet for tegnet selv.
 */
export function spoerg(spoergsmaal: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(spoergsmaal, (svar) => {
      rl.close();
      resolve(svar);
    });
  });
}

/** Som spoerg, men indtastningen vises ikke. Til kodeord. */
export function spoergSkjult(spoergsmaal: string): Promise<string> {
  const ud = process.stdout;
  const ind = process.stdin;

  // Uden en tty er der ingen skjult indtastning at give — det gælder fx, når
  // scriptet kører i en pipeline. Så falder vi tilbage til det åbne spørgsmål
  // frem for at hænge og vente på et tastetryk, der aldrig kommer.
  if (!ind.isTTY) return spoerg(spoergsmaal);

  return new Promise((resolve, reject) => {
    ud.write(spoergsmaal);
    const varRaw = ind.isRaw ?? false;
    ind.setRawMode(true);
    ind.resume();
    ind.setEncoding('utf8');

    let svar = '';

    const ryd = () => {
      ind.setRawMode(varRaw);
      ind.pause();
      ind.removeListener('data', paaTast);
    };

    const paaTast = (tegn: string) => {
      for (const t of tegn) {
        switch (t) {
          case '\n':
          case '\r':
          case '': // Ctrl-D
            ud.write('\n');
            ryd();
            resolve(svar);
            return;
          case '': // Ctrl-C afbryder, som man forventer
            ud.write('\n');
            ryd();
            reject(new Error('Afbrudt.'));
            return;
          case '': // Backspace
          case '\b':
            if (svar.length > 0) {
              svar = svar.slice(0, -1);
              ud.write('\b \b');
            }
            break;
          default:
            // Styretegn skal ikke ende i kodeordet.
            if (t >= ' ') {
              svar += t;
              ud.write('*');
            }
        }
      }
    };

    ind.on('data', paaTast);
  });
}
