import { QrEngineUtil } from './qr-engine.util';

describe('QrEngineUtil', () => {
  const salt = 'super_secret_salt_12345';
  const regId = '310ed499-0fe7-40d2-8e2c-ec0a055a01e8';
  const regNumber = 'REG-IND-2026-0AFE9D';

  it('QR-01 & QR-02: should generate valid signed QR token and verify correctly', () => {
    const token = QrEngineUtil.generateToken(regId, regNumber, salt);
    expect(token).toBeDefined();
    expect(token.startsWith('REGQR_')).toBe(true);

    const isValid = QrEngineUtil.verifyToken(token, regId, regNumber, salt);
    expect(isValid).toBe(true);
  });

  it('QR-03 & QR-SEC-02: should reject tampered QR token', () => {
    const validToken = QrEngineUtil.generateToken(regId, regNumber, salt);
    // Tamper the token HMAC
    const tamperedToken = validToken.slice(0, -4) + 'abcd';

    const isValid = QrEngineUtil.verifyToken(tamperedToken, regId, regNumber, salt);
    expect(isValid).toBe(false);

    // Tamper with wrong salt
    const isValidWrongSalt = QrEngineUtil.verifyToken(validToken, regId, regNumber, 'wrong_salt');
    expect(isValidWrongSalt).toBe(false);
  });

  it('should generate valid Base64 QR Data URI', async () => {
    const token = QrEngineUtil.generateToken(regId, regNumber, salt);
    const dataUri = await QrEngineUtil.generateQrDataUri(token);
    expect(dataUri.startsWith('data:image/png;base64,')).toBe(true);
  });
});
