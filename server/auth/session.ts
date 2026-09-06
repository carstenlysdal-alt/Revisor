import crypto from 'crypto';

/**
 * Signeret sessionscookie uden lager.
 *
 * Appen har én bruger, så en session behøver ikke identificere nogen. Den skal
 * bare bevise, at kodeordet er indtastet, og at beviset ikke er for gammelt.
 * Et token er derfor udløbstidspunktet plus en HMAC over det.
 */

const COOKIE_NAVN = 'revisor_session';
export const LEVETID_SEKUNDER = 60 * 60 * 24 * 30;

const signer = (data: string, hemmelighed: string) =>
  crypto.createHmac('sha256', hemmelighed).update(data).digest('hex');

export function lavToken(hemmelighed: string, levetid = LEVETID_SEKUNDER): string {
  const udloeb = String(Date.now() + levetid * 1000);
  return `${udloeb}.${signer(udloeb, hemmelighed)}`;
}

export function tjekToken(token: string | undefined, hemmelighed: string): boolean {
  if (!token) return false;

  const [udloeb, signatur] = token.split('.');
  if (!udloeb || !signatur) return false;

  const forventet = signer(udloeb, hemmelighed);
  const a = Buffer.from(signatur, 'utf8');
  const b = Buffer.from(forventet, 'utf8');
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  return Number(udloeb) > Date.now();
}

/** Cookies parses her frem for at trække en afhængighed ind for fem linjer. */
export function laesCookie(cookieHeader: string | undefined, navn: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const del of cookieHeader.split(';')) {
    const lighedstegn = del.indexOf('=');
    if (lighedstegn < 0) continue;
    if (del.slice(0, lighedstegn).trim() === navn) {
      return decodeURIComponent(del.slice(lighedstegn + 1).trim());
    }
  }
  return undefined;
}

export function sessionCookie(token: string, sikker: boolean): string {
  return [
    `${COOKIE_NAVN}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${LEVETID_SEKUNDER}`,
    sikker ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export function ryddetCookie(sikker: boolean): string {
  return [
    `${COOKIE_NAVN}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    sikker ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export { COOKIE_NAVN };
