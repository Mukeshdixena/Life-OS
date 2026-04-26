import { Injectable } from '@nestjs/common';
import { LifeArea } from '@prisma/client';
import { endOfMonth, startOfDay, startOfMonth, subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AiRouterService } from './ai-router.service';
import { GuruDto, InputDto } from './dto';

@Injectable()
export class LifeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiRouterService,
  ) {}

  async context(userId: string) {
    const [tasks, habits, recent] = await Promise.all([
      this.prisma.task.findMany({ where: { userId, completedAt: null }, orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }], take: 6 }),
      this.prisma.habit.findMany({ where: { userId }, include: { completions: { orderBy: { date: 'desc' }, take: 7 } }, take: 6 }),
      this.prisma.inputEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    return {
      timeOfDay: this.timeOfDay(),
      tasks,
      habits,
      prompts: this.prompts(tasks, habits),
      recent,
    };
  }

  async ingest(userId: string, dto: InputDto) {
    const meaning = await this.ai.route(dto.text, dto.mood);
    const today = startOfDay(new Date());

    const result = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.inputEntry.create({
        data: { userId, rawText: dto.text, mood: dto.mood, energy: dto.energy, structuredJson: meaning },
      });

      const tasks = await Promise.all(
        meaning.tasks.map((task) =>
          tx.task.create({
            data: {
              userId,
              title: task.title,
              dueDate: task.dueDate ? new Date(task.dueDate) : null,
              importance: task.importance ?? 'MEDIUM',
              source: entry.id,
            },
          }),
        ),
      );

      const habits = [];
      for (const habit of meaning.habits) {
        const saved = await tx.habit.upsert({
          where: { userId_name: { userId, name: habit.name } },
          update: { lifeArea: habit.lifeArea ?? LifeArea.HEALTH },
          create: { userId, name: habit.name, lifeArea: habit.lifeArea ?? LifeArea.HEALTH },
        });
        await tx.habitLog.upsert({
          where: { habitId_date: { habitId: saved.id, date: today } },
          update: { completed: habit.completed, note: habit.note },
          create: { habitId: saved.id, date: today, completed: habit.completed, note: habit.note },
        });
        habits.push(saved);
      }

      const projects = [];
      for (const project of meaning.projects) {
        const saved = await tx.project.upsert({
          where: { userId_name: { userId, name: project.name } },
          update: {
            progress: { increment: project.progressDelta ?? 0 },
            lifeArea: project.lifeArea ?? LifeArea.WORK,
          },
          create: {
            userId,
            name: project.name,
            progress: project.progressDelta ?? 0,
            lifeArea: project.lifeArea ?? LifeArea.WORK,
          },
        });
        if (project.minutes && project.minutes > 0) {
          await tx.workSession.create({
            data: { projectId: saved.id, minutes: project.minutes, note: project.note },
          });
        }
        projects.push(saved);
      }

      await Promise.all(
        meaning.progress.map((progress) =>
          tx.progressLog.create({
            data: { userId, lifeArea: progress.lifeArea, points: progress.points, note: progress.note },
          }),
        ),
      );

      const diary = meaning.diary
        ? await tx.diaryEntry.create({
            data: {
              userId,
              title: meaning.diary.title,
              body: meaning.diary.body,
              mood: meaning.diary.mood ?? dto.mood,
            },
          })
        : null;

      // Fetch current productivity then cap at 100
      const existing = await tx.dailySummary.findUnique({ where: { userId_date: { userId, date: today } } });
      const currentProd = existing?.productivity ?? 0;
      const newProd = Math.min(100, currentProd + Math.round(meaning.productivity / 5));

      await tx.dailySummary.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          productivity: newProd,
          summary: meaning.summary,
          areas: meaning.areas,
        },
        create: {
          userId,
          date: today,
          productivity: Math.min(100, meaning.productivity),
          summary: meaning.summary,
          areas: meaning.areas,
        },
      });

      return { entry, meaning, created: { tasks, habits, projects, diary } };
    });

    return result;
  }

  today(userId: string) {
    const tomorrow = new Date(startOfDay(new Date()).getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.task.findMany({
      where: {
        userId,
        OR: [{ dueDate: null }, { dueDate: { lt: tomorrow } }],
      },
      orderBy: [{ completedAt: 'asc' }, { importance: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async toggleTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirstOrThrow({ where: { id: taskId, userId } });
    return this.prisma.task.update({
      where: { id: task.id },
      data: { completedAt: task.completedAt ? null : new Date() },
    });
  }

  projects(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: { sessions: { orderBy: { createdAt: 'desc' }, take: 8 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  habits(userId: string) {
    return this.prisma.habit.findMany({
      where: { userId },
      include: { completions: { orderBy: { date: 'desc' }, take: 21 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async progress(userId: string) {
    const logs = await this.prisma.progressLog.groupBy({
      by: ['lifeArea'],
      where: { userId },
      _sum: { points: true },
    });
    return Object.values(LifeArea).map((area) => ({
      area,
      points: logs.find((log) => log.lifeArea === area)?._sum.points ?? 0,
    }));
  }

  calendar(userId: string, month?: string) {
    let base = new Date();
    if (month) {
      // month is 'YYYY-MM'
      const [y, m] = month.split('-').map(Number);
      base = new Date(y, m - 1, 1);
    }
    return this.prisma.dailySummary.findMany({
      where: { userId, date: { gte: startOfMonth(base), lte: endOfMonth(base) } },
      orderBy: { date: 'asc' },
    });
  }

  diary(userId: string) {
    return this.prisma.diaryEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
  }

  async reports(userId: string, days = 7) {
    const since = subDays(new Date(), days);
    const [tasks, habitLogs, progress, diary] = await Promise.all([
      this.prisma.task.findMany({ where: { userId, createdAt: { gte: since } } }),
      this.prisma.habitLog.findMany({ where: { habit: { userId }, date: { gte: startOfDay(since) } } }),
      this.prisma.progressLog.groupBy({ by: ['lifeArea'], where: { userId, createdAt: { gte: since } }, _sum: { points: true } }),
      this.prisma.diaryEntry.findMany({ where: { userId, createdAt: { gte: since } } }),
    ]);

    const completed = tasks.filter((task) => task.completedAt).length;
    return {
      taskCompletion: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      habitConsistency: habitLogs.length ? Math.round((habitLogs.filter((log) => log.completed).length / habitLogs.length) * 100) : 0,
      strongestArea: progress.sort((a, b) => (b._sum.points ?? 0) - (a._sum.points ?? 0))[0]?.lifeArea ?? null,
      reflectionCount: diary.length,
      progress,
    };
  }

  async toggleHabit(userId: string, habitId: string) {
    const habit = await this.prisma.habit.findFirstOrThrow({ where: { id: habitId, userId } });
    const today = startOfDay(new Date());
    const existing = await this.prisma.habitLog.findUnique({
      where: { habitId_date: { habitId: habit.id, date: today } },
    });
    if (existing) {
      return this.prisma.habitLog.update({
        where: { id: existing.id },
        data: { completed: !existing.completed },
      });
    }
    return this.prisma.habitLog.create({
      data: { habitId: habit.id, date: today, completed: true },
    });
  }

  async guru(userId: string, dto: GuruDto) {
    await this.prisma.guruMessage.create({ data: { userId, role: 'user', content: dto.message } });
    const data = await this.guruContext(userId);
    const question = await this.ai.guruQuestion(data, dto.message);
    return this.prisma.guruMessage.create({ data: { userId, role: 'assistant', content: question } });
  }

  guruMessages(userId: string) {
    return this.prisma.guruMessage.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take: 100 });
  }

  private async guruContext(userId: string) {
    const [tasks, habits, progress, diary] = await Promise.all([
      this.today(userId),
      this.habits(userId),
      this.progress(userId),
      this.diary(userId),
    ]);
    return { tasks, habits, progress, diary: diary.slice(0, 8) };
  }

  private timeOfDay() {
    const hour = new Date().getHours();
    if (hour < 11) return 'morning';
    if (hour < 17) return 'day';
    return 'evening';
  }

  private prompts(tasks: Array<{ id: string; title: string }>, habits: Array<{ id: string; name: string }>) {
    return {
      taskChecks: tasks.slice(0, 3),
      habitChecks: habits.slice(0, 4),
      reflections: ['What had your attention today?', 'What felt heavier or lighter than expected?'],
    };
  }
}
