import { Injectable } from '@nestjs/common';
import { LifeArea } from '@prisma/client';
import { endOfMonth, startOfDay, startOfMonth, subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AiRouterService } from './ai-router.service';
import { GuruDto, InputDto, TimeBlockDto } from './dto';

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

      const existing = await tx.dailySummary.findUnique({ where: { userId_date: { userId, date: today } } });
      const currentProd = existing?.productivity ?? 0;
      const newProd = Math.min(100, currentProd + Math.round(meaning.productivity / 5));

      await tx.dailySummary.upsert({
        where: { userId_date: { userId, date: today } },
        update: { productivity: newProd, summary: meaning.summary, areas: meaning.areas },
        create: { userId, date: today, productivity: Math.min(100, meaning.productivity), summary: meaning.summary, areas: meaning.areas },
      });

      return { entry, meaning, created: { tasks, habits, projects, diary } };
    });

    return result;
  }

  today(userId: string) {
    const tomorrow = new Date(startOfDay(new Date()).getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.task.findMany({
      where: { userId, OR: [{ dueDate: null }, { dueDate: { lt: tomorrow } }] },
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

  // ── Focus Mode ─────────────────────────────────────────────────────────────

  focusTask(userId: string) {
    return this.prisma.task.findFirst({
      where: { userId, completedAt: null },
      include: { subtasks: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ importance: 'desc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async quickTask(userId: string) {
    const low = await this.prisma.task.findFirst({
      where: { userId, completedAt: null, importance: 'LOW' },
      orderBy: { createdAt: 'asc' },
    });
    if (low) return low;
    return this.prisma.task.findFirst({
      where: { userId, completedAt: null },
      orderBy: [{ importance: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ── Subtasks ───────────────────────────────────────────────────────────────

  async splitTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirstOrThrow({ where: { id: taskId, userId } });
    await this.prisma.subtask.deleteMany({ where: { taskId: task.id } });
    const subtasks = await this.ai.splitTask(task.title);
    return this.prisma.$transaction(
      subtasks.map((s) =>
        this.prisma.subtask.create({ data: { taskId: task.id, title: s.title, durationMins: s.durationMins } }),
      ),
    );
  }

  getSubtasks(userId: string, taskId: string) {
    return this.prisma.subtask.findMany({
      where: { task: { id: taskId, userId } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async toggleSubtask(userId: string, subtaskId: string) {
    const sub = await this.prisma.subtask.findFirstOrThrow({
      where: { id: subtaskId, task: { userId } },
    });
    return this.prisma.subtask.update({
      where: { id: sub.id },
      data: { completedAt: sub.completedAt ? null : new Date() },
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
      const [y, m] = month.split('-').map(Number);
      base = new Date(y, m - 1, 1);
    }
    return this.prisma.dailySummary.findMany({
      where: { userId, date: { gte: startOfMonth(base), lte: endOfMonth(base) } },
      orderBy: { date: 'asc' },
    });
  }

  diary(userId: string) {
    return this.prisma.diaryEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 60 });
  }

  async reports(userId: string, days = 7) {
    const since = subDays(new Date(), days);
    const [tasks, habitLogs, progress, diary] = await Promise.all([
      this.prisma.task.findMany({ where: { userId, createdAt: { gte: since } } }),
      this.prisma.habitLog.findMany({ where: { habit: { userId }, date: { gte: startOfDay(since) } } }),
      this.prisma.progressLog.groupBy({ by: ['lifeArea'], where: { userId, createdAt: { gte: since } }, _sum: { points: true } }),
      this.prisma.diaryEntry.findMany({ where: { userId, createdAt: { gte: since } } }),
    ]);
    const completed = tasks.filter((t) => t.completedAt).length;
    return {
      taskCompletion: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      habitConsistency: habitLogs.length ? Math.round((habitLogs.filter((l) => l.completed).length / habitLogs.length) * 100) : 0,
      strongestArea: progress.sort((a, b) => (b._sum.points ?? 0) - (a._sum.points ?? 0))[0]?.lifeArea ?? null,
      reflectionCount: diary.length,
      progress,
    };
  }

  async toggleHabit(userId: string, habitId: string) {
    const habit = await this.prisma.habit.findFirstOrThrow({ where: { id: habitId, userId } });
    const today = startOfDay(new Date());
    const existing = await this.prisma.habitLog.findUnique({ where: { habitId_date: { habitId: habit.id, date: today } } });
    if (existing) {
      return this.prisma.habitLog.update({ where: { id: existing.id }, data: { completed: !existing.completed } });
    }
    return this.prisma.habitLog.create({ data: { habitId: habit.id, date: today, completed: true } });
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

  // ── Time Blocks ────────────────────────────────────────────────────────────

  getTimeBlocks(userId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.timeBlock.findMany({
      where: { userId, date: { gte: dayStart, lt: dayEnd } },
      orderBy: { startMinutes: 'asc' },
    });
  }

  createTimeBlock(userId: string, dto: TimeBlockDto) {
    const [y, m, d] = dto.date.split('-').map(Number);
    const date = startOfDay(new Date(y, m - 1, d));
    return this.prisma.timeBlock.create({
      data: {
        userId,
        title: dto.title,
        lifeArea: dto.lifeArea as LifeArea,
        date,
        startMinutes: dto.startMinutes,
        durationMins: dto.durationMins,
        taskId: dto.taskId ?? null,
        note: dto.note ?? null,
      },
    });
  }

  async updateTimeBlock(userId: string, id: string, dto: Partial<TimeBlockDto>) {
    await this.prisma.timeBlock.findFirstOrThrow({ where: { id, userId } });
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.lifeArea !== undefined) data.lifeArea = dto.lifeArea as LifeArea;
    if (dto.startMinutes !== undefined) data.startMinutes = dto.startMinutes;
    if (dto.durationMins !== undefined) data.durationMins = dto.durationMins;
    if (dto.taskId !== undefined) data.taskId = dto.taskId;
    if (dto.note !== undefined) data.note = dto.note;
    return this.prisma.timeBlock.update({ where: { id }, data });
  }

  async deleteTimeBlock(userId: string, id: string) {
    await this.prisma.timeBlock.findFirstOrThrow({ where: { id, userId } });
    return this.prisma.timeBlock.delete({ where: { id } });
  }

  async doneTimeBlock(userId: string, id: string) {
    const block = await this.prisma.timeBlock.findFirstOrThrow({ where: { id, userId } });
    const now = new Date();
    const completedAt = block.completedAt ? null : now;
    const updated = await this.prisma.timeBlock.update({ where: { id }, data: { completedAt } });
    if (block.taskId && completedAt) {
      await this.prisma.task.updateMany({ where: { id: block.taskId, userId }, data: { completedAt: now } });
    }
    return updated;
  }

  async seedRoutines(userId: string) {
    const existing = await this.prisma.routine.findFirst({ where: { userId } });
    if (existing) return;

    await this.prisma.routine.create({
      data: {
        userId,
        name: 'Weekday',
        blocks: {
          create: [
            { title: 'Morning Ritual', lifeArea: LifeArea.MINDFULNESS, startMinutes: 420, durationMins: 60 },
            { title: 'Deep Work Session 1', lifeArea: LifeArea.WORK, startMinutes: 540, durationMins: 120 },
            { title: 'Lunch & Walk', lifeArea: LifeArea.HEALTH, startMinutes: 720, durationMins: 60 },
            { title: 'Deep Work Session 2', lifeArea: LifeArea.WORK, startMinutes: 840, durationMins: 120 },
            { title: 'Skill Building', lifeArea: LifeArea.LEARNING, startMinutes: 1020, durationMins: 60 },
            { title: 'Exercise', lifeArea: LifeArea.HEALTH, startMinutes: 1140, durationMins: 60 },
            { title: 'Social / Family', lifeArea: LifeArea.SOCIAL, startMinutes: 1200, durationMins: 90 },
            { title: 'Wind Down', lifeArea: LifeArea.MINDFULNESS, startMinutes: 1320, durationMins: 60 },
          ],
        },
      },
    });

    await this.prisma.routine.create({
      data: {
        userId,
        name: 'Weekend',
        blocks: {
          create: [
            { title: 'Sleep In & Slow Morning', lifeArea: LifeArea.HEALTH, startMinutes: 540, durationMins: 120 },
            { title: 'Adventure / Social', lifeArea: LifeArea.SOCIAL, startMinutes: 660, durationMins: 240 },
            { title: 'Creative Hobby', lifeArea: LifeArea.CREATIVITY, startMinutes: 900, durationMins: 120 },
            { title: 'Life Admin / Finance', lifeArea: LifeArea.FINANCE, startMinutes: 1020, durationMins: 60 },
            { title: 'Relaxation', lifeArea: LifeArea.MINDFULNESS, startMinutes: 1200, durationMins: 120 },
          ],
        },
      },
    });
  }

  // ── Magic Planner ─────────────────────────────────────────────────────────

  async magicPlan(userId: string, prompt: string, dateStr: string) {
    const date = startOfDay(new Date(dateStr));
    const [tasks, existingBlocks] = await Promise.all([
      this.prisma.task.findMany({ where: { userId, completedAt: null } }),
      this.prisma.timeBlock.findMany({ where: { userId, date } }),
    ]);

    const context = {
      currentTime: new Date().toISOString(),
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, importance: t.importance })),
      existingBlocks: existingBlocks.map((b) => ({ start: b.startMinutes, end: b.startMinutes + b.durationMins, title: b.title })),
    };

    const suggested = await this.ai.planDay(prompt, context);

    // Filter out any overlaps just in case
    return this.prisma.$transaction(
      suggested.map((b) =>
        this.prisma.timeBlock.create({
          data: {
            userId,
            title: b.title,
            lifeArea: b.lifeArea,
            date,
            startMinutes: b.startMinutes,
            durationMins: b.durationMins,
            taskId: b.taskId,
            note: b.note,
          },
        }),
      ),
    );
  }

  // ── Routines ───────────────────────────────────────────────────────────────

  async getRoutines(userId: string) {
    await this.seedRoutines(userId);
    return this.prisma.routine.findMany({
      where: { userId },
      include: { blocks: { orderBy: { startMinutes: 'asc' } } },
    });
  }

  async applyRoutine(userId: string, routineName: string, dateStr: string) {
    const date = startOfDay(new Date(dateStr));
    const routine = await this.prisma.routine.findFirstOrThrow({
      where: { userId, name: routineName },
      include: { blocks: true },
    });

    await this.prisma.timeBlock.deleteMany({ where: { userId, date } });

    return this.prisma.$transaction(
      routine.blocks.map((b) =>
        this.prisma.timeBlock.create({
          data: {
            userId,
            title: b.title,
            lifeArea: b.lifeArea,
            date,
            startMinutes: b.startMinutes,
            durationMins: b.durationMins,
          },
        }),
      ),
    );
  }

  async saveRoutine(userId: string, name: string, blocks: any[]) {
    return this.prisma.$transaction(async (tx) => {
      const routine = await tx.routine.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name },
      });

      await tx.routineBlock.deleteMany({ where: { routineId: routine.id } });

      return tx.routine.update({
        where: { id: routine.id },
        data: {
          blocks: {
            create: blocks.map((b) => ({
              title: b.title,
              lifeArea: b.lifeArea,
              startMinutes: b.startMinutes,
              durationMins: b.durationMins,
            })),
          },
        },
        include: { blocks: true },
      });
    });
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
