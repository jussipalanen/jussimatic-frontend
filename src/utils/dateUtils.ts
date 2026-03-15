/**
 * Normalise any date string to YYYY-MM-DD for use with <input type="date">.
 * Strips the time component from ISO datetime strings (e.g. 2023-06-01T00:00:00Z → 2023-06-01).
 */
export function toISODate(value: string | null | undefined): string {
    if (!value) return '';
    // Already YYYY-MM-DD or starts with it (ISO datetime)
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    // Fallback: parse via Date object
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
    }
    return '';
}

/** Convert an ISO / YYYY-MM-DD string (possibly with time) → D.M.YYYY display string */
export function toDisplayDate(value: string | null | undefined): string {
    if (!value) return '';
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${parseInt(match[3])}.${parseInt(match[2])}.${match[1]}`;
    const d = new Date(value);
    if (!isNaN(d.getTime())) return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
    return value;
}

/** Convert D.M.YYYY or DD.MM.YYYY display string → YYYY-MM-DD for the API */
export function displayDateToISO(value: string | undefined | null): string {
    if (!value) return '';
    const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return '';
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}
