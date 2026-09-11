import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { HashUtil } from '../common/utils/hash.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Role } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  async verifyRecaptcha(token?: string, ipAddress?: string): Promise<boolean> {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LfPxLAtAAAAAB4u3g-Y0BY8hFVgs63N3ynNpuqU';

    if (process.env.NODE_ENV === 'test' || process.env.SKIP_RECAPTCHA === 'true') {
      return true;
    }

    if (!token || !token.trim()) {
      throw new BadRequestException('Verifikasi Google reCAPTCHA wajib dicentang.');
    }

    try {
      const params = new URLSearchParams();
      params.append('secret', secretKey);
      params.append('response', token.trim());
      // Only include remoteip if it is a valid public IP (not loopback/private/empty)
      if (ipAddress && !ipAddress.includes('127.0.0.1') && !ipAddress.includes('::1') && !ipAddress.startsWith('10.') && !ipAddress.startsWith('192.168.')) {
        params.append('remoteip', ipAddress);
      }

      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = (await res.json()) as { success: boolean; 'error-codes'?: string[]; hostname?: string };
      
      if (!data.success) {
        const errorCodes = data['error-codes'] || [];
        console.warn('[reCAPTCHA Verification Failed]', {
          errorCodes,
          hostname: data.hostname,
        });

        if (errorCodes.includes('timeout-or-duplicate')) {
          throw new BadRequestException('Verifikasi reCAPTCHA telah kadaluarsa atau sudah terpakai. Silakan centang ulang.');
        }
        if (errorCodes.includes('invalid-input-secret')) {
          console.error('[reCAPTCHA] RECAPTCHA_SECRET_KEY tidak valid atau tidak cocok dengan site key.');
          throw new BadRequestException('Konfigurasi reCAPTCHA server bermasalah (secret key tidak cocok).');
        }
        if (errorCodes.includes('hostname-mismatch')) {
          console.warn('[reCAPTCHA] Domain/hostname mismatch:', data.hostname);
          // Allow in development/IP access if configured
          if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_HOSTNAME_MISMATCH === 'true') {
            return true;
          }
        }

        throw new BadRequestException('Verifikasi reCAPTCHA gagal atau kadaluarsa. Silakan centang ulang.');
      }
      return true;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.error('[reCAPTCHA Error]', err);
      throw new BadRequestException('Gagal memverifikasi reCAPTCHA: ' + (err.message || 'Error'));
    }
  }

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    await this.verifyRecaptcha(dto.captchaToken, ipAddress);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email ini sudah terdaftar dalam sistem.');
    }

    const passwordHash = await HashUtil.hashPassword(dto.password);

    const newUser = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phoneNumber: dto.phoneNumber.trim(),
        passwordHash,
        role: Role.PESERTA,
        isActive: true,
      },
    });

    await this.auditService.log({
      userId: newUser.id,
      action: 'USER_REGISTER',
      targetTable: 'users',
      targetId: newUser.id,
      details: `Pendaftaran akun peserta baru: ${newUser.email}`,
      ipAddress,
      userAgent,
    });

    const payload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
      sessionVersion: newUser.sessionVersion,
    };

    const accessToken = this.jwtService.sign(payload);
    const { passwordHash: _, ...safeUser } = newUser;
    return {
      user: safeUser,
      accessToken,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    await this.verifyRecaptcha(dto.captchaToken, ipAddress);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau kata sandi tidak valid.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun Anda dinonaktifkan. Hubungi panitia.');
    }

    const isMatch = await HashUtil.verifyPassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email atau kata sandi tidak valid.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };

    const accessToken = this.jwtService.sign(payload);

    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetTable: 'users',
      targetId: user.id,
      details: `Login berhasil (${user.role})`,
      ipAddress,
      userAgent,
    });

    const { passwordHash: _, ...safeUser } = user;
    return {
      accessToken,
      user: safeUser,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, baseUrl: string) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && user.isActive) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam validitas

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires,
        },
      });

      const cleanBaseUrl = baseUrl.replace(/\/$/, '');
      const resetUrl = `${cleanBaseUrl}/reset-password.html?token=${resetToken}`;

      await this.mailService.sendPasswordResetEmail(user.email, user.name, resetToken, resetUrl);

      await this.auditService.log({
        userId: user.id,
        action: 'FORGOT_PASSWORD_REQUEST',
        targetTable: 'users',
        targetId: user.id,
        details: `Permintaan reset password via email: ${user.email}`,
      });
    }

    return {
      success: true,
      message: 'Jika email Anda terdaftar dalam sistem, tautan untuk mereset kata sandi telah dikirimkan ke email Anda (dari info@maskumambang.ac.id). Silakan periksa kotak masuk atau spam email Anda.',
    };
  }

  async verifyResetToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Token reset kata sandi tidak valid.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token.trim(),
        resetPasswordExpires: { gt: new Date() },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Tautan reset kata sandi tidak valid atau telah kadaluarsa. Silakan ajukan permohonan baru.');
    }

    return {
      valid: true,
      email: user.email,
      name: user.name,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: dto.token.trim(),
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Tautan reset kata sandi tidak valid atau telah kadaluarsa. Silakan ajukan permohonan baru.');
    }

    const passwordHash = await HashUtil.hashPassword(dto.password);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        sessionVersion: { increment: 1 },
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'RESET_PASSWORD_SUCCESS',
      targetTable: 'users',
      targetId: user.id,
      details: `Kata sandi berhasil direset via email untuk: ${user.email}`,
    });

    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui! Silakan login menggunakan kata sandi baru Anda.',
    };
  }
}
