<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, Project } from '../api';

const projects = ref<Project[]>([]);

const levelConfig = [
  { max: 25,  label: 'Seedling',  icon: '🌱', color: 'var(--health)' },
  { max: 60,  label: 'Growing',   icon: '🌿', color: 'var(--learning)' },
  { max: 90,  label: 'Thriving',  icon: '🌳', color: 'var(--primary-2)' },
  { max: Infinity, label: 'Mastered', icon: '🏆', color: 'var(--accent)' },
];

const areaColor: Record<string, string> = {
  LEARNING: 'var(--learning)', HEALTH: 'var(--health)', WORK: 'var(--work)',
  CREATIVITY: 'var(--creativity)', SOCIAL: 'var(--social)',
  MINDFULNESS: 'var(--mindfulness)', FINANCE: 'var(--finance)',
};

function getLevel(progress: number) {
  return levelConfig.find(l => progress <= l.max) ?? levelConfig[levelConfig.length - 1];
}

function totalMinutes(project: Project): number {
  return project.sessions.reduce((sum, s) => sum + s.minutes, 0);
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function sparkHeights(project: Project): number[] {
  const sessions = [...project.sessions].slice(0, 8).reverse();
  const max = Math.max(...sessions.map(s => s.minutes), 1);
  return sessions.map(s => Math.max(8, Math.round((s.minutes / max) * 100)));
}

onMounted(async () => { projects.value = await api<Project[]>('/life/projects'); });
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <p class="eyebrow">◈ Long-term work</p>
      <h1>Projects</h1>
    </div>

    <div v-if="!projects.length" class="empty-state">
      <span class="empty-icon">◈</span>
      <p>Projects grow automatically when you log work sessions in the Input page.</p>
    </div>

    <div v-else class="card-grid">
      <article v-for="p in projects" :key="p.id" class="card project-card">
        <div class="split">
          <h2>{{ p.name }}</h2>
          <span class="badge" :class="'badge-' + p.lifeArea.toLowerCase()">{{ p.lifeArea }}</span>
        </div>

        <!-- Level -->
        <div class="level-row" :style="{ color: getLevel(p.progress).color }">
          <span class="level-icon">{{ getLevel(p.progress).icon }}</span>
          <span class="level-label">{{ getLevel(p.progress).label }}</span>
          <span class="level-pts muted">{{ p.progress }} pts</span>
        </div>

        <!-- Progress bar -->
        <div class="meter">
          <span :style="{ width: Math.min(p.progress, 100) + '%', background: areaColor[p.lifeArea] }" />
        </div>

        <!-- Stats -->
        <div class="project-stats">
          <div class="pstat">
            <span class="muted">Total time</span>
            <strong>{{ fmtHours(totalMinutes(p)) }}</strong>
          </div>
          <div class="pstat">
            <span class="muted">Sessions</span>
            <strong>{{ p.sessions.length }}</strong>
          </div>
        </div>

        <!-- Sparkline -->
        <div v-if="p.sessions.length" class="sparkline">
          <span
            v-for="(h, i) in sparkHeights(p)"
            :key="i"
            :style="{ height: h + '%', background: areaColor[p.lifeArea] }"
          />
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.project-card { display: grid; gap: 12px; }
.level-row { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 700; }
.level-icon { font-size: 1.1rem; }
.level-label { font-family: 'Outfit', sans-serif; font-weight: 700; }
.level-pts { font-size: 0.78rem; margin-left: auto; }
.project-stats { display: flex; gap: 20px; }
.pstat { display: flex; flex-direction: column; gap: 2px; }
.pstat span { font-size: 0.72rem; font-weight: 600;  letter-spacing: 0.05em; }
.pstat strong { font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 800; }
</style>
