/**
 * Date formatting and normalization utilities for standard German format dd/mm/yyyy.
 */

/**
 * Converts any date representation (ISO YYYY-MM-DD, DD.MM.YYYY, or DD/MM/YYYY)
 * into standard German format DD/MM/YYYY.
 */
export function formatDateToGerman(input?: string): string {
  if (!input || !input.trim()) return '';
  const trimmed = input.trim();

  // Matches YYYY-MM-DD (e.g. from legacy HTML5 date inputs)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Matches DD.MM.YYYY (German dot format)
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Matches DD/MM/YYYY (German slash format)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  return trimmed;
}

/**
 * Normalizes user input into standard German format DD/MM/YYYY on blur or change.
 * Handles DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY, or continuous 8-digit strings (DDMMYYYY).
 */
export function normalizeGermanDate(val: string): string {
  if (!val || !val.trim()) return '';
  const trimmed = val.trim();

  // If 8 consecutive digits entered, e.g. "15082016"
  if (/^\d{8}$/.test(trimmed)) {
    const day = trimmed.substring(0, 2);
    const month = trimmed.substring(2, 4);
    const year = trimmed.substring(4, 8);
    return `${day}/${month}/${year}`;
  }

  // If separated by dots, dashes or slashes: D[D].M[M].YYYY
  const match = trimmed.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
  if (match) {
    let [, day, month, year] = match;
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    if (year.length === 2) {
      // 20xx heuristic
      year = `20${year}`;
    }
    return `${day}/${month}/${year}`;
  }

  return formatDateToGerman(trimmed);
}

/**
 * Converts a standard German date DD/MM/YYYY or DD.MM.YYYY into ISO YYYY-MM-DD
 * for syncing with native browser date picker controls.
 */
export function germanDateToIso(germanDate?: string): string {
  if (!germanDate || !germanDate.trim()) return '';
  const trimmed = germanDate.trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
}
