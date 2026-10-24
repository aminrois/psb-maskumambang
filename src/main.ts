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
            "'unsafe-eval'",
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
            'https://cdn.jsdelivr.net',
            'https://www.google.com',
            'https://www.gstatic.com',
            'https://www.google.com/recaptcha/',
            'https://www.gstatic.com/recaptcha/',
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
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
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https:',
            'http:',
          ],
          connectSrc: [
            "'self'",
            'https://www.google.com',
            'https://www.gstatic.com',
            'https://www.google-analytics.com',
            'https://analytics.google.com',
            'https://*.googletagmanager.com',
            'https://*.google-analytics.com',
          ],
          frameSrc: [
            "'self'",
            'https://www.google.com',
            'https://recaptcha.google.com',
            'https://www.google.com/recaptcha/',
            'https://www.googletagmanager.com',
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

    // Dynamic XML Sitemap for Google Search Console, Bing & other search engines
    if (pathname === '/sitemap.xml') {
      try {
        const settings = await settingsService.getSettings();
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${port}`;
        const baseUrl = `${protocol}://${host}`;
        const siteUrl = (settings.canonical_url && settings.canonical_url.trim())
          ? settings.canonical_url.trim().replace(/\/+$/, '')
          : baseUrl;

        const today = new Date().toISOString().split('T')[0];

        const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/biaya-pendidikan.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/guide.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${siteUrl}/kontak.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/register.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/login.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(sitemapXml);
      } catch (err) {
        return next();
      }
    }

    // Dynamic Robots.txt
    if (pathname === '/robots.txt') {
      try {
        const settings = await settingsService.getSettings();
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${port}`;
        const baseUrl = `${protocol}://${host}`;
        const siteUrl = (settings.canonical_url && settings.canonical_url.trim())
          ? settings.canonical_url.trim().replace(/\/+$/, '')
          : baseUrl;

        const robotsTxt = `# Robots.txt for PSB Pondok Pesantren Maskumambang
User-agent: *
Allow: /
Allow: /index.html
Allow: /biaya-pendidikan.html
Allow: /guide.html
Allow: /kontak.html
Allow: /register.html
Allow: /login.html
Allow: /static/
Allow: /css/
Allow: /js/

# Disallow administrative, test and private endpoints
Disallow: /dashboard.html
Disallow: /cbt/
Disallow: /interview/
Disallow: /practical-test/
Disallow: /api/
Disallow: /uploads/

# Sitemap location
Sitemap: ${siteUrl}/sitemap.xml
`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(robotsTxt);
      } catch (err) {
        return next();
      }
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

      // Metadata & SEO values
      const metaTitle = settings.meta_title || appName;
      const metaDesc = settings.meta_description || appDesc;
      const metaKeywords = settings.meta_keywords || '';
      const metaAuthor = settings.meta_author || appName;
      const metaRobots = settings.meta_robots || 'index, follow';
      const siteUrl = (settings.canonical_url && settings.canonical_url.trim())
        ? settings.canonical_url.trim().replace(/\/+$/, '')
        : baseUrl;
      const canonicalUrl = settings.canonical_url
        ? (settings.canonical_url.endsWith('/') ? `${settings.canonical_url}${pathname.replace(/^\//, '')}` : settings.canonical_url)
        : pageUrl;

      // Social Media (Open Graph & Twitter)
      const ogTitle = settings.og_title || metaTitle;
      const ogDesc = settings.og_description || metaDesc;
      const rawOgImg = settings.og_image || settings.application_logo || 'logo_e7a8b6a95d.webp';
      const ogImgUrl = rawOgImg.startsWith('http://') || rawOgImg.startsWith('https://')
        ? rawOgImg
        : `${baseUrl}/static/img/${rawOgImg}`;
      const ogType = settings.og_type || 'website';

      const twitterCard = settings.twitter_card || 'summary_large_image';
      const twitterTitle = settings.twitter_title || ogTitle;
      const twitterDesc = settings.twitter_description || ogDesc;
      const rawTwitterImg = settings.twitter_image || rawOgImg;
      const twitterImgUrl = rawTwitterImg.startsWith('http://') || rawTwitterImg.startsWith('https://')
        ? rawTwitterImg
        : `${baseUrl}/static/img/${rawTwitterImg}`;

      // Google Search Console Verification Tag
      let gscMeta = '';
      if (settings.google_site_verification && settings.google_site_verification.trim()) {
        const val = settings.google_site_verification.trim();
        if (val.startsWith('<meta') || val.startsWith('<HTML') || val.startsWith('<html')) {
          gscMeta = val;
        } else {
          gscMeta = `<meta name="google-site-verification" content="${val}">`;
        }
      }

      // Google Analytics 4 (GA4) snippet
      let gaSnippet = '';
      if (settings.google_analytics_id && settings.google_analytics_id.trim()) {
        const gaId = settings.google_analytics_id.trim();
        gaSnippet = `
    <!-- Google Analytics (GA4) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    </script>`;
      }

      // Google Tag Manager (GTM) Head snippet & Body snippet
      let gtmHeadSnippet = '';
      let gtmBodySnippet = '';
      if (settings.google_tag_manager_id && settings.google_tag_manager_id.trim()) {
        const gtmId = settings.google_tag_manager_id.trim();
        gtmHeadSnippet = `
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');</script>
    <!-- End Google Tag Manager -->`;

        gtmBodySnippet = `
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->`;
      }

      const customHead = (settings.custom_head_scripts || '').trim();
      const customBody = (settings.custom_body_scripts || '').trim();

      // Open Graph / Twitter Meta Tags block
      const metaTags = `
    <!-- Dynamic Social Media, SEO & Open Graph Meta Tags (Synced with App Settings) -->
    <title>${metaTitle}</title>
    <meta name="description" content="${metaDesc}">
    ${metaKeywords ? `<meta name="keywords" content="${metaKeywords}">` : ''}
    ${metaAuthor ? `<meta name="author" content="${metaAuthor}">` : ''}
    <meta name="robots" content="${metaRobots}">
    <link rel="canonical" href="${canonicalUrl}">
    <link rel="sitemap" type="application/xml" title="Sitemap" href="${siteUrl}/sitemap.xml">
    <link rel="icon" type="image/webp" id="app-favicon" href="${rawFavicon.startsWith('http') ? rawFavicon : `/static/img/${rawFavicon}`}">
    ${gscMeta}
    <meta property="og:type" content="${ogType}">
    <meta property="og:site_name" content="${appName}">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDesc}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:image" content="${ogImgUrl}">
    <meta property="og:image:secure_url" content="${ogImgUrl}">
    <meta property="og:image:alt" content="${ogTitle}">
    <meta name="twitter:card" content="${twitterCard}">
    <meta name="twitter:title" content="${twitterTitle}">
    <meta name="twitter:description" content="${twitterDesc}">
    <meta name="twitter:image" content="${twitterImgUrl}">
    ${gaSnippet}
    ${gtmHeadSnippet}
    ${customHead ? `\n    <!-- Custom Head Scripts -->\n    ${customHead}` : ''}
      `.trim();

      // Clean old meta tags to prevent duplication
      html = html.replace(/<title>[\s\S]*?<\/title>/gi, '');
      html = html.replace(/<meta\s+name=["']description["'][\s\S]*?>/gi, '');
      html = html.replace(/<link\s+rel=["']icon["'][\s\S]*?>/gi, '');
      html = html.replace(/<link\s+rel=["']canonical["'][\s\S]*?>/gi, '');
      html = html.replace(/<link\s+rel=["']sitemap["'][\s\S]*?>/gi, '');
      html = html.replace(/<meta\s+property=["']og:[\s\S]*?>/gi, '');
      html = html.replace(/<meta\s+name=["']twitter:[\s\S]*?>/gi, '');

      if (html.includes('</head>')) {
        html = html.replace('</head>', `  ${metaTags}\n</head>`);
      }

      if (gtmBodySnippet || customBody) {
        const bodyInjections = `${gtmBodySnippet}${customBody ? `\n    <!-- Custom Body Scripts -->\n    ${customBody}` : ''}`;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `  ${bodyInjections}\n</body>`);
        }
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
      // HTML files and cbt_admin.js should NOT be cached by browser
      if (filePath.endsWith('.html') || filePath.endsWith('cbt_admin.js')) {
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
