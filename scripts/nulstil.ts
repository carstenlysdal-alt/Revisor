import { spoerg, spoergSkjult } from './spoerg';

/**
 * Rydder hele regnskabet: alle indkomstår, jobs, fradrag, investeringer,
 * opsparing og bilag. Bruges til at starte helt forfra, fx efter testdata.
 *
 * Går gennem appens eget API, ligesom backup.ts, i stedet for direkte i
 * databasen — af samme grund: der skal ikke findes en vej uden om login.
 *
 * Sletning af hvert indkomstår cascader jobs, fradrag, investeringer og
 * opsparing i databasen. Bilag hænger ikke på et indkomstår og skal derfor
 * slettes for sig, ét ad gangen, gennem det samme sletBilag-kald som resten
 * af appen bruger.
 */

const URL_BASE = (process.env.REVISOR_URL || 'http://localhost:3000').replace(/\/$/, '');

async function main() {
  console.log(`\nDette sletter ALT i regnskabet på ${URL_BASE}:`);
  console.log('alle indkomstår, jobs, fradrag, investeringer, opsparing og bilag.');
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
    const kodeord = process.env.REVISOR_KODEORD || (await spoergSkjult('Kodeord: '));
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
    headers.cookie = cookie.split(';')[0] ?? cookie;
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

  let fejlet = 0;

  for (const bilag of data.bilag) {
    const res = await fetch(`${URL_BASE}/api/bilag/${bilag.id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      console.warn(`  Kunne ikke slette bilag ${bilag.filnavn} (HTTP ${res.status}).`);
      fejlet += 1;
    }
  }
  if (data.bilag.length > 0) console.log(`Bilag slettet: ${data.bilag.length - fejlet} af ${data.bilag.length}.`);

  for (const aar of data.indkomstAar) {
    const res = await fetch(`${URL_BASE}/api/indkomstaar/${aar.id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      console.warn(`  Kunne ikke slette indkomståret ${aar.aar} (HTTP ${res.status}).`);
      fejlet += 1;
    }
  }
  if (data.indkomstAar.length > 0) {
    console.log(`Indkomstår slettet: ${data.indkomstAar.length} (jobs, fradrag, investeringer og opsparing følger med).`);
  }

  console.log(fejlet > 0 ? `\nFærdig, men ${fejlet} kald fejlede — se advarslerne ovenfor.` : '\nFærdig. Regnskabet er tomt.');
  if (fejlet > 0) process.exitCode = 1;
}

void main();
