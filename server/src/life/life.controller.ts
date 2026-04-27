import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuruDto, InputDto, TimeBlockDto } from './dto';
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

  @Post('tasks/:id/split')
  splitTask(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.life.splitTask(req.user.id, id);
  }

  @Get('tasks/:id/subtasks')
  getSubtasks(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.life.getSubtasks(req.user.id, id);
  }

  @Patch('subtasks/:id/toggle')
  toggleSubtask(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.life.toggleSubtask(req.user.id, id);
  }

  @Get('focus/task')
  focusTask(@Req() req: RequestWithUser) {
    return this.life.focusTask(req.user.id);
  }

  @Get('focus/quick')
  quickTask(@Req() req: RequestWithUser) {
    return this.life.quickTask(req.user.id);
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

  // ── Time Blocks ──────────────────────────────────────────────────────────

  @Get('timeblocks')
  timeBlocks(@Req() req: RequestWithUser, @Query('date') date?: string) {
    return this.life.getTimeBlocks(req.user.id, date);
  }

  @Post('timeblocks')
  createTimeBlock(@Req() req: RequestWithUser, @Body() dto: TimeBlockDto) {
    return this.life.createTimeBlock(req.user.id, dto);
  }

  @Patch('timeblocks/:id')
  updateTimeBlock(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: Partial<TimeBlockDto>,
  ) {
    return this.life.updateTimeBlock(req.user.id, id, dto);
  }

  @Delete('timeblocks/:id')
  deleteTimeBlock(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.life.deleteTimeBlock(req.user.id, id);
  }

  @Patch('timeblocks/:id/done')
  doneTimeBlock(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.life.doneTimeBlock(req.user.id, id);
  }

  @Post('magic-plan')
  magicPlan(
    @Req() req: RequestWithUser,
    @Body() dto: { prompt: string; date: string },
  ) {
    return this.life.magicPlan(req.user.id, dto.prompt, dto.date);
  }

  @Get('routines')
  getRoutines(@Req() req: RequestWithUser) {
    return this.life.getRoutines(req.user.id);
  }

  @Post('routines/apply')
  applyRoutine(
    @Req() req: RequestWithUser,
    @Body() dto: { name: string; date: string },
  ) {
    return this.life.applyRoutine(req.user.id, dto.name, dto.date);
  }

  @Post('routines')
  saveRoutine(
    @Req() req: RequestWithUser,
    @Body() dto: { name: string; blocks: any[] },
  ) {
    return this.life.saveRoutine(req.user.id, dto.name, dto.blocks);
  }
}



