import type { Job } from '../types';
import { kr } from '../lib/format';

/**
 * En heldagsbegivenhed i iCalendar slutter dagen EFTER den sidste dag.
 * DTEND lig DTSTART giver en begivenhed uden længde, som flere kalendere
 * enten skjuler eller viser forkert.
 */
const dagEfter = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

const udenBindestreger = (iso: string) => iso.replace(/-/g, '');

const beskrivelse = (job: Job, opsparingsProcent?: number): string =>
  [
    `Honorar: ${kr(job.honorar)} kr.`,
    job.betalingsDato ? `Forventet betaling: ${job.betalingsDato}` : null,
    opsparingsProcent
      ? `Sæt ca. ${kr((job.honorar * opsparingsProcent) / 100)} kr. til side til skat og AM-bidrag.`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

export function createGoogleCalendarUrl(job: Job, opsparingsProcent?: number): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Honorarjob: ${job.hvervgiver}`,
    details: beskrivelse(job, opsparingsProcent),
    location: job.destinationAdresse || '',
    dates: `${udenBindestreger(job.startDato)}/${udenBindestreger(
      dagEfter(job.slutDato || job.startDato)
    )}`,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const escape = (tekst: string) =>
  tekst.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function byggIcs(job: Job, opsparingsProcent?: number): string {
  const nu = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const linjer = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Revisor AI//B-indkomst//DA',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${job.id}@revisor-ai`,
    `DTSTAMP:${nu}Z`,
    `DTSTART;VALUE=DATE:${udenBindestreger(job.startDato)}`,
    `DTEND;VALUE=DATE:${udenBindestreger(dagEfter(job.slutDato || job.startDato))}`,
    `SUMMARY:${escape(`Honorarjob: ${job.hvervgiver}`)}`,
    `DESCRIPTION:${escape(beskrivelse(job, opsparingsProcent))}`,
    job.destinationAdresse ? `LOCATION:${escape(job.destinationAdresse)}` : null,
    'STATUS:CONFIRMED',
    // Påmindelse dagen før jobbet.
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(`I morgen: ${job.hvervgiver}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return linjer.join('\r\n');
}

export function hentIcsFil(job: Job, opsparingsProcent?: number): void {
  const blob = new Blob([byggIcs(job, opsparingsProcent)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${job.hvervgiver.toLowerCase().replace(/[^a-z0-9æøå]+/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
