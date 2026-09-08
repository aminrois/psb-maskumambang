import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || 'info@maskumambang.ac.id';
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`SMTP Mail Transporter initialized for ${user}@${host}`);
    } else {
      this.logger.warn(
        `SMTP configuration incomplete (host/pass not fully set). Emails will be logged to server console.`,
      );
    }
  }

  async sendPasswordResetEmail(
    toEmail: string,
    recipientName: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<boolean> {
    const fromAddress = process.env.MAIL_FROM || 'Panitia PSB Maskumambang <info@maskumambang.ac.id>';
    const appName = 'PSB Pondok Pesantren Maskumambang';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Kata Sandi Akun PSB</title>
        <style>
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
          .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 32px 24px; line-height: 1.6; }
          .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background: #0f766e; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-size: 15px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3); }
          .btn:hover { background: #115e59; }
          .info-box { background: #f8fafc; border-left: 4px solid #0f766e; padding: 14px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #475569; }
          .link-box { word-break: break-all; background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #334155; margin-top: 10px; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appName}</h1>
            <p>Permintaan Reset Kata Sandi Akun</p>
          </div>
          <div class="content">
            <div class="greeting">Assalamu'alaikum Warahmatullahi Wabarakatuh,</div>
            <p>Yth. <strong>${recipientName || 'Calon Santri / Wali Santri'}</strong>,</p>
            <p>Kami menerima permintaan untuk mereset kata sandi akun pendaftaran PSB Anda dengan email: <strong>${toEmail}</strong>.</p>
            <p>Silakan klik tombol di bawah ini untuk membuat kata sandi baru:</p>
            
            <div class="btn-container">
              <a href="${resetUrl}" class="btn" target="_blank">Reset Kata Sandi Saya</a>
            </div>

            <div class="info-box">
              <strong>Catatan Penting:</strong>
              <ul style="margin: 6px 0 0 0; padding-left: 18px;">
                <li>Tautan ini hanya berlaku selama <strong>60 menit</strong>.</li>
                <li>Jika Anda tidak merasa mengajukan permintaan ini, silakan abaikan email ini. Kata sandi Anda tetap aman.</li>
              </ul>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">Jika tombol di atas tidak berfungsi, salin dan buka tautan berikut di browser Anda:</p>
            <div class="link-box">${resetUrl}</div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px 0;"><strong>Panitia Penerimaan Santri Baru (PSB)</strong></p>
            <p style="margin: 0 0 4px 0;">Pondok Pesantren Maskumambang Dukun Gresik Jawa Timur</p>
            <p style="margin: 0;">Email resmi: <a href="mailto:info@maskumambang.ac.id" style="color: #0f766e;">info@maskumambang.ac.id</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Log to console for dev and debugging
    this.logger.log(`\n======================================================`);
    this.logger.log(`📧 [PASSWORD RESET EMAIL] to: ${toEmail} (${recipientName})`);
    this.logger.log(`🔗 RESET LINK: ${resetUrl}`);
    this.logger.log(`======================================================\n`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: `Reset Kata Sandi Akun PSB Maskumambang`,
          html: htmlContent,
        });
        this.logger.log(`✅ Email reset password berhasil dikirim ke ${toEmail}`);
        return true;
      } catch (err: any) {
        this.logger.error(`❌ Gagal mengirim email via SMTP ke ${toEmail}: ${err.message}`, err.stack);
        return false;
      }
    }

    return true;
  }
}
