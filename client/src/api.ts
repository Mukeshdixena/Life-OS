const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type LifeArea = 'LEARNING' | 'HEALTH' | 'WORK' | 'CREATIVITY' | 'SOCIAL' | 'MINDFULNESS' | 'FINANCE';

export type Task = {
  id: string;
  title: string;
  importance: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string | null;
  completedAt?: string | null;
};

export type Habit = {
  id: string;
  name: string;
  lifeArea: LifeArea;
  completions: Array<{ id: string; date: string; completed: boolean }>;
};

export type Project = {
  id: string;
  name: string;
  lifeArea: LifeArea;
  progress: number;
  sessions: Array<{ id: string; minutes: number; note?: string; createdAt: string }>;
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('life-os-token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(Array.isArray(error.message) ? error.message.join(', ') : error.message);
  }

  return response.json() as Promise<T>;
}

