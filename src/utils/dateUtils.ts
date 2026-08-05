/**
 * Centralized Date and Time Utilities for ACS D'Vila
 * All dates and display formats are strictly synchronized with Brasília Time (America/Sao_Paulo / UTC-3).
 * Prevents late-night rollover issues (e.g. 21:00-23:59 BRT rolling over to UTC next day).
 */

export const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Returns today's date string as "YYYY-MM-DD" in Brasília Time.
 */
export function getBrasiliaDateStr(dateInput?: Date | string | number): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }

  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    return getBrasiliaDateStr(new Date());
  }

  try {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: BRASILIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (err) {
    console.warn('[dateUtils] Intl formatToParts failed, fallback to local date', err);
  }

  // Fallback to local device year/month/day
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns current date/time formatted in pt-BR in Brasília Time (e.g. "04/08/2026 21:30")
 */
export function getBrasiliaDateTimeDisplay(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: BRASILIA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  } catch (e) {
    return d.toLocaleString('pt-BR');
  }
}

/**
 * Formats a date string (YYYY-MM-DD) into a human-readable title and subtitle in pt-BR in Brasília time.
 */
export function formatBrasiliaDateDisplay(dateStr: string) {
  if (!dateStr) return { isToday: false, title: '', subtitle: '', formatted: '', weekday: '' };

  const todayStr = getBrasiliaDateStr();
  const isToday = dateStr === todayStr;

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0); // Noon to prevent timezone boundary drift

  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
  const monthShort = dateObj.toLocaleDateString('pt-BR', { month: 'short' });
  const formatted = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dayNum = String(d || 1).padStart(2, '0');

  return {
    isToday,
    weekday: weekdayCap,
    formatted,
    title: isToday ? `Hoje, ${dayNum} de ${monthShort}` : `${dayNum} de ${monthShort}`,
    fullTitle: isToday ? `Hoje, ${dayNum} de ${monthName}` : `${weekdayCap}, ${dayNum} de ${monthName} de ${y}`,
    subtitle: `${weekdayCap} • ${formatted}`
  };
}

/**
 * Add days to a YYYY-MM-DD date or Date object in Brasília Time
 */
export function addDaysBrasilia(baseDate: string | Date, days: number): string {
  if (typeof baseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    const [y, m, d] = baseDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    dateObj.setDate(dateObj.getDate() + days);
    return getBrasiliaDateStr(dateObj);
  }
  const dateObj = typeof baseDate === 'string' ? new Date(baseDate) : new Date(baseDate);
  dateObj.setDate(dateObj.getDate() + days);
  return getBrasiliaDateStr(dateObj);
}

/**
 * Add months to a YYYY-MM-DD date or Date object in Brasília Time
 */
export function addMonthsBrasilia(baseDate: string | Date, months: number): string {
  if (typeof baseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    const [y, m, d] = baseDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    dateObj.setMonth(dateObj.getMonth() + months);
    return getBrasiliaDateStr(dateObj);
  }
  const dateObj = typeof baseDate === 'string' ? new Date(baseDate) : new Date(baseDate);
  dateObj.setMonth(dateObj.getMonth() + months);
  return getBrasiliaDateStr(dateObj);
}
