/**
 * Hvor selve bilagsfilerne ligger.
 *
 * Lokalt er det en mappe på disken. På Railway er det databasen: en container
 * får nyt filsystem ved hver udrulning, så en fil på disk ville forsvinde,
 * første gang appen blev opdateret.
 */
export interface BilagsLager {
  gem(indhold: Buffer, mimeType: string): Promise<{ sha256: string }>;
  hent(sha256: string, mimeType: string): Promise<Buffer>;
  slet(sha256: string, mimeType: string): Promise<void>;
}

export class BilagFindesIkkeError extends Error {
  constructor() {
    super('Bilaget er registreret, men selve filen findes ikke længere i arkivet.');
    this.name = 'BilagFindesIkkeError';
  }
}
