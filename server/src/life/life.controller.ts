import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuruDto, InputDto } from './dto';
import { LifeService } from './life.service';

type RequestWithUser = { user: { id: string; email: string } };

@UseGuards(JwtAuthGuard)
@Controller('life')
export class LifeController {
  constructor(private readonly life: LifeService) {}

  @Get('context')
  context(@Req() req: RequestWithUser) {
    return this.life.context(req.user.id);
  }

  @Post('input')
  input(@Req() req: RequestWithUser, @Body() dto: InputDto) {
    return this.life.ingest(req.user.id, dto);
  }

  @Get('today')
  today(@Req() req: RequestWithUser) {
    return this.life.today(req.user.id);
  }

  @Patch('tasks/:id/toggle')
  toggle(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.life.toggleTask(req.user.id, id);
  }

  @Get('projects')
  projects(@Req() req: RequestWithUser) {
    return this.life.projects(req.user.id);
  }

  @Get('habits')
  habits(@Req() req: RequestWithUser) {
    return this.life.habits(req.user.id);
  }

  @Patch('habits/:id/toggle')
  toggleHabit(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.life.toggleHabit(req.user.id, id);
  }

  @Get('progress')
  progress(@Req() req: RequestWithUser) {
    return this.life.progress(req.user.id);
  }

  @Get('calendar')
  calendar(@Req() req: RequestWithUser, @Query('month') month?: string) {
    return this.life.calendar(req.user.id, month);
  }

  @Get('diary')
  diary(@Req() req: RequestWithUser) {
    return this.life.diary(req.user.id);
  }

  @Get('reports')
  reports(@Req() req: RequestWithUser, @Query('days') days?: string) {
    return this.life.reports(req.user.id, days ? Number(days) : 7);
  }

  @Get('guru')
  guruMessages(@Req() req: RequestWithUser) {
    return this.life.guruMessages(req.user.id);
  }

  @Post('guru')
  guru(@Req() req: RequestWithUser, @Body() dto: GuruDto) {
    return this.life.guru(req.user.id, dto);
  }
}
