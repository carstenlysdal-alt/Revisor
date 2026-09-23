import { ZipArchive } from 'archiver';
import { Router } from 'express';
import type { Repository } from '../db/repository';
import type { BilagsLager } from '../storage/lager';
import { beregnHash } from '../storage/bilag';

/** Filnavne fra bilag er brugerdata og må aldrig kunne oprette undermapper i ZIP-filen. */
export function sikkertBackupFilnavn(navn: string): string {
  return (
    navn
      .split(/[/\\]/)
      .pop()
      ?.replace(/[\u0000-\u001f\u007f:*?"<>|]/g, '_')
      .trim()
      .slice(0, 120) || 'bilag'
  );
}

function backupStempel(nu: Date): string {
  return nu.toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

export function backupRoutes(
  repo: Repository,
  arkiv: BilagsLager,
  nu: () => Date = () => new Date()
): Router {
  const r = Router();

  r.get('/backup', async (_req, res, next) => {
    try {
      const [data, chatHistorik] = await Promise.all([
        repo.hentAlt(),
        repo.hentChatHistorik(100_000),
      ]);

      // Kontrollér alle originalfiler før downloadens headers sendes. Så får
      // brugeren en rigtig fejl i stedet for en ZIP-fil, der ser komplet ud,
      // men mangler et bilag. Filerne læses igen under selve streamingen for
      // ikke at holde hele arkivet i serverens hukommelse på én gang.
      for (const bilag of data.bilag) {
        try {
          const indhold = await arkiv.hent(bilag.sha256, bilag.mimeType);
          if (beregnHash(indhold) !== bilag.sha256) {
            throw new Error('Filens kontrolsum stemmer ikke.');
          }
        } catch {
          res.status(409).json({
            fejl: `Sikkerhedskopien blev ikke hentet, fordi originalfilen “${bilag.filnavn}” mangler eller er beskadiget.`,
          });
          return;
        }
      }

      const oprettet = nu();
      const filnavn = `revis-komplet-backup-${backupStempel(oprettet)}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filnavn}"`);
      res.setHeader('Cache-Control', 'private, no-store');

      const zip = new ZipArchive({ zlib: { level: 9 } });
      zip.on('warning', (fejl) => console.warn('Advarsel under backup:', fejl));
      zip.on('error', (fejl) => res.destroy(fejl));
      zip.pipe(res);

      const manifestBilag: Array<{
        id: string;
        filnavn: string;
        sti: string;
        sha256: string;
        mimeType: string;
        stoerrelse: number;
      }> = [];

      zip.append(JSON.stringify(data, null, 2), { name: 'data.json' });
      zip.append(JSON.stringify(chatHistorik, null, 2), { name: 'chat-historik.json' });

      for (const bilag of data.bilag) {
        const sti = `bilag/${bilag.sha256.slice(0, 12)}-${sikkertBackupFilnavn(bilag.filnavn)}`;
        const indhold = await arkiv.hent(bilag.sha256, bilag.mimeType);
        zip.append(indhold, { name: sti });
        manifestBilag.push({
          id: bilag.id,
          filnavn: bilag.filnavn,
          sti,
          sha256: bilag.sha256,
          mimeType: bilag.mimeType,
          stoerrelse: bilag.stoerrelse,
        });
      }

      zip.append(
        JSON.stringify(
          {
            produkt: 'revis',
            formatVersion: 1,
            oprettet: oprettet.toISOString(),
            komplet: true,
            antal: {
              indkomstaar: data.indkomstAar.length,
              jobs: data.jobs.length,
              fradrag: data.fradrag.length,
              investeringer: data.investeringer.length,
              bilag: manifestBilag.length,
              chatbeskeder: chatHistorik.length,
            },
            bilag: manifestBilag,
          },
          null,
          2
        ),
        { name: 'manifest.json' }
      );

      zip.append(
        [
          'Komplet lokal sikkerhedskopi fra Revis',
          '',
          `Oprettet: ${oprettet.toLocaleString('da-DK')}`,
          '',
          'data.json indeholder profil, indkomstår, jobs, fradrag, investeringer,',
          'opsparing og bilagsoversigten.',
          'bilag/ indeholder alle originale uploadede bilag.',
          'chat-historik.json indeholder den gemte samtalehistorik.',
          'manifest.json beskriver indholdet og kobler bilags-id til filsti.',
          '',
          'Backuppen kan indeholde personoplysninger. Opbevar den et sikkert sted,',
          'for eksempel i en privat mappe, der synkroniseres af Google Drev,',
          'iCloud eller en anden lokal backup.',
        ].join('\n'),
        { name: 'LAES-MIG.txt' }
      );

      await zip.finalize();
    } catch (err) {
      next(err);
    }
  });

  return r;
}
