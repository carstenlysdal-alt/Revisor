import { Readable } from 'stream';
import { google } from 'googleapis';

/**
 * Google Drive-forbindelse med mindst mulige privilegier.
 *
 * Scope er kun drive.file — appen kan udelukkende se og skrive filer, den
 * selv har oprettet, aldrig resten af brugerens Drev. access_type: offline
 * og prompt: consent er begge nødvendige for pålideligt at få et refresh
 * token igen ved en genforbindelse, ikke kun første gang.
 */
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const MAPPENAVN = 'revis — bilag og backup';
const SNAPSHOT_FILNAVN = 'revis-data-snapshot.json';

export class GoogleDriveIkkeKonfigureretError extends Error {
  constructor() {
    super(
      'Google Drive er ikke sat op på serveren. Sæt GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ' +
        'og GOOGLE_REDIRECT_URI i .env.'
    );
    this.name = 'GoogleDriveIkkeKonfigureretError';
  }
}

/** Refresh-tokenet er ikke længere gyldigt — tilbagekaldt, udløbet, eller kodeord skiftet. */
export class GoogleDriveTokenUdloebetError extends Error {
  constructor() {
    super('Forbindelsen til Google Drev er udløbet. Forbind igen.');
    this.name = 'GoogleDriveTokenUdloebetError';
  }
}

export function harGoogleDriveKonfiguration(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );
}

function opretOAuthKlient() {
  if (!harGoogleDriveKonfiguration()) throw new GoogleDriveIkkeKonfigureretError();
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/** Fanger Googles invalid_grant og oversætter den til en typet fejl. */
function tilTypetFejl(err: unknown): never {
  if (err instanceof Error && /invalid_grant/i.test(err.message)) {
    throw new GoogleDriveTokenUdloebetError();
  }
  throw err;
}

export function byggAuthUrl(): string {
  const klient = opretOAuthKlient();
  return klient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [SCOPE],
  });
}

export async function udvekslKodeForToken(kode: string): Promise<string> {
  const klient = opretOAuthKlient();
  try {
    const { tokens } = await klient.getToken(kode);
    if (!tokens.refresh_token) {
      throw new Error(
        'Google sendte ikke et refresh token tilbage. Prøv at forbinde igen — ' +
          'det sker typisk, hvis forbindelsen allerede er givet én gang før uden at blive tilbagekaldt.'
      );
    }
    return tokens.refresh_token;
  } catch (err) {
    return tilTypetFejl(err);
  }
}

function klientMedToken(refreshToken: string) {
  const klient = opretOAuthKlient();
  klient.setCredentials({ refresh_token: refreshToken });
  return klient;
}

/** Finder den faste bilagsmappe, eller opretter den, hvis den ikke findes endnu. */
export async function opretEllerFindMappe(refreshToken: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: klientMedToken(refreshToken) });

  try {
    const eksisterende = await drive.files.list({
      q: `name = '${MAPPENAVN}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    });
    const fundetId = eksisterende.data.files?.[0]?.id;
    if (fundetId) return fundetId;

    const ny = await drive.files.create({
      requestBody: { name: MAPPENAVN, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });
    if (!ny.data.id) throw new Error('Google oprettede mappen uden at give den et id tilbage.');
    return ny.data.id;
  } catch (err) {
    return tilTypetFejl(err);
  }
}

/** Lægger en fil i den faste bilagsmappe. Bruges til hvert enkelt bilag. */
export async function uploadTilDrive(
  refreshToken: string,
  mappeId: string,
  filnavn: string,
  indhold: Buffer,
  mimeType: string
): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: klientMedToken(refreshToken) });

  try {
    const svar = await drive.files.create({
      requestBody: { name: filnavn, parents: [mappeId] },
      media: { mimeType, body: Readable.from(indhold) },
      fields: 'id',
    });
    if (!svar.data.id) throw new Error('Google gemte filen uden at give den et id tilbage.');
    return svar.data.id;
  } catch (err) {
    return tilTypetFejl(err);
  }
}

/**
 * Opdaterer det faste datasnapshot og genbruger samme fil-id, så den aktuelle
 * backup er nem at finde, og Drev-mappen ikke fyldes med øjebliksbilleder.
 */
export async function opdaterDatasnapshot(
  refreshToken: string,
  mappeId: string,
  eksisterendeFilId: string | null,
  indhold: string
): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: klientMedToken(refreshToken) });
  const media = { mimeType: 'application/json', body: Readable.from(Buffer.from(indhold, 'utf8')) };

  try {
    if (eksisterendeFilId) {
      await drive.files.update({ fileId: eksisterendeFilId, media });
      return eksisterendeFilId;
    }

    const svar = await drive.files.create({
      requestBody: { name: SNAPSHOT_FILNAVN, parents: [mappeId] },
      media,
      fields: 'id',
    });
    if (!svar.data.id) throw new Error('Google gemte snapshottet uden at give det et id tilbage.');
    return svar.data.id;
  } catch (err) {
    return tilTypetFejl(err);
  }
}
