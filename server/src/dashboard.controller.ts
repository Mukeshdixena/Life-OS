import { Controller, Get, Query, UseGuards, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
