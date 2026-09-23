import readline from 'readline';

/**
 * Rydder hele regnskabet: alle indkomstår, jobs, fradrag, investeringer,
 * opsparing, bilag og chat-historik. Bruges til at starte helt forfra, fx
 * efter testdata. Profilen og faste forbindelser bevares.
 *
 * Går gennem appens eget API, ligesom backup.ts, i stedet for direkte i
 * databasen — af samme grund: der skal ikke findes en vej uden om login.
 *
 * Serverens samlede nulstillingskald rydder både regnskab, bilag og
 * chat-historik, men bevarer profil og faste forbindelser.
 */

const URL_BASE = (process.env.REVISOR_URL || 'http://localhost:3000').replace(/\/$/, '');

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
  console.log(`\nDette sletter ALT i regnskabet på ${URL_BASE}:`);
  console.log('alle indkomstår, jobs, fradrag, investeringer, opsparing, bilag og chat-historik.');
  console.log('Din profil og faste forbindelser bevares.');
  console.log('Eksisterende sikkerhedskopier i Google Drev slettes ikke fra Drev.');
  console.log('Det kan ikke fortrydes. Tag en backup først, hvis du er i tvivl:');
  console.log(`  REVISOR_URL="${URL_BASE}" npm run backup\n`);

  const svar = await fetch(`${URL_BASE}/api/auth/status`).catch(() => null);
  if (!svar?.ok) {
    console.error(
      `Der er ikke forbindelse til ${URL_BASE}.\n` +
        'Kører serveren? Sæt REVISOR_URL, hvis appen ligger et andet sted.'
    );
    process.exit(1);
  }

  const status = (await svar.json()) as { kraeverLogin: boolean };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (status.kraeverLogin) {
    const kodeord = process.env.REVISOR_KODEORD || (await spoerg('Kodeord: '));
    const login = await fetch(`${URL_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kodeord }),
    });

    if (!login.ok) {
      const fejl = (await login.json().catch(() => ({}))) as { fejl?: string };
      console.error(`\n${fejl.fejl || 'Login mislykkedes.'}`);
      process.exit(1);
    }

    const cookie = login.headers.get('set-cookie');
    if (!cookie) {
      console.error('\nServeren sendte ingen session tilbage.');
      process.exit(1);
    }
    headers.cookie = cookie.split(';')[0];
  }

  const dataSvar = await fetch(`${URL_BASE}/api/data`, { headers });
  if (!dataSvar.ok) {
    console.error(`\nData kunne ikke hentes (HTTP ${dataSvar.status}).`);
    process.exit(1);
  }

  const data = (await dataSvar.json()) as {
    indkomstAar: { id: string; aar: number }[];
    jobs: unknown[];
    fradrag: unknown[];
    investeringer: unknown[];
    bilag: { id: string; filnavn: string }[];
  };

  console.log(
    `Fundet: ${data.indkomstAar.length} indkomstår ` +
      `(${data.indkomstAar.map((a) => a.aar).join(', ') || 'ingen'}), ` +
      `${data.jobs.length} jobs, ${data.fradrag.length} fradrag, ` +
      `${data.investeringer.length} investeringer, ${data.bilag.length} bilag.\n`
  );

  if (data.indkomstAar.length === 0 && data.bilag.length === 0) {
    console.log('Der er allerede tomt. Intet at slette.');
    return;
  }

  const bekraeft = await spoerg('Skriv SLET ALT for at bekræfte: ');
  if (bekraeft.trim() !== 'SLET ALT') {
    console.log('\nAfbrudt. Intet blev slettet.');
    process.exit(1);
  }

  const nulstil = await fetch(`${URL_BASE}/api/nulstil`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bekraeftelse: 'SLET ALT' }),
  });
  if (!nulstil.ok) {
    const fejl = (await nulstil.json().catch(() => ({}))) as { fejl?: string };
    console.error(`\n${fejl.fejl || `Nulstillingen fejlede (HTTP ${nulstil.status}).`}`);
    process.exit(1);
  }

  console.log('\nFærdig. Regnskabet og Revisor-chathistorikken er tomme. Profilen er bevaret.');
}

void main();
