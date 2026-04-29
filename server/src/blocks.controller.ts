import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
