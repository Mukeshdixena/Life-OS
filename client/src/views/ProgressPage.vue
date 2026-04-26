<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, LifeArea } from '../api';

const rows = ref<Array<{ area: LifeArea; points: number }>>([]);

const areaConfig: Record<string, { icon: string; color: string; label: string }> = {
  LEARNING:    { icon: '📚', color: '#38bdf8', label: 'Learning' },
  HEALTH:      { icon: '💪', color: '#34d399', label: 'Health' },
  WORK:        { icon: '💼', color: '#818cf8', label: 'Work' },
  CREATIVITY:  { icon: '🎨', color: '#f472b6', label: 'Creativity' },
  SOCIAL:      { icon: '👥', color: '#fb923c', label: 'Social' },
  MINDFULNESS: { icon: '🧘', color: '#a78bfa', label: 'Mindfulness' },
  FINANCE:     { icon: '💰', color: '#4ade80', label: 'Finance' },
};

function levelLabel(pts: number): string {
  if (pts === 0)   return 'Unstarted';
  if (pts < 20)   return 'Beginner';
  if (pts < 60)   return 'Developing';
  if (pts < 120)  return 'Proficient';
  if (pts < 250)  return 'Advanced';
  return 'Master';
}

const maxPts = computed(() => Math.max(...rows.value.map(r => r.points), 1));

// SVG radar chart — 7 areas, regular polygon
const CENTER = 120;
const RADIUS = 90;
const N = 7;

function angle(i: number) { return (i * 2 * Math.PI) / N - Math.PI / 2; }

function outerPt(i: number, r: number) {
  return { x: CENTER + r * Math.cos(angle(i)), y: CENTER + r * Math.sin(angle(i)) };
}

const spokes = computed(() =>
  Array.from({ length: N }, (_, i) => ({
    x2: outerPt(i, RADIUS).x,
    y2: outerPt(i, RADIUS).y,
  }))
);

const radarPath = computed(() => {
  if (!rows.value.length) return '';
  const pts = rows.value.map((r, i) => {
    const frac = Math.min(r.points / maxPts.value, 1);
    const p = outerPt(i, RADIUS * frac);
    return `${p.x},${p.y}`;
  });
  return 'M ' + pts.join(' L ') + ' Z';
});

const ringRadii = [RADIUS * 0.25, RADIUS * 0.5, RADIUS * 0.75, RADIUS];

onMounted(async () => { rows.value = await api<Array<{ area: LifeArea; points: number }>>('/life/progress'); });
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <p class="eyebrow">◉ Growth overview</p>
      <h1>Life Progress</h1>
    </div>

    <!-- Radar chart -->
    <div class="radar-wrap" v-if="rows.length">
      <svg :width="CENTER * 2" :height="CENTER * 2" class="radar-svg">
        <!-- Ring guides -->
        <polygon
          v-for="r in ringRadii"
          :key="r"
          :points="Array.from({length:N},(_,i)=>outerPt(i,r)).map(p=>`${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          stroke-width="1"
        />
        <!-- Spokes -->
        <line
          v-for="(s,i) in spokes" :key="i"
          :x1="CENTER" :y1="CENTER" :x2="s.x2" :y2="s.y2"
          stroke="rgba(255,255,255,0.08)" stroke-width="1"
        />
        <!-- Data shape -->
        <path :d="radarPath" fill="rgba(124,109,245,0.25)" stroke="rgba(124,109,245,0.7)" stroke-width="2" />
        <!-- Area labels -->
        <text
          v-for="(r,i) in rows" :key="r.area"
          :x="outerPt(i, RADIUS + 18).x"
          :y="outerPt(i, RADIUS + 18).y"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="11"
          fill="rgba(255,255,255,0.5)"
        >{{ areaConfig[r.area]?.label ?? r.area }}</text>
      </svg>
    </div>

    <!-- Rows -->
    <div class="stack" style="margin-top: 24px">
      <article
        v-for="row in rows"
        :key="row.area"
        class="progress-row"
        :style="{ '--area-color': areaConfig[row.area]?.color ?? 'var(--primary)' }"
      >
        <div class="area-name">
          <span class="area-dot" />
          <span>{{ areaConfig[row.area]?.icon }}</span>
          {{ areaConfig[row.area]?.label ?? row.area }}
        </div>
        <div class="meter">
          <span :style="{ width: Math.min((row.points / maxPts) * 100, 100) + '%', background: areaConfig[row.area]?.color }" />
        </div>
        <div class="area-right">
          <strong>{{ row.points }}</strong>
          <span class="level-chip muted">{{ levelLabel(row.points) }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.radar-wrap { display: flex; justify-content: center; margin-bottom: 8px; }
.radar-svg { overflow: visible; }
.area-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--area-color);
  flex-shrink: 0;
}
.area-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.area-right strong { font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 800; }
.level-chip { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; }
</style>
