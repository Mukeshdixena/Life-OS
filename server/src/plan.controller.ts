import { Controller, Post, Body, Get, Put, Param, UseGuards, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './user.decorator';
import { generateDayPlan } from '../services/ai';

@Controller('plan')
@UseGuards(AuthGuard)
export class PlanController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('generate')
  async generate(@Body() body: any) {
    const { prompt, mood_score, energy_score, mental_state, date } = body;

    if (!prompt) {
      throw new BadRequestException('prompt is required');
    }

    const planDate = date || new Date().toISOString().split('T')[0];
    const userContext = { date: planDate, mood_score, energy_score, mental_state };

    try {
      const blocks = await generateDayPlan(prompt, userContext);
      return { blocks };
    } catch (err: any) {
      console.error('Plan generate error:', err);
      throw new InternalServerErrorException({
        error: 'Generation Error',
        message: err.message || 'Failed to generate day plan',
        detail: err.response?.data?.error?.message || err.message
      });
    }
  }

  @Post('confirm')
  async confirm(@Body() body: any, @CurrentUser() user: any) {
    const { date, prompt_used, mood_score, energy_score, mental_state, blocks } = body;
    const userId = user.id;

    if (!date || !Array.isArray(blocks)) {
      throw new BadRequestException('date and blocks array are required');
    }

    try {
      const plan = await this.prisma.$transaction(async (tx) => {
        const planObj = await tx.dailyPlan.upsert({
          where: { userId_date: { userId, date: new Date(date) } },
          update: {
            promptUsed: prompt_used,
            moodScore: mood_score,
            energyScore: energy_score,
            mentalState: mental_state,
            confirmedAt: new Date(),
          },
          create: {
            userId,
            date: new Date(date),
            promptUsed: prompt_used,
            moodScore: mood_score,
            energyScore: energy_score,
            mentalState: mental_state,
            confirmedAt: new Date(),
          }
        });

        const incomingBlockIds = blocks.filter(b => b.id).map(b => b.id);
        
        if (incomingBlockIds.length > 0) {
          await tx.timeBlock.deleteMany({
            where: { planId: planObj.id, id: { notIn: incomingBlockIds } }
          });
        } else {
          await tx.timeBlock.deleteMany({
            where: { planId: planObj.id }
          });
        }

        const insertedBlocks: any[] = [];
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.id) {
            const updatedBlock = await tx.timeBlock.updateMany({
              where: { id: b.id, planId: planObj.id },
              data: {
                title: b.title,
                category: b.category,
                startTime: new Date(b.start_time),
                endTime: new Date(b.end_time),
                color: b.color,
                energyLevel: b.energy_level,
                isNonNegotiable: b.is_non_negotiable ?? false,
                position: i,
              }
            });
            const block = await tx.timeBlock.findFirst({ where: { id: b.id } });
            insertedBlocks.push(block);
          } else {
            const createdBlock = await tx.timeBlock.create({
              data: {
                planId: planObj.id,
                userId,
                title: b.title,
                category: b.category,
                startTime: new Date(b.start_time),
                endTime: new Date(b.end_time),
                plannedStart: new Date(b.start_time),
                plannedEnd: new Date(b.end_time),
                color: b.color,
                energyLevel: b.energy_level,
                isNonNegotiable: b.is_non_negotiable ?? false,
                position: i,
                status: 'pending'
              }
            });
            insertedBlocks.push(createdBlock);
          }
        }
        return { plan: planObj, blocks: insertedBlocks };
      });

      return plan;
    } catch (err) {
      console.error('Plan confirm error:', err);
      throw new InternalServerErrorException('Failed to confirm plan');
    }
  }

  @Get('today')
  async getToday(@CurrentUser() user: any) {
    const userId = user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const plan = await this.prisma.dailyPlan.findUnique({
        where: { userId_date: { userId, date: new Date(todayStr) } }
      });

      if (!plan) {
        return { plan: null, blocks: [] };
      }

      const blocks = await this.prisma.timeBlock.findMany({
        where: { planId: plan.id },
        orderBy: { startTime: 'asc' }
      });

      return { plan, blocks };
    } catch (err) {
      console.error('Plan today error:', err);
      throw new InternalServerErrorException('Failed to fetch today plan');
    }
  }

  @Put('blocks/:id')
  async updateBlock(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    const userId = user.id;
    const { start_time, end_time, title, category, status } = body;

    try {
      const existing = await this.prisma.timeBlock.findFirst({
        where: { id: Number(id), userId }
      });

      if (!existing) {
        throw new NotFoundException('Block not found or not owned by user');
      }

      const updated = await this.prisma.timeBlock.update({
        where: { id: Number(id) },
        data: {
          startTime: start_time ? new Date(start_time) : undefined,
          endTime: end_time ? new Date(end_time) : undefined,
          title: title ?? undefined,
          category: category ?? undefined,
          status: status ?? undefined,
        }
      });

      return updated;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      console.error('Plan block update error:', err);
      throw new InternalServerErrorException('Failed to update block');
    }
  }
}
