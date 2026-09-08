export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/lomba_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_fallback_key_32_bytes_long_min',
    expiresIn: process.env.JWT_EXPIRATION || '8h',
  },
  qr: {
    salt: process.env.QR_SECRET_SALT || 'dev_qr_secret_salt_fallback_key_32_bytes',
  },
  reset: {
    code: process.env.DATA_RESET_CODE || 'RESET124',
  },
  upload: {
    folder: process.env.UPLOAD_FOLDER || 'uploads',
    maxSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || '5242880', 10),
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
  },
  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY || '6LfPxLAtAAAAAMaeu-yp0yoozI6IiQkshQaKJgAd',
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '6LfPxLAtAAAAAB4u3g-Y0BY8hFVgs63N3ynNpuqU',
  },
});
