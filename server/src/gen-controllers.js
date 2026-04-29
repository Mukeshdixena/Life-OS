const fs = require('fs');
const path = require('path');

const blocksController = `import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './user.decorator';

@Controller('blocks')
@UseGuards(AuthGuard)
export class BlocksController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getBlocks(@Query('date') date: string, @CurrentUser() user: any) {
    try {
      if (date) {
        return await this.prisma.timeBlock.findMany({
          where: { userId: user.id, plan: { date: new Date(date) } },
          orderBy: { startTime: 'asc' }
        });
      }
      return await this.prisma.timeBlock.findMany({
        where: { userId: user.id },
        orderBy: { startTime: 'asc' }
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch blocks');
    }
  }

  @Post()
  async createBlock(@Body() body: any, @CurrentUser() user: any) {
    const { plan_id, title, category, start_time, end_time, color, energy_level, is_non_negotiable, position } = body;
    if (!plan_id || !title || !start_time || !end_time) {
      throw new BadRequestException('plan_id, title, start_time, and end_time are required');
    }
    try {
      return await this.prisma.timeBlock.create({
        data: {
          planId: plan_id, userId: user.id, title,
          category: category || 'personal',
          startTime: new Date(start_time), endTime: new Date(end_time),
          plannedStart: new Date(start_time), plannedEnd: new Date(end_time),
          color: color || '#6B7280', energyLevel: energy_level || 'medium',
          isNonNegotiable: is_non_negotiable ?? false, position: position ?? 0, status: 'pending'
        }
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to create block');
    }
  }

  @Put(':id')
  async updateBlock(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    try {
      const existing = await this.prisma.timeBlock.findFirst({ where: { id: Number(id), userId: user.id } });
      if (!existing) throw new NotFoundException('Block not found');
      
      const { title, category, start_time, end_time, color, energy_level, is_non_negotiable, status, position } = body;
      return await this.prisma.timeBlock.update({
        where: { id: Number(id) },
        data: {
          title: title ?? undefined, category: category ?? undefined,
          startTime: start_time ? new Date(start_time) : undefined,
          endTime: end_time ? new Date(end_time) : undefined,
          color: color ?? undefined, energyLevel: energy_level ?? undefined,
          isNonNegotiable: is_non_negotiable ?? undefined, status: status ?? undefined, position: position ?? undefined
        }
      });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to update block');
    }
  }

  @Delete(':id')
  async deleteBlock(@Param('id') id: string, @CurrentUser() user: any) {
    try {
      const existing = await this.prisma.timeBlock.findFirst({ where: { id: Number(id), userId: user.id } });
      if (!existing) throw new NotFoundException('Block not found');
      await this.prisma.timeBlock.delete({ where: { id: Number(id) } });
      return { deleted: true, id: Number(id) };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to delete block');
    }
  }
}
`;

const checkinsController = `import { Controller, Post, Body, UseGuards, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './user.decorator';

@Controller('checkins')
@UseGuards(AuthGuard)
export class CheckinsController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async createCheckin(@Body() body: any, @CurrentUser() user: any) {
    const { block_id, outcome, actual_end, extra_minutes, notes, alternate_activity, time_roi } = body;
    if (!block_id || !outcome) throw new BadRequestException('block_id and outcome are required');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const checkin = await tx.checkin.create({
          data: {
            blockId: block_id, userId: user.id, outcome,
            actualEnd: actual_end ? new Date(actual_end) : null,
            extraMinutes: extra_minutes || 0, notes,
            alternateActivity: alternate_activity, timeRoi: time_roi
          }
        });
        await tx.timeBlock.update({
          where: { id: block_id },
          data: { status: outcome === 'did_something_else' ? 'skipped' : outcome }
        });
        return checkin;
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to record check-in');
    }
  }
}
`;

const dashboardController = `import { Controller, Get, Query, UseGuards, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './user.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async getStats(@Query('start_date') startDate: string, @Query('end_date') endDate: string, @CurrentUser() user: any) {
    if (!startDate || !endDate) throw new BadRequestException('start_date and end_date are required');
    try {
      const plans = await this.prisma.dailyPlan.findMany({
        where: { userId: user.id, date: { gte: new Date(startDate), lte: new Date(endDate) } }
      });
      const checkins = await this.prisma.checkin.findMany({
        where: { userId: user.id, createdAt: { gte: new Date(startDate), lte: new Date(endDate) } },
        include: { block: true }
      });
      const reviews = await this.prisma.dailyReview.findMany({
        where: { userId: user.id, createdAt: { gte: new Date(startDate), lte: new Date(endDate) } }
      });
      return { plans, checkins, reviews };
    } catch (err) {
      throw new InternalServerErrorException('Failed to fetch dashboard stats');
    }
  }
}
`;

const settingsController = `import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
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
`;

fs.writeFileSync(path.join(__dirname, 'blocks.controller.ts'), blocksController);
fs.writeFileSync(path.join(__dirname, 'checkins.controller.ts'), checkinsController);
fs.writeFileSync(path.join(__dirname, 'dashboard.controller.ts'), dashboardController);
fs.writeFileSync(path.join(__dirname, 'settings.controller.ts'), settingsController);
console.log('Controllers generated');
