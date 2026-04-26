<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, LifeArea } from '../api';

type DaySummary = { id: string; date: string; productivity: number; summary: string; areas: LifeArea[] };

const days = ref<DaySummary[]>([]);
const monthOffset = ref(0); // 0 = current month, -1 = previous, etc.

const areaColor: Record<string, string> = {
  LEARNING: '#38bdf8', HEALTH: '#34d399', WORK: '#818cf8',
  CREATIVITY: '#f472b6', SOCIAL: '#fb923c', MINDFULNESS: '#a78bfa', FINANCE: '#4ade80',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'fri', 'Sat', 'Sun'];

const focusDate = computed(() => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthOffset.value);
  return d;
});

const monthLabel = computed(() =>
  focusDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
);

const calGrid = computed(() => {
  const year  = focusDate.value.getFullYear();
  const month = focusDate.value.getMonth();
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);

  // Day-of-week for first day (Mon=0)
  let startDow = (first.getDay() + 6) % 7;

  const cells: Array<{ date: Date | null; data: DaySummary | null }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ date: null, data: null });
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d);
    const iso  = date.toISOString().slice(0, 10);
    const data = days.value.find(s => s.date.slice(0, 10) === iso) ?? null;
    cells.push({ date, data });
  }
  return cells;
});

const today = new Date().toISOString().slice(0, 10);

function prodOpacity(prod: number) {
  return 0.15 + (prod / 100) * 0.65;
}

async function load() {
  const y = focusDate.value.getFullYear();
  const m = String(focusDate.value.getMonth() + 1).padStart(2, '0');
  days.value = await api<DaySummary[]>(`/life/calendar?month=${y}-${m}`);
}

function prev() { monthOffset.value--; load(); }
function next() { if (monthOffset.value < 0) { monthOffset.value++; load(); } }

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <p class="eyebrow">▦ Time visualization</p>
      <h1>Calendar</h1>
    </div>

    <div class="calendar-header">
      <span class="month-label">{{ monthLabel }}</span>
      <div style="display:flex; gap:8px">
        <button class="btn-icon" @click="prev">‹</button>
        <button class="btn-icon" :disabled="monthOffset >= 0" @click="next">›</button>
      </div>
    </div>

    <!-- Weekday headers -->
    <div class="calendar-grid" style="margin-bottom:4px">
      <div v-for="d in WEEKDAYS" :key="d" class="weekday-label">{{ d }}</div>
    </div>

    <!-- Day cells -->
    <div class="calendar-grid">
      <div
        v-for="(cell, i) in calGrid"
        :key="i"
        :class="[
          'day-cell',
          { 'empty': !cell.date, 'today': cell.date?.toISOString().slice(0,10) === today }
        ]"
        :style="cell.data ? { background: `rgba(124,109,245,${prodOpacity(cell.data.productivity)})` } : {}"
      >
        <template v-if="cell.date">
          <div class="day-num">{{ cell.date.getDate() }}</div>
          <div v-if="cell.data" class="day-prod">{{ cell.data.productivity }}%</div>
          <div v-if="cell.data" class="day-summary">{{ cell.data.summary }}</div>
          <div v-if="cell.data" class="day-dots">
            <span
              v-for="area in cell.data.areas"
              :key="area"
              :style="{ background: areaColor[area] }"
              :title="area"
            />
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
