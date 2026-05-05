/**
 * Public site stores <br/> markup in text fields. Convert to newlines for native display.
 * Also collapses multiple consecutive <br/> into a max of 2 newlines (one blank line).
 */
export function brToNewlines(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\n{3,}/g, '\n\n');
}
