/**
 * Tests for brToNewlines utility
 *
 * Covers T1.8 acceptance criteria:
 *   AC: Text fields containing '<br/>' display with line breaks at those positions
 *
 * T1.14 test hints:
 *   unit test brToNewlines('a<br/>b') === 'a\nb'
 */
import { brToNewlines } from './text';

describe('brToNewlines', () => {
  // Standard <br/>
  it("converts 'foo<br/>bar' to 'foo\\nbar'", () => {
    expect(brToNewlines('foo<br/>bar')).toBe('foo\nbar');
  });

  // <br /> with space (self-closing with space)
  it("converts 'foo<br />bar' (with space) to 'foo\\nbar'", () => {
    expect(brToNewlines('foo<br />bar')).toBe('foo\nbar');
  });

  // Case-insensitive <BR/>
  it("converts 'foo<BR/>bar' (uppercase) to 'foo\\nbar'", () => {
    expect(brToNewlines('foo<BR/>bar')).toBe('foo\nbar');
  });

  // 3 consecutive <br/> collapses to max 2 newlines
  it("collapses 'foo<br/><br/><br/>bar' (3x) to 'foo\\n\\nbar' (max 2 newlines)", () => {
    expect(brToNewlines('foo<br/><br/><br/>bar')).toBe('foo\n\nbar');
  });

  // empty string -> ''
  it("returns '' for empty string", () => {
    expect(brToNewlines('')).toBe('');
  });

  // null -> ''
  it("returns '' for null", () => {
    expect(brToNewlines(null)).toBe('');
  });

  // undefined -> ''
  it("returns '' for undefined", () => {
    expect(brToNewlines(undefined)).toBe('');
  });

  // Plain text unchanged
  it('leaves plain text with no <br/> unchanged', () => {
    expect(brToNewlines('Hello world')).toBe('Hello world');
  });

  // Two consecutive <br/> stays as 2 newlines (not collapsed further)
  it("keeps exactly 2 newlines for 2 consecutive <br/>", () => {
    expect(brToNewlines('a<br/><br/>b')).toBe('a\n\nb');
  });

  // Mixed case <Br/>
  it("converts mixed-case <Br/> to newline", () => {
    expect(brToNewlines('a<Br/>b')).toBe('a\nb');
  });
});
