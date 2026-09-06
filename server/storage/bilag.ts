import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const TILLADTE_MIMETYPER: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

/** 20 MB. Base64 fylder en tredjedel mere, og udbydernes grænse ligger omkring 32 MB. */
export const MAKS_FILSTOERRELSE = 20 * 1024 * 1024;

export class BilagsArkiv {
  constructor(private readonly dataDir: string) {}

  private mappe(): string {
    return path.join(this.dataDir, 'bilag');
  }

  private sti(sha256: string, mimeType: string): string {
    const endelse = TILLADTE_MIMETYPER[mimeType] ?? 'bin';
    return path.join(this.mappe(), `${sha256}.${endelse}`);
  }

  static hash(indhold: Buffer): string {
    return crypto.createHash('sha256').update(indhold).digest('hex');
  }

  async gem(indhold: Buffer, mimeType: string): Promise<{ sha256: string; sti: string }> {
    const sha256 = BilagsArkiv.hash(indhold);
    const sti = this.sti(sha256, mimeType);
    await fs.mkdir(this.mappe(), { recursive: true });
    // Samme indhold giver samme filnavn, så en gentagen upload skriver blot
    // den identiske fil igen i stedet for at fylde arkivet op.
    await fs.writeFile(sti, indhold);
    return { sha256, sti };
  }

  async hent(sha256: string, mimeType: string): Promise<Buffer> {
    return fs.readFile(this.sti(sha256, mimeType));
  }

  async slet(sha256: string, mimeType: string): Promise<void> {
    await fs.rm(this.sti(sha256, mimeType), { force: true });
  }
}
