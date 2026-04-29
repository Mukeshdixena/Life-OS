import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

import { AuthController } from './auth.controller';
import { PlanController } from './plan.controller';
import { BlocksController } from './blocks.controller';
import { CheckinsController } from './checkins.controller';
import { DashboardController } from './dashboard.controller';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'secret',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    PlanController,
    BlocksController,
    CheckinsController,
    DashboardController,
    SettingsController
  ],
  providers: [AppService, PrismaService],
})
export class AppModule {}
