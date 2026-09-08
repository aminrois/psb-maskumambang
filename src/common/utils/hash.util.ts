import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class HashUtil {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hashes a plaintext password using Bcrypt with 12 salt rounds.
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verifies password against Bcrypt hash OR legacy Werkzeug PBKDF2-SHA256 hash.
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!hash || !password) return false;

    // Check if hash is Werkzeug PBKDF2 format (pbkdf2:sha256:iterations$salt$hash)
    if (hash.startsWith('pbkdf2:')) {
      return this.verifyWerkzeugPbkdf2(password, hash);
    }

    // Default: bcrypt verification
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  /**
   * Verifies legacy Werkzeug pbkdf2:sha256 format for seamless migration.
   */
  private static verifyWerkzeugPbkdf2(password: string, hash: string): boolean {
    try {
      const parts = hash.split('$');
      if (parts.length !== 3) return false;

      const header = parts[0]; // e.g. "pbkdf2:sha256:1000000"
      const salt = parts[1];
      const targetHash = parts[2];

      const headerParts = header.split(':');
      if (headerParts.length < 3) return false;

      const iterations = parseInt(headerParts[2], 10);
      const digest = headerParts[1] || 'sha256';

      const derivedKey = crypto.pbkdf2Sync(
        password,
        salt,
        iterations,
        Buffer.from(targetHash, 'hex').length,
        digest,
      );

      return crypto.timingSafeEqual(derivedKey, Buffer.from(targetHash, 'hex'));
    } catch {
      return false;
    }
  }
}
