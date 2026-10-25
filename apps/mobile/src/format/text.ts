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

/**
 * Human label for a tag value: "late-night_eats" -> "Late Night Eats".
 * Shared by the detail tag chips and the list row's tag fallback line.
 */
export function formatTagLabel(tag: string): string {
  return tag
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Collapse runs of whitespace (including newlines) to single spaces and trim. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Append a period when the text does not already end in sentence punctuation.
 * A closing quote or bracket after the punctuation still counts as punctuated,
 * so `“...tonight.”` and `(see above.)` are left alone.
 */
export function ensureEndPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?…]["'”’)\]]*$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
