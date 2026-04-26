<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, Habit } from '../api';

const habits = ref<Habit[]>([]);

const areaColor: Record<string, string> = {
  LEARNING: 'var(--learning)', HEALTH: 'var(--health)', WORK: 'var(--work)',
  CREATIVITY: 'var(--creativity)', SOCIAL: 'var(--social)',
  MINDFULNESS: 'var(--mindfulness)', FINANCE: 'var(--finance)',
};
const areaIcon: Record<string, string> = {
  LEARNING:'📚', HEALTH:'💪', WORK:'💼', CREATIVITY:'🎨',
  SOCIAL:'👥', MINDFULNESS:'🧘', FINANCE:'💰',
};

function currentStreak(completions: Habit['completions']): number {
  const sorted = [...completions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  let expected = new Date(); expected.setHours(0,0,0,0);
  for (const c of sorted) {
    const d = new Date(c.date); d.setHours(0,0,0,0);
    const diff = Math.round((expected.getTime() - d.getTime()) / 86400000);
    if (diff > 1) break;
    if (c.completed) { streak++; expected = d; expected.setDate(expected.getDate() - 1); }
    else break;
  }
  return streak;
}

function bestStreak(completions: Habit['completions']): number {
  const sorted = [...completions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let best = 0, cur = 0;
  for (const c of sorted) { if (c.completed) { cur++; best = Math.max(best, cur); } else { cur = 0; } }
  return best;
}

function last21(completions: Habit['completions']) {
  return completions.slice(0, 21).reverse();
}

async function load() {
  habits.value = await api<Habit[]>('/life/habits');
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <p class="eyebrow">⟳ Consistency</p>
      <h1>Habits</h1>
    </div>

    <div v-if="!habits.length" class="empty-state">
      <span class="empty-icon">⟳</span>
      <p>No habits yet. Mention a daily behavior in the Input page and it will appear here.</p>
    </div>

    <div v-else class="card-grid">
      <article v-for="h in habits" :key="h.id" class="card habit-card">
        <div class="split">
          <h2>{{ h.name }}</h2>
          <span class="badge" :class="'badge-' + h.lifeArea.toLowerCase()">
            {{ areaIcon[h.lifeArea] }} {{ h.lifeArea }}
          </span>
        </div>

        <div class="streak-row">
          <div class="streak-item">
            <span>🔥 Streak</span>
            <strong>{{ currentStreak(h.completions) }}d</strong>
          </div>
          <div class="streak-item">
            <span>🏆 Best</span>
            <strong>{{ bestStreak(h.completions) }}d</strong>
          </div>
          <div class="streak-item">
            <span>📅 Logged</span>
            <strong>{{ h.completions.filter(c => c.completed).length }}d</strong>
          </div>
        </div>

        <div class="dots">
          <span
            v-for="log in last21(h.completions)"
            :key="log.id"
            :class="{ hit: log.completed, miss: !log.completed }"
            :title="new Date(log.date).toLocaleDateString()"
            :style="log.completed ? { background: areaColor[h.lifeArea] } : {}"
          />
        </div>
        <p class="dot-legend muted">← 21 days</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.habit-card { display: grid; gap: 12px; }
.dot-legend { font-size: 0.68rem; margin-top: -4px; }
</style>
