import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { PaymentsModule } from './payments/payments.module';
import { CardsModule } from './cards/cards.module';
import { CheckInModule } from './checkin/checkin.module';
import { PublicModule } from './public/public.module';
import { SettingsModule } from './settings/settings.module';
import { WilayahModule } from './wilayah/wilayah.module';
import { CbtModule } from './cbt/cbt.module';
import { InterviewModule } from './interview/interview.module';
import { MailModule } from './mail/mail.module';
import { HeroSliderModule } from './hero-slider/hero-slider.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl') || 60000,
          limit: config.get<number>('throttle.limit') || 60,
        },
      ],
    }),
    PrismaModule,
    AuditModule,
    HealthModule,
    MailModule,
    AuthModule,
    UsersModule,
    CompetitionsModule,
    RegistrationsModule,
    PaymentsModule,
    CardsModule,
    CheckInModule,
    PublicModule,
    SettingsModule,
    WilayahModule,
    CbtModule,
    InterviewModule,
    HeroSliderModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
