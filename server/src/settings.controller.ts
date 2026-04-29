import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './user.decorator';

@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSettings(@CurrentUser() user: any) {
    const res = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!res) throw new NotFoundException('User not found');
    return { settings: res.settings };
  }

  @Put()
  async updateSettings(@Body('settings') settings: any, @CurrentUser() user: any) {
    if (!settings || typeof settings !== 'object') throw new BadRequestException('settings object is required');
    const res = await this.prisma.user.update({
      where: { id: user.id }, data: { settings }
    });
    return { settings: res.settings };
  }

  @Get('habits')
  async getHabits(@CurrentUser() user: any) {
    return await this.prisma.habit.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  @Post('habits')
  async createHabit(@Body() body: any, @CurrentUser() user: any) {
    if (!body.name) throw new BadRequestException('name is required');
    return await this.prisma.habit.create({
      data: {
        userId: user.id, name: body.name,
        category: body.category || 'personal', color: body.color || '#6B7280'
      }
    });
  }

  @Put('habits/:id')
  async updateHabit(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    const existing = await this.prisma.habit.findFirst({ where: { id: Number(id), userId: user.id } });
    if (!existing) throw new NotFoundException('Habit not found');
    return await this.prisma.habit.update({
      where: { id: Number(id) },
      data: {
        name: body.name ?? undefined, category: body.category ?? undefined,
        color: body.color ?? undefined, isActive: body.is_active ?? undefined
      }
    });
  }

  @Delete('habits/:id')
  async deleteHabit(@Param('id') id: string, @CurrentUser() user: any) {
    const existing = await this.prisma.habit.findFirst({ where: { id: Number(id), userId: user.id } });
    if (!existing) throw new NotFoundException('Habit not found');
    await this.prisma.habit.update({
      where: { id: Number(id) }, data: { isActive: false }
    });
    return { deleted: true, id: Number(id) };
  }

  @Get('habit-logs')
  async getHabitLogs(@Query('date') date: string, @CurrentUser() user: any) {
    if (!date) throw new BadRequestException('date is required');
    return await this.prisma.habitLog.findMany({
      where: { userId: user.id, date: new Date(date) },
      include: { habit: true },
      orderBy: { habitId: 'asc' }
    });
  }

  @Post('habit-logs')
  async upsertHabitLog(@Body() body: any, @CurrentUser() user: any) {
    const { habit_id, date, completed } = body;
    if (!habit_id || !date) throw new BadRequestException('habit_id and date are required');
    return await this.prisma.habitLog.upsert({
      where: { habitId_date: { habitId: habit_id, date: new Date(date) } },
      update: { completed: completed ?? false },
      create: { habitId: habit_id, userId: user.id, date: new Date(date), completed: completed ?? false }
    });
  }

  @Delete('account')
  async deleteAccount(@CurrentUser() user: any) {
    try {
      await this.prisma.user.delete({ where: { id: user.id } });
      return { success: true, message: 'Account and all data deleted successfully' };
    } catch {
      throw new InternalServerErrorException('Failed to delete account');
    }
  }
}
