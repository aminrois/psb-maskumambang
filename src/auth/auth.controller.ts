import { Controller, Post, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto, VerifyResetTokenDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { Request, Response } from 'express';

const COOKIE_NAME = 'lomba_session';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.register(dto, ip, userAgent);

    // Set HttpOnly cookie — session cookie
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
    });

    return {
      success: true,
      message: 'Pendaftaran akun berhasil!',
      data: result,
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, ip, userAgent);

    // Set HttpOnly cookie — session cookie
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
    });

    return {
      success: true,
      message: 'Login berhasil.',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const baseUrl = process.env.APP_URL || origin || 'http://localhost:3005';
    return this.authService.forgotPassword(dto, baseUrl);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-reset-token')
  async verifyResetToken(@Body() dto: VerifyResetTokenDto) {
    const data = await this.authService.verifyResetToken(dto.token);
    return {
      success: true,
      data,
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true, message: 'Logout berhasil.' };
  }
}
