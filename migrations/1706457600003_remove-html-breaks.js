/**
 * Convert stored HTML <br/> tags back to newlines in specials and notes fields.
 * Part of XSS remediation — we now store plain text and use CSS white-space: pre-wrap.
 */

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE places
    SET specials = REPLACE(specials, '<br/>', E'\\n'),
        notes = REPLACE(notes, '<br/>', E'\\n')
    WHERE specials LIKE '%<br/>%' OR notes LIKE '%<br/>%'
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE places
    SET specials = REPLACE(specials, E'\\n', '<br/>'),
        notes = REPLACE(notes, E'\\n', '<br/>')
    WHERE specials LIKE E'%\\n%' OR notes LIKE E'%\\n%'
  `);
};
