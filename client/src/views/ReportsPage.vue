<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api } from '../api';

type Report = {
  taskCompletion: number;
  habitConsistency: number;
  strongestArea: string | null;
  reflectionCount: number;
  progress: Array<{ lifeArea: string; _sum: { points: number | null } }>;
};

const report = ref<Report | null>(null);
const days = ref<7 | 14 | 30>(7);

const areaColor: Record<string, string> = {
  LEARNING: '#38bdf8', HEALTH: '#34d399', WORK: '#818cf8',
  CREATIVITY: '#f472b6', SOCIAL: '#fb923c', MINDFULNESS: '#a78bfa', FINANCE: '#4ade80',
};
const areaIcon: Record<string, string> = {
  LEARNING:'📚', HEALTH:'💪', WORK:'💼', CREATIVITY:'🎨',
  SOCIAL:'👥', MINDFULNESS:'🧘', FINANCE:'💰',
};

// SVG ring helpers
function ringPath(pct: number, r = 44): string {
  const circ = 2 * Math.PI * r;
  return circ * (pct / 100) + ' ' + circ;
}

async function load() {
  report.value = await api<Report>(`/life/reports?days=${days.value}`);
}

watch(days, load);
onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-heading" style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:12px">
      <div>
        <p class="eyebrow">≋ Pattern insights</p>
        <h1>Reports</h1>
      </div>
      <div class="period-toggle">
        <button :class="['period-btn', { active: days === 7  }]" @click="days = 7">7d</button>
        <button :class="['period-btn', { active: days === 14 }]" @click="days = 14">14d</button>
        <button :class="['period-btn', { active: days === 30 }]" @click="days = 30">30d</button>
      </div>
    </div>

    <div v-if="report">
      <!-- Progress rings -->
      <div class="ring-grid">
        <article class="card ring-card">
          <svg width="100" height="100" class="ring-svg">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--primary)" stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="ringPath(report.taskCompletion)"
              stroke-dashoffset="0"/>
            <text x="50" y="55" text-anchor="middle" font-size="16" font-weight="800" fill="white">{{ report.taskCompletion }}%</text>
          </svg>
          <span class="ring-label">Task completion</span>
        </article>

        <article class="card ring-card">
          <svg width="100" height="100" class="ring-svg">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--health)" stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="ringPath(report.habitConsistency)"
              stroke-dashoffset="0"/>
            <text x="50" y="55" text-anchor="middle" font-size="16" font-weight="800" fill="white">{{ report.habitConsistency }}%</text>
          </svg>
          <span class="ring-label">Habit consistency</span>
        </article>

        <article class="card ring-card" style="justify-content:center">
          <div class="ring-val">{{ report.reflectionCount }}</div>
          <span class="ring-label">Reflections</span>
        </article>

        <article class="card ring-card" style="justify-content:center">
          <div class="ring-val" :style="{ color: areaColor[report.strongestArea ?? ''] ?? 'var(--ink)' }">
            {{ areaIcon[report.strongestArea ?? ''] ?? '—' }}
          </div>
          <span class="ring-label">Strongest area</span>
          <span class="muted" style="font-size:0.78rem; font-weight:700">{{ report.strongestArea ?? 'None yet' }}</span>
        </article>
      </div>

      <!-- Per-area bar chart -->
      <div v-if="report.progress.length" class="panel" style="margin-top:18px; padding:20px">
        <h2>Area breakdown (last {{ days }} days)</h2>
        <div class="area-bars">
          <div v-for="p in report.progress" :key="p.lifeArea" class="area-bar-row">
            <span class="area-bar-label">{{ areaIcon[p.lifeArea] }} {{ p.lifeArea }}</span>
            <div class="area-bar-track">
              <div
                class="area-bar-fill"
                :style="{
                  width: Math.min((p._sum.points ?? 0) / Math.max(...report!.progress.map(x => x._sum.points ?? 0), 1) * 100, 100) + '%',
                  background: areaColor[p.lifeArea]
                }"
              />
            </div>
            <span class="area-bar-pts muted">{{ p._sum.points ?? 0 }} pts</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ring-svg { transform: rotate(-90deg); }
.ring-val { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; }
.area-bars { display: grid; gap: 10px; margin-top: 12px; }
.area-bar-row { display: grid; grid-template-columns: 140px 1fr 60px; gap: 12px; align-items: center; }
.area-bar-label { font-size: 0.82rem; font-weight: 600; }
.area-bar-track { height: 8px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
.area-bar-fill  { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
.area-bar-pts   { font-size: 0.78rem; font-weight: 700; text-align: right; }
</style>
