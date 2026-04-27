<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api, Task, TimeBlock, Routine } from '../api';

// ── State ──────────────────────────────────────────────────────────────────
const blocks = ref<TimeBlock[]>([]);
const tasks  = ref<Task[]>([]);
const routines = ref<Routine[]>([]);
const today  = ref(fmtDate(new Date()));
const now    = ref(new Date());
const saving = ref(false);
const magicPlanning = ref(false);
const magicPrompt = ref('');
const error  = ref('');
const showModal = ref(false);
const editTarget = ref<TimeBlock | null>(null);
const timelineRef = ref<HTMLElement | null>(null);

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
  const isDeviation = b.note?.startsWith('Deviation:');
  const color = isDeviation ? '#ef4444' : (AREA_COLORS[b.lifeArea] ?? '#7c6df5');
  
  return {
    top: `${top}px`,
    height: `${h}px`,
    background: b.completedAt
      ? `repeating-linear-gradient(45deg,${color}33,${color}33 4px,${color}18 4px,${color}18 8px)`
      : isDeviation
      ? `linear-gradient(135deg,${color}44,${color}22)`
      : `linear-gradient(135deg,${color}cc,${color}88)`,
    borderLeft: `3px solid ${color}`,
    opacity: (b.completedAt || isDeviation) ? '0.65' : '1',
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
  [blocks.value, tasks.value, routines.value] = await Promise.all([
    api<TimeBlock[]>(`/life/timeblocks?date=${today.value}`),
    api<Task[]>('/life/today'),
    api<Routine[]>('/life/routines'),
  ]);
}

// ── Actions ──────────────────────────────────────────────────────────────────
async function runMagicPlan() {
  if (!magicPrompt.value.trim()) magicPrompt.value = 'Optimize my day';
  magicPlanning.value = true;
  try {
    await api('/life/magic-plan', { 
      method: 'POST', 
      body: JSON.stringify({ prompt: magicPrompt.value, date: today.value }) 
    });
    magicPrompt.value = '';
    await load();
  } catch (e: any) {
    error.value = e.message;
  } finally {
    magicPlanning.value = false;
  }
}

async function useRoutine(name: string) {
  if (!confirm(`Apply "${name}" routine? This will clear current blocks for ${today.value}.`)) return;
  try {
    await api('/life/routines/apply', { 
      method: 'POST', 
      body: JSON.stringify({ name, date: today.value }) 
    });
    await load();
  } catch (e: any) {
    error.value = e.message;
  }
}

async function saveCurrentAsRoutine(name: string) {
  if (!blocks.value.length) return;
  if (!confirm(`Save current day's plan as "${name}"? This will overwrite the existing "${name}" routine.`)) return;
  try {
    await api('/life/routines', { 
      method: 'POST', 
      body: JSON.stringify({ name, blocks: blocks.value }) 
    });
    await load();
    alert(`Successfully saved as "${name}"`);
  } catch (e: any) {
    error.value = e.message;
  }
}

function promptSaveRoutine() {
  const name = window.prompt('Routine Name?', 'My Routine');
  if (name) {
    saveCurrentAsRoutine(name);
  }
}

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

function scrollToNow() {
  if (!timelineRef.value) return;
  const top = nowLineTop();
  // scroll so that 'now' is a bit below the top of the view
  timelineRef.value.scrollTo({ top: Math.max(0, top - 150), behavior: 'smooth' });
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function prevDay() { const d = new Date(today.value); d.setDate(d.getDate() - 1); today.value = fmtDate(d); load(); }
function nextDay() { const d = new Date(today.value); d.setDate(d.getDate() + 1); today.value = fmtDate(d); load(); }
function goToToday() { today.value = fmtDate(new Date()); load().then(() => setTimeout(scrollToNow, 100)); }
const isToday = computed(() => today.value === fmtDate(new Date()));

// ── Clock ────────────────────────────────────────────────────────────────────
let ticker: ReturnType<typeof setInterval>;
onMounted(() => { 
  load().then(() => setTimeout(scrollToNow, 300));
  ticker = setInterval(() => { now.value = new Date(); }, 30000); 
});
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
    <div class="date-nav panel glass">
      <button class="btn-icon" @click="prevDay">‹</button>
      <span class="date-label">
        {{ new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' }) }}
        <button v-if="!isToday" class="today-chip" @click="goToToday">Back to Today</button>
      </span>
      <button class="btn-icon" @click="nextDay">›</button>
      <button class="primary add-btn" @click="openAdd()">＋ Add Block</button>
    </div>

    <!-- Magic Planner Bar -->
    <div class="magic-planner-bar">
      <div class="magic-input-wrap">
        <span class="magic-icon">🪄</span>
        <input 
          v-model="magicPrompt" 
          type="text" 
          placeholder="E.g., 'Plan my afternoon with deep work'..." 
          @keyup.enter="runMagicPlan"
        />
        <button class="magic-btn" :disabled="magicPlanning" @click="runMagicPlan">
          {{ magicPlanning ? 'Planning...' : 'Generate' }}
        </button>
      </div>
      <div class="routine-actions">
        <span class="routine-label">Routines:</span>
        <div v-for="r in routines" :key="r.id" class="routine-group">
          <button 
            class="btn-ghost-small" 
            title="Load this routine"
            @click="useRoutine(r.name)"
          >{{ r.name }}</button>
          <button 
            class="btn-icon-tiny" 
            title="Overwrite with current plan"
            @click="saveCurrentAsRoutine(r.name)"
          >💾</button>
        </div>
        <button 
          class="btn-ghost-small" 
          style="border-style: dashed; margin-left: 4px;"
          @click="promptSaveRoutine"
        >＋ Save Current</button>
      </div>
    </div>

    <!-- Timeline -->
    <div class="timeline-wrap" ref="timelineRef">
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
            <div class="block-title" :class="{ done: b.completedAt, 'text-danger': b.note?.startsWith('Deviation:') }">
               {{ b.title }} 
               <span v-if="b.note?.startsWith('Deviation:')" style="font-size: 0.6rem; background: #ef4444; color: white; padding: 2px 4px; border-radius: 4px; margin-left: 4px;">DEVIATION</span>
            </div>
            <div class="block-meta">
              {{ minToHHMM(b.startMinutes) }} · {{ b.durationMins }}m ·
              <span class="block-area">{{ b.lifeArea }}</span>
            </div>
            <div v-if="b.note?.startsWith('Deviation:')" style="font-size: 0.65rem; color: #fca5a5; margin-top: 4px; white-space: normal; line-height: 1.2;">
              ↳ {{ b.note.replace('Deviation: ', '') }}
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
.time-page { max-width: 900px; display: flex; flex-direction: column; gap: 20px; }

.glass {
  background: var(--glass);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px var(--surface-3);
}

/* Stats */
.stats-grid .stat {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  transition: transform 0.2s;
}
.stats-grid .stat:hover { transform: translateY(-2px); border-color: rgba(124,109,245,0.3); }

/* Date nav */
.date-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
}
.date-label {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
}
.today-chip {
  background: rgba(124,109,245,0.2);
  color: var(--primary-2);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(124,109,245,0.4);
  cursor: pointer;
  transition: all 0.2s;
}
.today-chip:hover { background: rgba(124,109,245,0.3); }
.add-btn { padding: 10px 20px; font-size: 0.9rem; margin-left: auto; font-weight: 800; letter-spacing: 0.5px; }

/* Magic Planner Bar */
.magic-planner-bar {
  background: var(--surface-2);
  border: 1px solid var(--primary-glow);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: inset 0 0 20px var(--primary-glow);
}

.magic-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-3);
  border: 1px solid var(--primary-glow);
  border-radius: 8px;
  padding: 6px 8px 6px 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.magic-input-wrap:focus-within {
  border-color: #a78bfa;
  box-shadow: 0 0 10px rgba(167, 139, 250, 0.2);
}

.magic-icon { font-size: 1.2rem; filter: drop-shadow(0 0 5px rgba(167,139,250,0.5)); }
.magic-input-wrap input {
  flex: 1;
  background: transparent;
  border: 0;
  color: #34d399;
  font-size: 0.95rem;
  font-family: 'Consolas', monospace;
  outline: none;
}
.magic-input-wrap input::placeholder { color: rgba(52,211,153,0.3); }

.magic-btn {
  background: linear-gradient(135deg, #a78bfa, #7c3aed);
  color: white;
  border: 0;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
  
  letter-spacing: 0.05em;
}
.magic-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5); }
.magic-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.routine-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.routine-group {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--surface);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--line);
}
.routine-group .btn-ghost-small { border: 0; }
.btn-icon-tiny {
  background: transparent; border: 0; cursor: pointer; font-size: 0.75rem;
  padding: 4px; border-radius: 6px; transition: background 0.2s;
}
.btn-icon-tiny:hover { background: rgba(255,255,255,0.1); }
.routine-label { font-size: 0.75rem; font-weight: 800; color: var(--muted);  letter-spacing: 0.5px; }

.btn-ghost-small {
  background: transparent; border: 1px solid var(--line); color: var(--ink);
  font-size: 0.75rem; padding: 4px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-weight: 600;
}
.btn-ghost-small:hover { background: rgba(255,255,255,0.1); border-color: var(--primary); color: var(--primary-2); }

/* Timeline container */
.timeline-wrap {
  display: flex;
  gap: 0;
  position: relative;
  border: 1px solid var(--primary-glow);
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg-2);
  backdrop-filter: blur(16px);
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: inset 0 0 50px var(--surface-3), 0 8px 32px var(--surface-2);
}

/* Scrollbar specifically for timeline */
.timeline-wrap::-webkit-scrollbar { width: 8px; }
.timeline-wrap::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-left: 1px solid var(--line); }
.timeline-wrap::-webkit-scrollbar-thumb { background: rgba(124,109,245,0.4); border-radius: 4px; }
.timeline-wrap::-webkit-scrollbar-thumb:hover { background: rgba(124,109,245,0.6); }

.hour-labels {
  width: 60px;
  flex-shrink: 0;
  position: relative;
  background: var(--surface-2);
  border-right: 1px solid var(--primary-glow);
}
.hour-label {
  position: absolute;
  right: 12px;
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--muted);
  transform: translateY(-50%);
  white-space: nowrap;
  letter-spacing: 1px;
}

.timeline-grid {
  flex: 1;
  position: relative;
  cursor: crosshair;
  background-image: 
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 100% 24px, 24px 100%;
}

.hour-line {
  position: absolute;
  left: 0; right: 0;
  height: 1px;
  background: rgba(124,109,245,0.15);
  pointer-events: none;
}
.minor-line {
  position: absolute;
  left: 0; right: 0;
  height: 1px;
  background: rgba(255,255,255,0.03);
  pointer-events: none;
}

/* Laser Scanning Line */
.now-line {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: #f43f5e;
  box-shadow: 0 0 15px #f43f5e, 0 0 5px #f43f5e;
  z-index: 10;
  pointer-events: none;
}
.now-line::after {
  content: '';
  position: absolute;
  top: -20px; left: 0; right: 0; height: 20px;
  background: linear-gradient(to top, rgba(244, 63, 94, 0.2), transparent);
  pointer-events: none;
}

.now-label {
  position: absolute;
  left: 8px;
  top: -12px;
  font-size: 0.65rem;
  font-weight: 800;
  color: #fff;
  background: #f43f5e;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  box-shadow: 0 0 10px rgba(244,63,94,0.5);
}

/* Premium Time block */
.time-block {
  position: absolute;
  left: 12px;
  right: 12px;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 6px 12px;
  cursor: pointer;
  z-index: 5;
  transition: all 0.2s ease;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.time-block:hover { 
  transform: translateX(4px) scale(1.01); 
  filter: brightness(1.2);
  z-index: 6;
  box-shadow: 0 8px 20px rgba(0,0,0,0.4);
}

.block-inner { flex: 1; min-width: 0; }
.block-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.block-title.done { text-decoration: line-through; opacity: 0.5; }
.block-meta {
  font-size: 0.68rem;
  color: rgba(255,255,255,0.8);
  margin-top: 3px;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.block-area { font-weight: 800;  background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; }

.block-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
  background: var(--surface-3);
  padding: 4px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}
.time-block:hover .block-actions { opacity: 1; }

.baction {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 0;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s;
}
.baction:hover { transform: scale(1.1); }
.baction-done:hover  { background: var(--success); box-shadow: 0 0 10px var(--success); }
.baction-undo:hover  { background: var(--warn); box-shadow: 0 0 10px var(--warn); }
.baction-edit:hover  { background: var(--primary); box-shadow: 0 0 10px var(--primary); }
.baction-del:hover   { background: var(--danger); box-shadow: 0 0 10px var(--danger); }

/* click hint */
.click-hint {
  position: sticky;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
  
  color: var(--primary-2);
  background: rgba(0,0,0,0.6);
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid rgba(124,109,245,0.3);
  pointer-events: none;
  opacity: 0.5;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--surface-3);
  backdrop-filter: blur(8px);
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 20px;
}
.modal-panel {
  width: min(520px, 100%);
  background: var(--bg-2);
  border: 1px solid var(--primary);
  border-radius: 16px;
  overflow: hidden;
  animation: fadeUp 0.2s ease;
  box-shadow: 0 0 40px rgba(124,109,245,0.2);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(124,109,245,0.3);
  background: rgba(124,109,245,0.05);
}
.modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--primary-2);  letter-spacing: 1px; }
.modal-body { padding: 22px; display: grid; gap: 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.time-inputs { display: flex; align-items: center; gap: 6px; }
.time-inputs input { width: 64px; text-align: center; font-size: 1rem; font-weight: 700; background: var(--surface-2); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; }
.time-inputs span { color: var(--muted); font-weight: 800; }

select {
  width: 100%;
  border: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: 8px;
  padding: 12px;
  color: var(--ink);
  font-weight: 600;
}
select:focus { border-color: var(--primary); outline: none; }

/* Area chips */
.area-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.area-chip {
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--muted);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
}
.area-chip.active {
  border-color: var(--chip-color);
  color: #fff;
  background: var(--chip-color);
  box-shadow: 0 0 15px color-mix(in srgb, var(--chip-color) 50%, transparent);
}
.area-chip:hover:not(.active) {
  border-color: var(--chip-color, var(--primary));
  color: var(--chip-color, var(--primary-2));
  background: rgba(255,255,255,0.05);
}
</style>
