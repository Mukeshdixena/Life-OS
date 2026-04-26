<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api, Task, TimeBlock } from '../api';

// ── State ──────────────────────────────────────────────────────────────────
const blocks = ref<TimeBlock[]>([]);
const tasks  = ref<Task[]>([]);
const today  = ref(fmtDate(new Date()));
const now    = ref(new Date());
const saving = ref(false);
const error  = ref('');
const showModal = ref(false);
const editTarget = ref<TimeBlock | null>(null);

// Modal form
const form = ref({
  title: '',
  lifeArea: 'WORK' as string,
  startH: 9,
  startM: 0,
  durationMins: 60,
  taskId: '',
  note: '',
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function minToHHMM(minutes: number) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function nowMinutes() {
  return now.value.getHours() * 60 + now.value.getMinutes();
}

const AREA_COLORS: Record<string, string> = {
  LEARNING:    '#38bdf8',
  HEALTH:      '#34d399',
  WORK:        '#818cf8',
  CREATIVITY:  '#f472b6',
  SOCIAL:      '#fb923c',
  MINDFULNESS: '#a78bfa',
  FINANCE:     '#4ade80',
};

const AREAS = ['LEARNING','HEALTH','WORK','CREATIVITY','SOCIAL','MINDFULNESS','FINANCE'];

// ── 24h timeline config ──────────────────────────────────────────────────────
const PX_PER_MIN = 1.6; // pixels per minute
const TOTAL_H    = 24 * 60 * PX_PER_MIN; // total height in px

function blockStyle(b: TimeBlock) {
  const top  = b.startMinutes * PX_PER_MIN;
  const h    = Math.max(b.durationMins * PX_PER_MIN, 22);
  const color = AREA_COLORS[b.lifeArea] ?? '#7c6df5';
  return {
    top: `${top}px`,
    height: `${h}px`,
    background: b.completedAt
      ? `repeating-linear-gradient(45deg,${color}33,${color}33 4px,${color}18 4px,${color}18 8px)`
      : `linear-gradient(135deg,${color}cc,${color}88)`,
    borderLeft: `3px solid ${color}`,
    opacity: b.completedAt ? '0.65' : '1',
  };
}

function nowLineTop() {
  return nowMinutes() * PX_PER_MIN;
}

// Percentage of day complete
const pct = computed(() => Math.round((nowMinutes() / 1440) * 100));

// Blocked minutes
const blockedMins  = computed(() => blocks.value.reduce((s, b) => s + b.durationMins, 0));
const completedMins = computed(() => blocks.value.filter(b => b.completedAt).reduce((s, b) => s + b.durationMins, 0));
const freeMins     = computed(() => Math.max(0, 1440 - nowMinutes() - blockedMins.value));

// ── Data loading ─────────────────────────────────────────────────────────────
async function load() {
  [blocks.value, tasks.value] = await Promise.all([
    api<TimeBlock[]>(`/life/timeblocks?date=${today.value}`),
    api<Task[]>('/life/today'),
  ]);
}

// ── Actions ──────────────────────────────────────────────────────────────────
function openAdd(clickMinutes?: number) {
  editTarget.value = null;
  const snap = clickMinutes ?? nowMinutes();
  form.value = {
    title: '',
    lifeArea: 'WORK',
    startH: Math.floor(snap / 60),
    startM: Math.round((snap % 60) / 15) * 15,
    durationMins: 60,
    taskId: '',
    note: '',
  };
  showModal.value = true;
}

function openEdit(b: TimeBlock) {
  editTarget.value = b;
  form.value = {
    title: b.title,
    lifeArea: b.lifeArea,
    startH: Math.floor(b.startMinutes / 60),
    startM: b.startMinutes % 60,
    durationMins: b.durationMins,
    taskId: b.taskId ?? '',
    note: b.note ?? '',
  };
  showModal.value = true;
}

function closeModal() { showModal.value = false; editTarget.value = null; }

async function saveBlock() {
  if (!form.value.title.trim()) { error.value = 'Title is required'; return; }
  saving.value = true; error.value = '';
  const payload = {
    title:        form.value.title.trim(),
    lifeArea:     form.value.lifeArea,
    date:         today.value,
    startMinutes: form.value.startH * 60 + form.value.startM,
    durationMins: form.value.durationMins,
    taskId:       form.value.taskId || undefined,
    note:         form.value.note || undefined,
  };
  try {
    if (editTarget.value) {
      await api(`/life/timeblocks/${editTarget.value.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await api('/life/timeblocks', { method: 'POST', body: JSON.stringify(payload) });
    }
    await load();
    closeModal();
  } catch (e: any) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function markDone(b: TimeBlock) {
  await api(`/life/timeblocks/${b.id}/done`, { method: 'PATCH' });
  await load();
}

async function deleteBlock(b: TimeBlock) {
  if (!confirm(`Delete "${b.title}"?`)) return;
  await api(`/life/timeblocks/${b.id}`, { method: 'DELETE' });
  await load();
}

function onTimelineClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const y = e.clientY - rect.top + el.scrollTop;
  const mins = Math.floor(y / PX_PER_MIN / 15) * 15;
  openAdd(Math.max(0, Math.min(1439, mins)));
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function prevDay() { const d = new Date(today.value); d.setDate(d.getDate() - 1); today.value = fmtDate(d); load(); }
function nextDay() { const d = new Date(today.value); d.setDate(d.getDate() + 1); today.value = fmtDate(d); load(); }
const isToday = computed(() => today.value === fmtDate(new Date()));

// ── Clock ────────────────────────────────────────────────────────────────────
let ticker: ReturnType<typeof setInterval>;
onMounted(() => { load(); ticker = setInterval(() => { now.value = new Date(); }, 30000); });
onUnmounted(() => clearInterval(ticker));
</script>

<template>
  <section class="page time-page">
    <!-- Header -->
    <div class="page-heading">
      <p class="eyebrow">⏱ Time Tracker</p>
      <h1>Daily Planner</h1>
    </div>

    <!-- Stats bar -->
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat">
        <span>Day Progress</span>
        <strong>{{ pct }}%</strong>
        <div class="meter" style="margin-top:8px"><span :style="{ width: pct + '%' }"></span></div>
      </div>
      <div class="stat">
        <span>Blocked Today</span>
        <strong>{{ Math.floor(blockedMins / 60) }}h {{ blockedMins % 60 }}m</strong>
      </div>
      <div class="stat">
        <span>Completed</span>
        <strong style="color:var(--success)">{{ Math.floor(completedMins / 60) }}h {{ completedMins % 60 }}m</strong>
      </div>
      <div class="stat">
        <span>Free Time Left</span>
        <strong style="color:var(--primary-2)">{{ Math.floor(freeMins / 60) }}h {{ freeMins % 60 }}m</strong>
      </div>
    </div>

    <!-- Date nav -->
    <div class="date-nav">
      <button class="btn-icon" @click="prevDay">‹</button>
      <span class="date-label">
        {{ new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' }) }}
        <span v-if="isToday" class="today-chip">Today</span>
      </span>
      <button class="btn-icon" @click="nextDay">›</button>
      <button class="primary add-btn" @click="openAdd()">＋ Add Block</button>
    </div>

    <!-- Timeline -->
    <div class="timeline-wrap">
      <!-- Hour labels -->
      <div class="hour-labels">
        <div
          v-for="h in 25"
          :key="h"
          class="hour-label"
          :style="{ top: ((h-1) * 60 * PX_PER_MIN) + 'px' }"
        >{{ String(h - 1).padStart(2,'0') }}:00</div>
      </div>

      <!-- Grid + blocks -->
      <div
        class="timeline-grid"
        :style="{ height: TOTAL_H + 'px' }"
        @click.self="onTimelineClick"
      >
        <!-- Hour grid lines -->
        <div
          v-for="h in 25"
          :key="'line-' + h"
          class="hour-line"
          :style="{ top: ((h-1) * 60 * PX_PER_MIN) + 'px' }"
        ></div>
        <!-- 30-min minor lines -->
        <div
          v-for="h in 48"
          :key="'minor-' + h"
          class="minor-line"
          :style="{ top: ((h-1) * 30 * PX_PER_MIN) + 'px' }"
        ></div>

        <!-- Now line (only for today) -->
        <div v-if="isToday" class="now-line" :style="{ top: nowLineTop() + 'px' }">
          <span class="now-label">{{ now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) }}</span>
        </div>

        <!-- Time blocks -->
        <div
          v-for="b in blocks"
          :key="b.id"
          class="time-block"
          :style="blockStyle(b)"
          @click.stop
        >
          <div class="block-inner">
            <div class="block-title" :class="{ done: b.completedAt }">{{ b.title }}</div>
            <div class="block-meta">
              {{ minToHHMM(b.startMinutes) }} · {{ b.durationMins }}m ·
              <span class="block-area">{{ b.lifeArea }}</span>
            </div>
          </div>
          <div class="block-actions">
            <button
              class="baction"
              :class="b.completedAt ? 'baction-undo' : 'baction-done'"
              :title="b.completedAt ? 'Mark undone' : 'Mark done'"
              @click="markDone(b)"
            >{{ b.completedAt ? '↩' : '✓' }}</button>
            <button class="baction baction-edit" title="Edit" @click="openEdit(b)">✎</button>
            <button class="baction baction-del"  title="Delete" @click="deleteBlock(b)">✕</button>
          </div>
        </div>

        <!-- Empty click overlay -->
        <div class="click-hint" @click="onTimelineClick">Click to add block</div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-panel">
          <div class="modal-header">
            <h2>{{ editTarget ? 'Edit Block' : 'New Time Block' }}</h2>
            <button class="btn-icon" @click="closeModal">✕</button>
          </div>

          <div class="modal-body">
            <label>
              Title
              <input v-model="form.title" type="text" placeholder="What are you doing?" />
            </label>

            <div class="form-row">
              <label>
                Start Time
                <div class="time-inputs">
                  <input v-model.number="form.startH" type="number" min="0" max="23" placeholder="HH" />
                  <span>:</span>
                  <input v-model.number="form.startM" type="number" min="0" max="59" step="5" placeholder="MM" />
                </div>
              </label>
              <label>
                Duration (min)
                <input v-model.number="form.durationMins" type="number" min="5" max="1440" step="5" />
              </label>
            </div>

            <label>
              Life Area
              <div class="area-chips">
                <button
                  v-for="a in AREAS"
                  :key="a"
                  type="button"
                  class="area-chip"
                  :class="{ active: form.lifeArea === a }"
                  :style="{ '--chip-color': AREA_COLORS[a] }"
                  @click="form.lifeArea = a"
                >{{ a }}</button>
              </div>
            </label>

            <label>
              Link to Task (optional)
              <select v-model="form.taskId">
                <option value="">— none —</option>
                <option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.title }}</option>
              </select>
            </label>

            <label>
              Note (optional)
              <textarea v-model="form.note" rows="2" placeholder="Any notes…" style="min-height:60px"></textarea>
            </label>

            <p v-if="error" class="error">{{ error }}</p>

            <div class="modal-footer">
              <button class="btn-ghost" @click="closeModal">Cancel</button>
              <button class="primary" :disabled="saving" @click="saveBlock">
                {{ saving ? 'Saving…' : (editTarget ? 'Update' : 'Add Block') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.time-page { max-width: 900px; }

/* Date nav */
.date-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.date-label {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.today-chip {
  background: rgba(124,109,245,0.2);
  color: var(--primary-2);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
}
.add-btn { padding: 9px 18px; font-size: 0.88rem; margin-left: auto; }

/* Timeline container */
.timeline-wrap {
  display: flex;
  gap: 0;
  position: relative;
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--glass);
  backdrop-filter: blur(12px);
  max-height: 70vh;
  overflow-y: auto;
}

.hour-labels {
  width: 52px;
  flex-shrink: 0;
  position: relative;
  background: var(--bg-2);
  border-right: 1px solid var(--line);
}
.hour-label {
  position: absolute;
  right: 8px;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--muted);
  transform: translateY(-50%);
  white-space: nowrap;
}

.timeline-grid {
  flex: 1;
  position: relative;
  cursor: crosshair;
}

.hour-line {
  position: absolute;
  left: 0; right: 0;
  height: 1px;
  background: var(--line);
  pointer-events: none;
}
.minor-line {
  position: absolute;
  left: 0; right: 0;
  height: 1px;
  background: rgba(255,255,255,0.03);
  pointer-events: none;
}

/* Now line */
.now-line {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: var(--danger);
  box-shadow: 0 0 8px rgba(248,113,113,0.5);
  z-index: 10;
  pointer-events: none;
}
.now-label {
  position: absolute;
  left: 4px;
  top: -9px;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--danger);
  background: var(--bg-2);
  padding: 1px 5px;
  border-radius: 4px;
}

/* Time block */
.time-block {
  position: absolute;
  left: 8px;
  right: 8px;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 4px 8px;
  cursor: pointer;
  z-index: 5;
  transition: opacity 0.2s, transform 0.15s;
  overflow: hidden;
}
.time-block:hover { transform: translateX(2px); }

.block-inner { flex: 1; min-width: 0; }
.block-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.block-title.done { text-decoration: line-through; opacity: 0.6; }
.block-meta {
  font-size: 0.62rem;
  color: rgba(255,255,255,0.7);
  margin-top: 1px;
}
.block-area { font-weight: 700; }

.block-actions {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.time-block:hover .block-actions { opacity: 1; }

.baction {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 0;
  background: rgba(0,0,0,0.35);
  color: #fff;
  font-size: 0.68rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.1s;
}
.baction-done:hover  { background: rgba(52,211,153,0.7); }
.baction-undo:hover  { background: rgba(251,191,36,0.7); }
.baction-edit:hover  { background: rgba(124,109,245,0.7); }
.baction-del:hover   { background: rgba(248,113,113,0.6); }

/* click hint */
.click-hint {
  position: sticky;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  font-size: 0.7rem;
  color: var(--muted);
  pointer-events: none;
  opacity: 0.5;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 20px;
}
.modal-panel {
  width: min(520px, 100%);
  background: var(--bg-2);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  overflow: hidden;
  animation: fadeUp 0.2s ease;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--line);
}
.modal-header h2 { margin: 0; font-size: 1rem; }
.modal-body { padding: 18px 22px; display: grid; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.time-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}
.time-inputs input { width: 56px; text-align: center; }
.time-inputs span { color: var(--muted); font-weight: 700; }

select {
  width: 100%;
  border: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--ink);
}

/* Area chips */
.area-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.area-chip {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.area-chip.active {
  border-color: var(--chip-color);
  color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 15%, transparent);
}
.area-chip:hover {
  border-color: var(--chip-color, var(--primary));
  color: var(--chip-color, var(--primary-2));
}
</style>
