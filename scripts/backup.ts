import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

/**
 * Henter alt ned på maskinen: regnskabet som JSON og hvert eneste bilag som
 * den fil, det blev lagt op som.
 *
 * Backuppen går gennem appens eget API og kræver derfor kodeordet. Det er med
 * vilje: databasen behøver ikke være åben mod internettet, for at du kan tage
 * en kopi, og der findes ikke en vej til bilagene, som ikke går gennem login.
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

/** Filnavne fra et bilag er brugerdata og må ikke kunne pege uden for mappen. */
const sikkertFilnavn = (navn: string) =>
  path.basename(navn).replace(/[/\\:*?"<>|]/g, '_').slice(0, 120) || 'bilag';

async function main() {
  console.log(`\nTager backup fra ${URL_BASE}\n`);

  const svar = await fetch(`${URL_BASE}/api/auth/status`).catch(() => null);
  if (!svar?.ok) {
    console.error(
      `Der er ikke forbindelse til ${URL_BASE}.\n` +
        'Kører serveren? Sæt REVISOR_URL, hvis appen ligger et andet sted.'
    );
    process.exit(1);
  }

  const status = (await svar.json()) as { kraeverLogin: boolean };
  const headers: Record<string, string> = {};

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
    indkomstAar: { aar: number }[];
    jobs: unknown[];
    fradrag: unknown[];
    investeringer: unknown[];
    bilag: { id: string; filnavn: string; sha256: string }[];
  };

  const stempel = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const mappe = path.resolve(process.env.BACKUP_DIR || 'backup', `revisor-${stempel}`);
  await fs.mkdir(path.join(mappe, 'bilag'), { recursive: true });

  await fs.writeFile(
    path.join(mappe, 'data.json'),
    JSON.stringify(data, null, 2),
    'utf8'
  );

  let hentet = 0;
  const fejlede: string[] = [];

  for (const bilag of data.bilag) {
    const filSvar = await fetch(`${URL_BASE}/api/bilag/${bilag.id}/fil`, { headers });
    if (!filSvar.ok) {
      fejlede.push(`${bilag.filnavn} (HTTP ${filSvar.status})`);
      continue;
    }
    const indhold = Buffer.from(await filSvar.arrayBuffer());
    await fs.writeFile(
      path.join(mappe, 'bilag', `${bilag.sha256.slice(0, 8)}-${sikkertFilnavn(bilag.filnavn)}`),
      indhold
    );
    hentet += 1;
    process.stdout.write(`\rBilag: ${hentet} af ${data.bilag.length}`);
  }
  if (data.bilag.length > 0) process.stdout.write('\n');

  await fs.writeFile(
    path.join(mappe, 'LÆS-MIG.txt'),
    [
      `Backup af Revisor, taget ${new Date().toLocaleString('da-DK')} fra ${URL_BASE}.`,
      '',
      'data.json indeholder hele regnskabet: indkomstår, jobs, fradrag,',
      'investeringer, opsparing og oversigten over bilag.',
      '',
      'bilag/ indeholder de uploadede filer. Navnet begynder med de første otte',
      'tegn af filens hash, så to filer med samme navn ikke overskriver hinanden.',
      '',
      'Filerne indeholder personoplysninger, også om andre end dig selv.',
      'Opbevar mappen et sted, kun du har adgang til.',
      '',
      `Indkomstår: ${data.indkomstAar.map((a) => a.aar).join(', ') || 'ingen'}`,
      `Jobs: ${data.jobs.length}`,
      `Fradrag: ${data.fradrag.length}`,
      `Investeringer: ${data.investeringer.length}`,
      `Bilag: ${hentet} af ${data.bilag.length}`,
      fejlede.length ? `\nDisse bilag kunne ikke hentes:\n${fejlede.join('\n')}` : '',
    ].join('\n'),
    'utf8'
  );

  console.log(`\nFærdig. Alt ligger i ${mappe}`);
  console.log(
    `${data.jobs.length} jobs, ${data.fradrag.length} fradrag, ${hentet} bilag.`
  );

  if (fejlede.length) {
    console.warn(`\n${fejlede.length} bilag kunne ikke hentes:`);
    for (const f of fejlede) console.warn(`  ${f}`);
    process.exitCode = 1;
  }
}

void main();
