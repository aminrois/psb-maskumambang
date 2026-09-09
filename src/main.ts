import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SettingsService } from './settings/settings.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;

  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';

  // Security Headers via Helmet
  // NOTE: HSTS is DISABLED on HTTP (development). Enable only on HTTPS production.
  // Enabling HSTS on HTTP causes Safari to cache the directive and force HTTPS
  // for all subsequent requests, breaking navigation on non-SSL servers.
  app.use(
    helmet({
      // Disable HSTS completely on HTTP - Safari caches this and breaks all links
      hsts: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
            'https://cdn.jsdelivr.net',
            'https://www.google.com',
            'https://www.gstatic.com',
            'https://www.google.com/recaptcha/',
            'https://www.gstatic.com/recaptcha/',
          ],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
          ],
          fontSrc: [
            "'self'",
            'https://fonts.gstatic.com',
            'https://cdnjs.cloudflare.com',
          ],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://www.google.com', 'https://www.gstatic.com'],
          connectSrc: ["'self'", 'https://www.google.com', 'https://www.gstatic.com'],
          frameSrc: [
            "'self'",
            'https://www.google.com',
            'https://recaptcha.google.com',
            'https://www.google.com/recaptcha/',
          ],
          mediaSrc: ["'self'", 'blob:'],
          // Do NOT upgrade insecure requests on HTTP servers - breaks Safari navigation
          upgradeInsecureRequests: null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie Parser
  app.use(cookieParser());

  // Gzip Compression (dramatically reduces JS/CSS/HTML transfer size)
  app.use(compression({
    level: 6,           // balanced speed vs compression ratio
    threshold: 1024,    // only compress responses > 1KB
  }));

  // CORS Configuration
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRFToken', 'X-Requested-With'],
  });

  // Serve static frontend assets from public/ directory
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Middleware for HTML requests to dynamically inject Open Graph / Social Media metadata (Logo, App Name, Description)
  const settingsService = app.get(SettingsService);
  app.use(async (req: any, res: any, next: any) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    const pathname: string = req.path || '/';
    if (
      pathname.startsWith('/api') ||
      pathname.startsWith('/health') ||
      pathname.startsWith('/static') ||
      pathname.startsWith('/css') ||
      pathname.startsWith('/js') ||
      pathname.startsWith('/uploads')
    ) {
      return next();
    }

    let filePath: string | null = null;
    if (pathname === '/' || pathname === '') {
      filePath = path.join(publicDir, 'index.html');
    } else if (pathname.endsWith('.html')) {
      filePath = path.join(publicDir, pathname.replace(/^\//, ''));
    } else if (!path.extname(pathname)) {
      const candidate = path.join(publicDir, `${pathname.replace(/^\//, '')}.html`);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return next();
    }

    try {
      const settings = await settingsService.getSettings();
      let html = fs.readFileSync(filePath, 'utf8');

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${port}`;
      const baseUrl = `${protocol}://${host}`;

      const rawLogo = settings.application_logo || 'logo_e7a8b6a95d.webp';
      const logoUrl = rawLogo.startsWith('http://') || rawLogo.startsWith('https://')
        ? rawLogo
        : `${baseUrl}/static/img/${rawLogo}`;

      const rawFavicon = settings.application_favicon || 'favicon_87007b6344.webp';
      const faviconUrl = rawFavicon.startsWith('http://') || rawFavicon.startsWith('https://')
        ? rawFavicon
        : `${baseUrl}/static/img/${rawFavicon}`;

      const appName = settings.application_name || 'PSB Maskumambang';
      const appDesc = settings.application_description || 'Portal Resmi Penerimaan Santri Baru (PSB) Pondok Pesantren Maskumambang';
      const pageUrl = `${baseUrl}${pathname}`;

      // Open Graph / Twitter Meta Tags block
      const metaTags = `
    <!-- Dynamic Social Media & Open Graph Meta Tags (Synced with App Settings) -->
    <title>${appName}</title>
    <meta name="description" content="${appDesc}">
    <link rel="icon" type="image/webp" id="app-favicon" href="${rawFavicon.startsWith('http') ? rawFavicon : `/static/img/${rawFavicon}`}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${appName}">
    <meta property="og:title" content="${appName}">
    <meta property="og:description" content="${appDesc}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:image" content="${logoUrl}">
    <meta property="og:image:secure_url" content="${logoUrl}">
    <meta property="og:image:alt" content="${appName}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${appName}">
    <meta name="twitter:description" content="${appDesc}">
    <meta name="twitter:image" content="${logoUrl}">
      `.trim();

      // Clean old meta tags to prevent duplication
      html = html.replace(/<title>[\s\S]*?<\/title>/gi, '');
      html = html.replace(/<meta\s+name=["']description["'][\s\S]*?>/gi, '');
      html = html.replace(/<link\s+rel=["']icon["'][\s\S]*?>/gi, '');
      html = html.replace(/<meta\s+property=["']og:[\s\S]*?>/gi, '');
      html = html.replace(/<meta\s+name=["']twitter:[\s\S]*?>/gi, '');

      if (html.includes('</head>')) {
        html = html.replace('</head>', `  ${metaTags}\n</head>`);
      }

      // Replace static fallback logos in body
      html = html.replace(/\/static\/img\/logo_[a-zA-Z0-9_]+\.webp/g, `/static/img/${rawLogo}`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(html);
    } catch (err) {
      return next();
    }
  });

  // Cache static assets (JS/CSS/images) for 7 days in browser
  app.useStaticAssets(publicDir, {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      // HTML files should NOT be cached (always fresh)
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  });

  // Global Prefix: /api (excluding /health)
  const apiPrefix = configService.get<string>('apiPrefix') || '/api';
  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''), {
    exclude: ['health'],
  });

  // Global Validation Pipe (Strict DTO validation, rejecting extra unknown fields)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter (Production error sanitization)
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
  logger.log(`🚀 NestJS Server running at http://localhost:${port}/${apiPrefix.replace(/^\//, '')}`);
  logger.log(`🩺 Health check endpoint: http://localhost:${port}/health`);
  logger.log(`🌐 Web UI available at: http://localhost:${port}/`);
}

bootstrap();
