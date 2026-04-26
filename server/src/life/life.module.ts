import { Module } from '@nestjs/common';
import { AiRouterService } from './ai-router.service';
import { LifeController } from './life.controller';
import { LifeService } from './life.service';

@Module({
  controllers: [LifeController],
  providers: [LifeService, AiRouterService],
})
export class LifeModule {}

