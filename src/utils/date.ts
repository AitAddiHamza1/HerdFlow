/**
 * Standardizes formatting of any date type into the DD/MM/YYYY format.
 * Supports Firestore Timestamp, JavaScript Date, and Date strings (ISO, etc.).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatDate(value: any): string {
  if (!value) return '';

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (value && typeof value === 'object' && 'seconds' in value) {
    // Firestore Timestamp or equivalent object structure
    date = new Date(value.seconds * 1000);
  } else if (value && typeof value.toDate === 'function') {
    // Firestore Timestamp with toDate helper method
    date = value.toDate();
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  } else {
    return 'Invalid Date';
  }

  // Verify that the parsed date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
