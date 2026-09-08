import { HashUtil } from './hash.util';

describe('HashUtil', () => {
  it('should hash a password with Bcrypt and verify correctly', async () => {
    const password = 'SecretPassword123!';
    const hash = await HashUtil.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$')).toBe(true);

    const isMatch = await HashUtil.verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrong = await HashUtil.verifyPassword('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('should verify legacy Werkzeug PBKDF2-SHA256 hash correctly', async () => {
    // Standard PBKDF2 hash generated from Werkzeug: password="admin123", iterations=1000000, salt="test_salt_123"
    // Using a known test hash
    const password = 'peserta123';
    // Let's create a known Werkzeug format test vector
    const crypto = require('crypto');
    const salt = 'abcdef123456';
    const iterations = 1000;
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
    const werkzeugHash = `pbkdf2:sha256:${iterations}$${salt}$${derivedKey}`;

    const isMatch = await HashUtil.verifyPassword(password, werkzeugHash);
    expect(isMatch).toBe(true);

    const isWrong = await HashUtil.verifyPassword('wrongpass', werkzeugHash);
    expect(isWrong).toBe(false);
  });
});
