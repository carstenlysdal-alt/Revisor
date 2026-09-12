import type { Job } from '../types';

function nextDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function compactDate(date: string): string {
  return date.replaceAll('-', '');
}

function escapeIcs(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replace(/\r?\n/g, '\\n');
}

export function createGoogleCalendarUrl(job: Job): string {
  const details =
    `Honorar: ${job.honorar.toLocaleString('da-DK')} DKK\n` +
    `Transport: ${job.transportmiddel}\n` +
    `Forventet betaling: ${job.betalingsDato || 'Ikke angivet'}`;
  const endDate = nextDate(job.slutDato || job.startDato);
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: `Honorarjob: ${job.hvervgiver}`, details,
    location: job.destinationAdresse || '', dates: `${compactDate(job.startDato)}/${compactDate(endDate)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createIcsContent(job: Job, now = new Date()): string {
  const startDateFormatted = compactDate(job.startDato);
  const endDateFormatted = compactDate(nextDate(job.slutDato || job.startDato));
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Revisor AI//B-indkomst Kalender//DA',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:job-${escapeIcs(job.id)}@revisor-ai.local`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]!}Z`,
    `DTSTART;VALUE=DATE:${startDateFormatted}`,
    `DTEND;VALUE=DATE:${endDateFormatted}`,
    `SUMMARY:${escapeIcs(`Honorarjob - ${job.hvervgiver}`)}`,
    `DESCRIPTION:${escapeIcs(`Honorar: ${job.honorar} DKK\nBetalingsdato: ${job.betalingsDato || '-'}`)}`,
    `LOCATION:${escapeIcs(job.destinationAdresse || '')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcsFile(job: Job) {
  const icsContent = createIcsContent(job);

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = job.hvervgiver.toLowerCase().replace(/[^a-z0-9æøå]+/gi, '-').replace(/^-|-$/g, '');
  link.setAttribute('download', `job-${safeName || job.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
