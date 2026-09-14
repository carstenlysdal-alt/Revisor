import readline from 'readline';
import crypto from 'crypto';
import { hashKodeord } from '../server/auth/kodeord';

/**
 * Laver de to variabler, adgangskontrollen har brug for.
 * Kodeordet vises aldrig igen og gemmes ingen steder, kun hashet.
 */
function spoerg(spoergsmaal: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(spoergsmaal, (svar) => {
      rl.close();
      resolve(svar);
    });
  });
}

async function main() {
  console.log('\nVælg et kodeord til Revisor.\n');
  console.log('Det er den eneste ting, der står mellem dine bilag og internettet,');
  console.log('så tag et langt et. Fire tilfældige ord slår ét kryptisk.\n');

  const kodeord = (await spoerg('Kodeord: ')).trim();

  if (kodeord.length < 12) {
    console.error('\nFor kort. Brug mindst 12 tegn.');
    process.exit(1);
  }

  const gentag = (await spoerg('Gentag kodeord: ')).trim();
  if (kodeord !== gentag) {
    console.error('\nDe to kodeord er ikke ens.');
    process.exit(1);
  }

  console.log('\nSæt disse to i Railway under Variables, og i din lokale .env:\n');
  console.log(`AUTH_PASSWORD_HASH="${hashKodeord(kodeord)}"`);
  console.log(`SESSION_SECRET="${crypto.randomBytes(32).toString('hex')}"`);
  console.log(
    '\nSESSION_SECRET skal være forskellig fra alt andet og må ikke deles.'
  );
  console.log('Skifter du den, bliver alle åbne sessioner logget ud.\n');
}

void main();
