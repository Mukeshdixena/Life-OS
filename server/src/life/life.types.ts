import { LifeArea, TaskImportance } from '@prisma/client';

export type RoutedMeaning = {
  tasks: Array<{ title: string; dueDate?: string; importance?: TaskImportance }>;
  habits: Array<{ name: string; completed: boolean; lifeArea?: LifeArea; note?: string }>;
  projects: Array<{ name: string; minutes?: number; lifeArea?: LifeArea; note?: string; progressDelta?: number }>;
  progress: Array<{ lifeArea: LifeArea; points: number; note?: string }>;
  diary?: { title: string; body: string; mood?: number };
  summary: string;
  areas: LifeArea[];
  productivity: number;
};

