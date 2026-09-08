import { FileValidatorUtil } from './file-validator.util';
import { BadRequestException } from '@nestjs/common';

describe('FileValidatorUtil', () => {
  it('should accept valid PNG buffer', () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const res = FileValidatorUtil.validateImageBuffer(pngBuffer, 'test.png');
    expect(res.extension).toBe('png');
    expect(res.mimeType).toBe('image/png');
    expect(res.storageFilename).toContain('proof_');
  });

  it('should accept valid JPEG buffer', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const res = FileValidatorUtil.validateImageBuffer(jpegBuffer, 'test.jpg');
    expect(res.extension).toBe('jpg');
    expect(res.mimeType).toBe('image/jpeg');
  });

  it('should reject non-image or spoofed file buffer (e.g. text or executable)', () => {
    const fakeBuffer = Buffer.from('<?php echo "evil"; ?>');
    expect(() => FileValidatorUtil.validateImageBuffer(fakeBuffer, 'evil.png')).toThrow(
      BadRequestException,
    );
  });

  it('should sanitize filename against path traversal', () => {
    const dangerous = '../../etc/passwd';
    const clean = FileValidatorUtil.sanitizeFilename(dangerous);
    expect(clean).toBe('passwd');
  });
});
