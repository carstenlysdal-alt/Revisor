import crypto from 'crypto';

/**
 * Kodeordshåndtering med scrypt fra Node selv.
 *
 * scrypt er bevidst langsom og hukommelsestung, så et stjålet hash ikke kan
 * køres igennem en ordbog i praksis. Ingen ekstra afhængighed er nødvendig.
 */

const SALT_BYTES = 16;
const NOEGLE_BYTES = 64;

export function hashKodeord(kodeord: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto.scryptSync(kodeord, salt, NOEGLE_BYTES).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/**
 * Sammenligningen sker med timingSafeEqual, så svartiden ikke røber, hvor
 * mange tegn der var rigtige.
 */
export function tjekKodeord(kodeord: string, gemt: string): boolean {
  const dele = gemt.split('$');
  if (dele.length !== 3 || dele[0] !== 'scrypt') return false;

  const [, salt, forventet] = dele;
  let beregnet: Buffer;
  try {
    beregnet = crypto.scryptSync(kodeord, salt, NOEGLE_BYTES);
  } catch {
    return false;
  }

  const forventetBuffer = Buffer.from(forventet, 'hex');
  if (forventetBuffer.length !== beregnet.length) return false;

  return crypto.timingSafeEqual(beregnet, forventetBuffer);
}
