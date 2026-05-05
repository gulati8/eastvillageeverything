/**
 * Formats a digits-only phone number string for display.
 * Matches public-site convention.
 *
 * Inputs:
 *   '5551234567' -> '(555) 123-4567'
 *   '15551234567' -> '+1 (555) 123-4567'
 *   '' or null -> ''
 *   '12345' (incomplete) -> '12345' (return raw if not 10 or 11 digits)
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}
