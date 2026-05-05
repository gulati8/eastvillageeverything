/**
 * Tests for formatPhone utility
 *
 * Covers T1.8 acceptance criteria:
 *   AC: Phone digits '5551234567' display as '(555) 123-4567'
 *   AC: Phone digits with non-10 length render raw without crashing
 *
 * T1.14 test hints:
 *   unit test formatPhone('5551234567') === '(555) 123-4567'
 *   unit test formatPhone(null) returns null, formatPhone('123') returns '123' (raw)
 */
import { formatPhone } from './phone';

describe('formatPhone', () => {
  // Standard 10-digit number
  it("formats '5551234567' as '(555) 123-4567'", () => {
    expect(formatPhone('5551234567')).toBe('(555) 123-4567');
  });

  // 11-digit with leading 1
  it("formats '15551234567' as '+1 (555) 123-4567'", () => {
    expect(formatPhone('15551234567')).toBe('+1 (555) 123-4567');
  });

  // Empty string -> ''
  it("returns '' for empty string", () => {
    expect(formatPhone('')).toBe('');
  });

  // null -> ''
  it("returns '' for null", () => {
    expect(formatPhone(null)).toBe('');
  });

  // undefined -> ''
  it("returns '' for undefined", () => {
    expect(formatPhone(undefined)).toBe('');
  });

  // Incomplete digits -> return raw
  it("returns raw '12345' for incomplete digit string (5 digits)", () => {
    expect(formatPhone('12345')).toBe('12345');
  });

  // Non-digit chars stripped before formatting
  // 'abc-555-defg-1234' -> digits = '5551234' (7 chars) -> returns raw input
  it("strips non-digits then returns raw if result is not 10 or 11 digits ('abc-555-defg-1234')", () => {
    // Digits extracted: 5551234 (7 digits) -> falls through to raw return
    const result = formatPhone('abc-555-defg-1234');
    // raw value returned since 7 digits doesn't match 10 or 11
    expect(result).toBe('abc-555-defg-1234');
  });

  // String that strips to a valid 10-digit number
  it("formats a string that strips to 10 digits: '(555) 123-4567' -> '(555) 123-4567'", () => {
    // After stripping: 5551234567 (10 digits)
    expect(formatPhone('(555) 123-4567')).toBe('(555) 123-4567');
  });

  // Too many digits (13) -> returns raw
  it("returns raw '5551234567890' for 13-digit string (too many digits)", () => {
    expect(formatPhone('5551234567890')).toBe('5551234567890');
  });
});
