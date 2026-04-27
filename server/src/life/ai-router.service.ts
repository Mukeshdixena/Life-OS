import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LifeArea, TaskImportance } from '@prisma/client';
import { addDays, formatISO, startOfDay } from 'date-fns';
import { RoutedMeaning, RoutedTimeBlock } from './life.types';

const areaKeywords: Record<LifeArea, string[]> = {
  LEARNING: ['study', 'studied', 'read', 'course', 'learn', 'assignment', 'exam', 'practice'],
  HEALTH: ['gym', 'walk', 'run', 'sleep', 'workout', 'meditate', 'food', 'doctor', 'health'],
  WORK: ['work', 'client', 'meeting', 'ship', 'code', 'job', 'deadline', 'email'],
  CREATIVITY: ['write', 'draw', 'music', 'design', 'create', 'video', 'journal'],
  SOCIAL: ['friend', 'family', 'call', 'date', 'message', 'social'],
  MINDFULNESS: ['mindful', 'meditation', 'anxious', 'sad', 'happy', 'grateful', 'reflect'],
  FINANCE: ['money', 'budget', 'spend', 'save', 'invoice', 'finance', 'invest'],
};

@Injectable()
export class AiRouterService {
  constructor(private readonly config: ConfigService) {}

  async route(text: string, mood?: number): Promise<RoutedMeaning> {
    const aiResult = await this.tryOpenRouter(text, mood);
    if (aiResult) {
      return this.normalize(aiResult, text, mood);
    }

    return this.heuristicRoute(text, mood);
  }

  async guruQuestion(data: unknown, userMessage: string) {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    const model = this.config.get<string>('OPENROUTER_MODEL');
    if (!apiKey || !model) {
      return this.localGuruQuestion(userMessage);
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Life OS',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are the Life OS Socratic Guru. Use the user data to ask one thoughtful question. Do not give advice. Keep it under 70 words.',
            },
            { role: 'user', content: JSON.stringify({ userMessage, data }) },
          ],
        }),
      });
      if (!response.ok) {
        return this.localGuruQuestion(userMessage);
      }
      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content?.trim() || this.localGuruQuestion(userMessage);
    } catch {
      return this.localGuruQuestion(userMessage);
    }
  }

  private async tryOpenRouter(text: string, mood?: number) {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    const model = this.config.get<string>('OPENROUTER_MODEL');
    if (!apiKey || !model) {
      return null;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Life OS',
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Convert life input into strict JSON. Schema: { tasks: [{title, dueDate, importance}], habits: [{name, completed, lifeArea}], projects: [{name, minutes, lifeArea, progressDelta}], progress: [{lifeArea, points, note}], diary: {title, body, mood}, summary, areas: [LifeArea], productivity }. LifeArea: LEARNING, HEALTH, WORK, CREATIVITY, SOCIAL, MINDFULNESS, FINANCE. importance: LOW, MEDIUM, HIGH. productivity: 0-100.',
            },
            { role: 'user', content: JSON.stringify({ text, mood, today: new Date().toISOString() }) },
          ],
        }),
      });
      if (!response.ok) {
        return null;
      }
      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content;
      return content ? JSON.parse(content) : null;
    } catch {
      return null;
    }
  }

  private heuristicRoute(text: string, mood?: number): RoutedMeaning {
    const lower = text.toLowerCase();
    const areas = this.detectAreas(lower);
    const tasks = this.detectTasks(text);
    const habits = this.detectHabits(lower);
    const projects = this.detectProjects(text, lower, areas);
    const progress = areas.map((lifeArea) => ({
      lifeArea,
      points: lower.includes('skipped') || lower.includes('missed') ? 1 : 5,
      note: text,
    }));
    const emotional = this.hasEmotion(lower);

    return {
      tasks,
      habits,
      projects,
      progress,
      diary: emotional || mood ? { title: 'Reflection', body: text, mood } : undefined,
      summary: text.length > 140 ? `${text.slice(0, 137)}...` : text,
      areas,
      productivity: Math.min(100, Math.max(5, progress.length * 12 + projects.length * 18 + tasks.length * 8)),
    };
  }

  private normalize(value: Partial<RoutedMeaning>, text: string, mood?: number): RoutedMeaning {
    const fallback = this.heuristicRoute(text, mood);
    const areas = this.validAreas(value.areas?.length ? value.areas : fallback.areas);
    return {
      tasks: (value.tasks ?? fallback.tasks)
        .map((task: any) => ({
          title: String(task.title || task.name || text).slice(0, 200),
          dueDate: task.dueDate,
          importance: this.validImportance(task.importance),
        }))
        .filter((t) => t.title),
      habits: (value.habits ?? fallback.habits)
        .map((habit: any) => ({
          name: String(habit.name || habit.title || 'Habit').slice(0, 100),
          completed: habit.completed !== false,
          lifeArea: this.validArea(habit.lifeArea) ?? LifeArea.HEALTH,
          note: habit.note,
        }))
        .filter((h) => h.name),
      projects: (value.projects ?? fallback.projects)
        .map((project: any) => ({
          name: String(project.name || project.title || areas[0] || 'Project').slice(0, 100),
          minutes: Math.max(0, Number(project.minutes ?? 0)),
          lifeArea: this.validArea(project.lifeArea) ?? areas[0] ?? LifeArea.WORK,
          note: project.note,
          progressDelta: Number(project.progressDelta ?? 0),
        }))
        .filter((p) => p.name),
      progress: (value.progress ?? fallback.progress).map((item: any) => ({
        lifeArea: this.validArea(item.lifeArea) ?? areas[0] ?? LifeArea.WORK,
        points: Number(item.points || 1),
        note: item.note,
      })),
      diary: value.diary ?? fallback.diary,
      summary: value.summary || fallback.summary,
      areas,
      productivity: Math.min(100, Math.max(0, Number(value.productivity ?? fallback.productivity))),
    };
  }

  private detectAreas(lower: string) {
    const areas = Object.entries(areaKeywords)
      .filter(([, words]) => words.some((word) => lower.includes(word)))
      .map(([area]) => area as LifeArea);
    return areas.length ? [...new Set(areas)] : [LifeArea.WORK];
  }

  private detectTasks(text: string) {
    const lower = text.toLowerCase();
    if (!/(need to|todo|finish|tomorrow|due|must|should)/.test(lower)) {
      return [];
    }
    const title = text
      .replace(/.*?(need to|todo|finish|must|should)\s+/i, '')
      .replace(/\s+(tomorrow|today|by.+)$/i, '')
      .trim();
    return [
      {
        title: title || text,
        dueDate: lower.includes('tomorrow') ? formatISO(startOfDay(addDays(new Date(), 1))) : undefined,
        importance: lower.includes('urgent') || lower.includes('must') ? TaskImportance.HIGH : TaskImportance.MEDIUM,
      },
    ];
  }

  private detectHabits(lower: string) {
    const habits: RoutedMeaning['habits'] = [];
    if (lower.includes('gym') || lower.includes('workout')) {
      habits.push({ name: 'Gym', completed: !/(skip|skipped|miss|missed)/.test(lower), lifeArea: LifeArea.HEALTH });
    }
    if (lower.includes('meditat')) {
      habits.push({ name: 'Meditation', completed: !/(skip|skipped|miss|missed)/.test(lower), lifeArea: LifeArea.MINDFULNESS });
    }
    if (lower.includes('read')) {
      habits.push({ name: 'Reading', completed: true, lifeArea: LifeArea.LEARNING });
    }
    return habits;
  }

  private detectProjects(text: string, lower: string, areas: LifeArea[]) {
    const timeMatch = lower.match(/(\d+)\s*(hour|hours|hr|hrs|minute|minutes|min)/);
    if (!timeMatch) {
      return [];
    }
    const minutes = Number(timeMatch[1]) * (timeMatch[2].startsWith('hour') || timeMatch[2].startsWith('hr') ? 60 : 1);
    const name = lower.includes('study') || lower.includes('assignment') ? 'Learning' : areas[0].toLowerCase();
    return [{ name: this.titleCase(name), minutes, lifeArea: areas[0], note: text, progressDelta: Math.min(20, Math.ceil(minutes / 15)) }];
  }

  private hasEmotion(lower: string) {
    return /(feel|felt|happy|sad|angry|anxious|tired|grateful|lonely|excited|stressed)/.test(lower);
  }

  private validAreas(areas?: LifeArea[]) {
    const valid = (areas ?? []).map((area) => this.validArea(area)).filter(Boolean) as LifeArea[];
    return valid.length ? [...new Set(valid)] : [LifeArea.WORK];
  }

  private validArea(area?: LifeArea) {
    return area && Object.values(LifeArea).includes(area) ? area : undefined;
  }

  private validImportance(importance?: TaskImportance) {
    return importance && Object.values(TaskImportance).includes(importance) ? importance : TaskImportance.MEDIUM;
  }

  private titleCase(value: string) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  async planDay(prompt: string, context: any): Promise<RoutedTimeBlock[]> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    const model = this.config.get<string>('OPENROUTER_MODEL');
    if (!apiKey || !model) return [];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Life OS',
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are a high-performance Life OS Strategist. Your goal is to design an optimized plan for the rest of the day.
              Use the provided user context (tasks, habits, current time, existing blocks) to fill the gaps intelligently.
              Return JSON: { blocks: [{title, startMinutes, durationMins, lifeArea, taskId, note}] }.
              LifeArea: LEARNING, HEALTH, WORK, CREATIVITY, SOCIAL, MINDFULNESS, FINANCE.
              startMinutes: minutes from midnight (0-1439).
              Ensure blocks do not overlap with existing blocks and start AFTER the current time.
              Prioritize urgent tasks and health/mindfulness if gaps allow.`,
            },
            { role: 'user', content: JSON.stringify({ prompt, context, now: new Date().toISOString() }) },
          ],
        }),
      });
      if (!response.ok) return [];
      const json = await response.json();
      return json.choices?.[0]?.message?.content ? JSON.parse(json.choices[0].message.content).blocks : [];
    } catch {
      return [];
    }
  }

  async splitTask(title: string): Promise<Array<{ title: string; durationMins: number }>> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    const model = this.config.get<string>('OPENROUTER_MODEL');
    if (!apiKey || !model) return this.heuristicSplit(title);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Life OS',
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Break the given task into 3–5 concrete subtasks, each taking at most 10 minutes. Return JSON: { subtasks: [{title, durationMins}] }. durationMins must be between 2 and 10.',
            },
            { role: 'user', content: title },
          ],
        }),
      });
      if (!response.ok) return this.heuristicSplit(title);
      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content;
      if (!content) return this.heuristicSplit(title);
      const parsed = JSON.parse(content) as { subtasks?: Array<{ title?: string; durationMins?: number }> };
      return (parsed.subtasks ?? []).slice(0, 5).map((s) => ({
        title: String(s.title ?? title).slice(0, 200),
        durationMins: Math.min(10, Math.max(2, Number(s.durationMins ?? 5))),
      }));
    } catch {
      return this.heuristicSplit(title);
    }
  }

  private heuristicSplit(title: string): Array<{ title: string; durationMins: number }> {
    return [
      { title: `Research: ${title}`, durationMins: 5 },
      { title: `Draft / do: ${title}`, durationMins: 10 },
      { title: `Review: ${title}`, durationMins: 5 },
    ];
  }

  private localGuruQuestion(message: string) {
    return `When you look at "${message.slice(0, 80)}", what pattern in your recent choices feels most important to understand before you decide what to do next?`;
  }
}

