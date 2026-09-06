import { Job } from '../types';

export function createGoogleCalendarUrl(job: Job): string {
  const title = encodeURIComponent(`Honorarjob: ${job.hvervgiver}`);
  const details = encodeURIComponent(
    `Honorar: ${job.honorar.toLocaleString('da-DK')} DKK\n` +
    `Transport: ${job.transportmiddel}\n` +
    `Forventet betaling: ${job.betalingsDato || 'Ikke angivet'}\n` +
    `Husk: Sæt ca. 38% til side til skat og AM-bidrag.`
  );
  const location = encodeURIComponent(job.destinationAdresse || '');

  // Format dates: YYYYMMDDTHHmmssZ or YYYYMMDD
  const startDateStr = job.startDato.replace(/-/g, '');
  const endDateStr = (job.slutDato || job.startDato).replace(/-/g, '');
  const dates = `${startDateStr}/${endDateStr}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
}

export function downloadIcsFile(job: Job) {
  const startDateFormatted = job.startDato.replace(/-/g, '');
  const endDateFormatted = (job.slutDato || job.startDato).replace(/-/g, '');
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Revisor AI//B-indkomst Kalender//DA',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:job-${job.id}-${Date.now()}@revisor-ai.dk`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${startDateFormatted}`,
    `DTEND;VALUE=DATE:${endDateFormatted}`,
    `SUMMARY:Honorarjob - ${job.hvervgiver}`,
    `DESCRIPTION:Honorar: ${job.honorar} DKK\\nBetalingsdato: ${job.betalingsDato || '-'}\\nHusk at afsætte skat på skattekontoen.`,
    `LOCATION:${job.destinationAdresse || ''}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `job-${job.hvervgiver.toLowerCase().replace(/\s+/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
