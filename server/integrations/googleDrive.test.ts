import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { generateAuthUrlMock, getTokenMock, setCredentialsMock, filesListMock, filesCreateMock, filesUpdateMock, driveMock } =
  vi.hoisted(() => ({
    generateAuthUrlMock: vi.fn(),
    getTokenMock: vi.fn(),
    setCredentialsMock: vi.fn(),
    filesListMock: vi.fn(),
    filesCreateMock: vi.fn(),
    filesUpdateMock: vi.fn(),
    driveMock: vi.fn(),
  }));

vi.mock('googleapis', () => {
  class OAuth2 {
    generateAuthUrl = generateAuthUrlMock;
    getToken = getTokenMock;
    setCredentials = setCredentialsMock;
  }
  return {
    google: {
      auth: { OAuth2 },
      drive: driveMock,
    },
  };
});

import {
  GoogleDriveIkkeKonfigureretError,
  GoogleDriveTokenUdloebetError,
  byggAuthUrl,
  harGoogleDriveKonfiguration,
  opdaterDatasnapshot,
  opretEllerFindMappe,
  udvekslKodeForToken,
} from './googleDrive';

const gammel = {
  id: process.env.GOOGLE_CLIENT_ID,
  hemmelighed: process.env.GOOGLE_CLIENT_SECRET,
  url: process.env.GOOGLE_REDIRECT_URI,
};

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-hemmelighed';
  process.env.GOOGLE_REDIRECT_URI = 'https://example.dk/api/google/callback';
  driveMock.mockReturnValue({
    files: { list: filesListMock, create: filesCreateMock, update: filesUpdateMock },
  });
});

afterEach(() => {
  process.env.GOOGLE_CLIENT_ID = gammel.id;
  process.env.GOOGLE_CLIENT_SECRET = gammel.hemmelighed;
  process.env.GOOGLE_REDIRECT_URI = gammel.url;
  vi.clearAllMocks();
});

describe('harGoogleDriveKonfiguration', () => {
  it('afspejler om alle tre miljøvariabler er sat', () => {
    expect(harGoogleDriveKonfiguration()).toBe(true);
    delete process.env.GOOGLE_CLIENT_ID;
    expect(harGoogleDriveKonfiguration()).toBe(false);
  });
});

describe('byggAuthUrl', () => {
  it('kaster GoogleDriveIkkeKonfigureretError uden konfiguration', () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(() => byggAuthUrl()).toThrow(GoogleDriveIkkeKonfigureretError);
  });

  it('beder om offline adgang, samtykke hver gang, og kun drive.file-scopet', () => {
    generateAuthUrlMock.mockReturnValue('https://accounts.google.com/o/oauth2/auth?...');

    const url = byggAuthUrl();

    expect(url).toContain('accounts.google.com');
    expect(generateAuthUrlMock).toHaveBeenCalledWith({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });
  });
});

describe('udvekslKodeForToken', () => {
  it('returnerer refresh-tokenet fra Google', async () => {
    getTokenMock.mockResolvedValue({ tokens: { refresh_token: 'r-123' } });

    const token = await udvekslKodeForToken('en-kode');

    expect(token).toBe('r-123');
    expect(getTokenMock).toHaveBeenCalledWith('en-kode');
  });

  it('kaster en almindelig fejl, hvis Google ikke sender et refresh token', async () => {
    getTokenMock.mockResolvedValue({ tokens: {} });

    await expect(udvekslKodeForToken('en-kode')).rejects.toThrow(/refresh token/i);
  });

  it('klassificerer invalid_grant som en udløbet forbindelse', async () => {
    getTokenMock.mockRejectedValue(new Error('invalid_grant: bad request'));

    await expect(udvekslKodeForToken('en-udløbet-kode')).rejects.toThrow(
      GoogleDriveTokenUdloebetError
    );
  });

  it('lader andre fejl passere uændret', async () => {
    getTokenMock.mockRejectedValue(new Error('netværksfejl'));

    await expect(udvekslKodeForToken('en-kode')).rejects.toThrow('netværksfejl');
  });
});

describe('opretEllerFindMappe', () => {
  it('genbruger en eksisterende mappe frem for at oprette en ny', async () => {
    filesListMock.mockResolvedValue({ data: { files: [{ id: 'mappe-1' }] } });

    const id = await opretEllerFindMappe('r-123');

    expect(id).toBe('mappe-1');
    expect(filesCreateMock).not.toHaveBeenCalled();
  });

  it('opretter mappen, når den ikke findes endnu', async () => {
    filesListMock.mockResolvedValue({ data: { files: [] } });
    filesCreateMock.mockResolvedValue({ data: { id: 'ny-mappe' } });

    const id = await opretEllerFindMappe('r-123');

    expect(id).toBe('ny-mappe');
    expect(filesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          mimeType: 'application/vnd.google-apps.folder',
        }),
      })
    );
  });

  it('klassificerer invalid_grant som en udløbet forbindelse', async () => {
    filesListMock.mockRejectedValue(new Error('invalid_grant'));

    await expect(opretEllerFindMappe('r-123')).rejects.toThrow(GoogleDriveTokenUdloebetError);
  });
});

describe('opdaterDatasnapshot', () => {
  it('genbruger den faste snapshotfil', async () => {
    filesUpdateMock.mockResolvedValue({ data: {} });

    const id = await opdaterDatasnapshot('r-123', 'mappe-1', 'snapshot-1', '{"ok":true}');

    expect(id).toBe('snapshot-1');
    expect(filesUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'snapshot-1' })
    );
  });
});
