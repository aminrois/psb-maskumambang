import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionVersion: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => req?.cookies?.lomba_session || req?.cookies?.jwt || null,
        (req: any) => req?.query?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'dev_jwt_secret_fallback_key',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan atau telah dihapus.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun Anda dinonaktifkan oleh administrator.');
    }

    // Strict instant session invalidation check
    if (user.sessionVersion !== payload.sessionVersion) {
      throw new UnauthorizedException('Sesi Anda telah berakhir karena perubahan kredensial. Silakan login kembali.');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
