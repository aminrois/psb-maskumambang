import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

export class QrEngineUtil {
  /**
   * Generates secure QR token with HMAC-SHA256 signature.
   * Format: REGQR_<uuid8>_<reg_number_hex>_<hmac_sha256_hash>
   */
  static generateToken(regId: string, regNumber: string, salt: string): string {
    const uuidShort = regId.replace(/-/g, '').slice(0, 8);
    const regHex = Buffer.from(regNumber).toString('hex');
    const hmac = crypto
      .createHmac('sha256', salt)
      .update(`${regId}:${regNumber}`)
      .digest('hex');

    return `REGQR_${uuidShort}_${regHex}_${hmac}`;
  }

  /**
   * Verifies anti-tamper signature of a QR token.
   */
  static verifyToken(token: string, regId: string, regNumber: string, salt: string): boolean {
    if (!token || !token.startsWith('REGQR_')) {
      return false;
    }

    const parts = token.split('_');
    if (parts.length !== 4) {
      return false;
    }

    const providedHmac = parts[3];
    const expectedHmac = crypto
      .createHmac('sha256', salt)
      .update(`${regId}:${regNumber}`)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedHmac, 'hex'),
        Buffer.from(expectedHmac, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Generates Base64 Data URI PNG string for rendering official QR Code on card.
   */
  static async generateQrDataUri(token: string): Promise<string> {
    return QRCode.toDataURL(token, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 250,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }
}
