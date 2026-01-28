/**
 * Seed initial admin user
 *
 * Default credentials (change in production):
 * - Email: admin@eastvillageeverything.com
 * - Password: changeme123
 *
 * The password hash is bcrypt with cost factor 10.
 * Generate new hash: npx bcrypt-cli hash "yourpassword" 10
 */

// bcrypt hash of "changeme123" with cost 10
const DEFAULT_PASSWORD_HASH = '$2b$10$I0EE.RAGj8cV5mXjncCyBORs72WrIUTzHjqnR/ja3pJ5qQRx2NL/a';

exports.up = async (pgm) => {
  // We'll use a pre-computed hash for the seed
  // In production, change this password immediately after first login
  pgm.sql(`
    INSERT INTO users (email, password_hash, name)
    VALUES ('admin@eastvillageeverything.com', '${DEFAULT_PASSWORD_HASH}', 'Admin')
    ON CONFLICT (email) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM users WHERE email = 'admin@eastvillageeverything.com'
  `);
};
