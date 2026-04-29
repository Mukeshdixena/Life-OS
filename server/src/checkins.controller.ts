import { Controller, Post, Body, UseGuards, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
