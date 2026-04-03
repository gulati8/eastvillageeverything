/**
 * Seed initial admin user.
 *
 * Set ADMIN_PASSWORD_HASH env var to a bcrypt hash before running.
 * Generate one with: npx bcrypt-cli hash "yourpassword" 10
 */

exports.up = async (pgm) => {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    throw new Error(
      'ADMIN_PASSWORD_HASH environment variable is required. ' +
      'Generate one with: npx bcrypt-cli hash "yourpassword" 10'
    );
  }

  pgm.sql(`
    INSERT INTO users (email, password_hash, name)
    VALUES ('admin@eastvillageeverything.com', '${hash.replace(/'/g, "''")}', 'Admin')
    ON CONFLICT (email) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM users WHERE email = 'admin@eastvillageeverything.com'
  `);
};
