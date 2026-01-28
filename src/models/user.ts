import bcrypt from 'bcrypt';
import { query } from '../db.js';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserInput {
  email: string;
  password: string;
  name: string;
}

const BCRYPT_ROUNDS = 10;

export class UserModel {
  /**
   * Find a user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT id, email, password_hash, name, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT id, email, password_hash, name, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all users (without password hashes)
   */
  static async findAll(): Promise<UserPublic[]> {
    const result = await query<UserPublic>(
      'SELECT id, email, name, created_at, updated_at FROM users ORDER BY name ASC'
    );
    return result.rows;
  }

  /**
   * Create a new user
   */
  static async create(data: UserInput): Promise<UserPublic> {
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const result = await query<UserPublic>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at, updated_at`,
      [data.email.toLowerCase(), passwordHash, data.name]
    );

    return result.rows[0];
  }

  /**
   * Update a user's password
   */
  static async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    const result = await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update a user's profile
   */
  static async update(id: string, data: { email?: string; name?: string }): Promise<UserPublic | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email.toLowerCase());
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }

    if (updates.length === 0) {
      const user = await UserModel.findById(id);
      if (!user) return null;
      const { password_hash: _, ...publicUser } = user;
      return publicUser;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query<UserPublic>(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, name, created_at, updated_at`,
      params
    );

    return result.rows[0] || null;
  }

  /**
   * Delete a user
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Verify a user's password
   */
  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  /**
   * Authenticate a user by email and password
   * Returns the user if credentials are valid, null otherwise
   */
  static async authenticate(email: string, password: string): Promise<UserPublic | null> {
    const user = await UserModel.findByEmail(email);
    if (!user) return null;

    const valid = await UserModel.verifyPassword(user, password);
    if (!valid) return null;

    // Return user without password hash
    const { password_hash: _, ...publicUser } = user;
    return publicUser;
  }
}

export default UserModel;
