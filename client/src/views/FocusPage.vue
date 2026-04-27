<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, FocusTask, Subtask, Task } from '../api';

const router = useRouter();

const TOTAL_SECS = 25 * 60;
const circumference = 2 * Math.PI * 95;

const task = ref<FocusTask | null>(null);
const loading = ref(true);
const timerSecs = ref(TOTAL_SECS);
const running = ref(false);
const splitting = ref(false);
const completing = ref(false);
const showReward = ref(false);
const streak = ref(0);
const quickTask = ref<Task | null>(null);

let interval: ReturnType<typeof setInterval> | null = null;

const dashOffset = computed(() =>
  circumference * (1 - timerSecs.value / TOTAL_SECS),
);

const timerDisplay = computed(() => {
  const m = Math.floor(timerSecs.value / 60);
  const s = timerSecs.value % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const timerColor = computed(() => {
  if (timerSecs.value > 15 * 60) return '#7c6df5';
  if (timerSecs.value > 5 * 60) return '#fbbf24';
  return '#f87171';
});

const subtasksDone = computed(() =>
  task.value?.subtasks.filter(s => s.completedAt).length ?? 0,
);

async function load() {
  loading.value = true;
  try {
    task.value = await api<FocusTask | null>('/life/focus/task');
  } finally {
    loading.value = false;
  }
}

function startTimer() {
  if (running.value) return;
  running.value = true;
  interval = setInterval(() => {
    if (timerSecs.value > 0) {
      timerSecs.value--;
    } else {
      clearInterval(interval!);
      running.value = false;
    }
  }, 1000);
}

function resetTimer() {
  if (interval) clearInterval(interval);
  running.value = false;
  timerSecs.value = TOTAL_SECS;
}

async function breakDown() {
  if (!task.value || splitting.value) return;
  splitting.value = true;
  try {
    const subs = await api<Subtask[]>(`/life/tasks/${task.value.id}/split`, { method: 'POST' });
    task.value.subtasks = subs;
  } finally {
    splitting.value = false;
  }
}

async function toggleSub(sub: Subtask) {
  const updated = await api<Subtask>(`/life/subtasks/${sub.id}/toggle`, { method: 'PATCH' });
  if (task.value) {
    const idx = task.value.subtasks.findIndex(s => s.id === sub.id);
    if (idx >= 0) task.value.subtasks[idx] = updated;
  }
}

async function complete() {
  if (!task.value || completing.value) return;
  completing.value = true;
  resetTimer();
  try {
    await api(`/life/tasks/${task.value.id}/toggle`, { method: 'PATCH' });
    streak.value++;
    showReward.value = true;
    await new Promise(r => setTimeout(r, 2000));
    showReward.value = false;
    task.value = await api<FocusTask | null>('/life/focus/task');
    quickTask.value = null;
  } finally {
    completing.value = false;
  }
}

async function loadQuick() {
  quickTask.value = await api<Task | null>('/life/focus/quick');
}

onMounted(load);
onUnmounted(() => { if (interval) clearInterval(interval); });
</script>

<template>
  <div class="focus-shell">

    <!-- Loading -->
    <div v-if="loading" class="focus-center">
      <p class="muted">Loading...</p>
    </div>

    <!-- All done -->
    <div v-else-if="!task" class="focus-center focus-done">
      <div class="done-glyph">✦</div>
      <h1 class="done-title">All clear.</h1>
      <p class="muted">No tasks remaining. You showed up.</p>
      <span v-if="streak" class="streak-pill">{{ streak }} task{{ streak !== 1 ? 's' : '' }} crushed this session 🔥</span>
      <button class="primary" style="margin-top:8px" @click="router.push('/today')">← Back to Today</button>
    </div>

    <!-- Focus view -->
    <template v-else>
      <div class="focus-topbar">
        <button class="btn-ghost small" @click="router.push('/today')">← Exit</button>
        <span v-if="streak" class="streak-pill">{{ streak }} in a row 🔥</span>
      </div>

      <div class="focus-body">
        <!-- Task -->
        <div class="focus-task-area">
          <p class="focus-eyebrow">NOW FOCUS ON</p>
          <h1 class="focus-title">{{ task.title }}</h1>
          <span class="imp-pill" :class="task.importance.toLowerCase()">{{ task.importance }}</span>
        </div>

        <!-- Timer -->
        <div class="timer-area">
          <svg class="timer-ring" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="110" cy="110" r="95" stroke="rgba(255,255,255,0.06)" stroke-width="8" />
            <circle
              cx="110" cy="110" r="95"
              :stroke="timerColor"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="dashOffset"
              class="timer-arc"
            />
            <text
              x="110" y="110"
              text-anchor="middle"
              dominant-baseline="middle"
              font-family="Outfit, sans-serif"
              font-size="36"
              font-weight="800"
              :fill="timerColor"
            >{{ timerDisplay }}</text>
            <text
              x="110" y="145"
              text-anchor="middle"
              dominant-baseline="middle"
              font-family="Inter, sans-serif"
              font-size="11"
              font-weight="600"
              fill="rgba(255,255,255,0.3)"
            >{{ running ? 'FOCUS' : timerSecs === TOTAL_SECS ? '25 MIN' : 'PAUSED' }}</text>
          </svg>
          <div class="timer-btns">
            <button v-if="!running" class="primary" @click="startTimer">
              {{ timerSecs === TOTAL_SECS ? '▶  Start Timer' : '▶  Resume' }}
            </button>
            <button v-else class="btn-ghost" @click="resetTimer">Reset</button>
          </div>
        </div>

        <!-- Subtasks -->
        <div v-if="task.subtasks.length" class="subtasks-area">
          <p class="sub-label">{{ subtasksDone }}/{{ task.subtasks.length }} steps done</p>
          <div class="sub-list">
            <label
              v-for="sub in task.subtasks"
              :key="sub.id"
              class="sub-row"
              @click.prevent="toggleSub(sub)"
            >
              <span class="sub-check" :class="{ done: !!sub.completedAt }">
                {{ sub.completedAt ? '✓' : '○' }}
              </span>
              <span class="sub-name" :class="{ 'done-text': !!sub.completedAt }">{{ sub.title }}</span>
              <span class="sub-mins">{{ sub.durationMins }}m</span>
            </label>
          </div>
        </div>

        <!-- Break it down -->
        <button
          v-else
          class="btn-ghost break-btn"
          :disabled="splitting"
          @click="breakDown"
        >
          {{ splitting ? '⟳ Breaking it down...' : '⚡ Too big? Break it down' }}
        </button>

        <!-- Complete -->
        <button class="complete-btn" :disabled="completing" @click="complete">
          ✓ &nbsp;Task Done — Next →
        </button>

        <!-- Stuck -->
        <div class="stuck-area">
          <button class="stuck-btn" @click="loadQuick">
            Stuck? Start with a 2-min task first →
          </button>
          <div v-if="quickTask" class="quick-card">
            <p class="quick-label">QUICK WIN</p>
            <p class="quick-title">{{ quickTask.title }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Reward overlay -->
    <Transition name="reward">
      <div v-if="showReward" class="reward-overlay">
        <div class="reward-card">
          <div class="xp-burst">+10 XP</div>
          <p class="reward-msg">Task complete! 🎉</p>
          <span v-if="streak > 1" class="streak-pill">{{ streak }} in a row 🔥</span>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.focus-shell {
  min-height: calc(100vh - 72px);
  display: flex;
  flex-direction: column;
  max-width: 580px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* Loading / done states */
.focus-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
}

.focus-done .done-glyph { font-size: 3.5rem; opacity: 0.4; }

.done-title {
  font-family: 'Outfit', sans-serif;
  font-size: 2.8rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(120deg, var(--ink) 40%, var(--primary-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Top bar */
.focus-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 36px;
}

/* Body */
.focus-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

/* Task */
.focus-task-area {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.focus-eyebrow {
  font-family: 'Outfit', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--muted);
  margin: 0;
  
}

.focus-title {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
  background: linear-gradient(120deg, var(--ink) 40%, var(--primary-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
}

.imp-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  
  letter-spacing: 0.08em;
}
.imp-pill.high   { background: rgba(248,113,113,0.12); color: var(--danger); }
.imp-pill.medium { background: rgba(251,191,36,0.10);  color: var(--warn); }
.imp-pill.low    { background: var(--surface-2);        color: var(--muted); }

/* Timer */
.timer-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.timer-ring { width: 210px; height: 210px; }

.timer-arc {
  transition: stroke-dashoffset 1s linear, stroke 0.5s ease;
  transform: rotate(-90deg);
  transform-origin: 110px 110px;
}

.timer-btns { display: flex; gap: 10px; }

/* Subtasks */
.subtasks-area { width: 100%; }

.sub-label {
  font-size: 0.7rem;
  font-weight: 700;
  
  letter-spacing: 0.1em;
  color: var(--muted);
  margin: 0 0 10px;
  text-align: center;
}

.sub-list { display: grid; gap: 5px; }

.sub-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.sub-row:hover { background: var(--surface-2); }

.sub-check {
  font-size: 1rem;
  width: 20px;
  color: var(--muted);
  transition: color 0.2s;
  flex-shrink: 0;
}
.sub-check.done { color: var(--success); }

.sub-name { flex: 1; font-size: 0.88rem; color: var(--ink-2); }

.sub-mins {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--muted);
  flex-shrink: 0;
}

/* Break it down */
.break-btn { width: 100%; }

/* Complete */
.complete-btn {
  width: 100%;
  border: 0;
  background: linear-gradient(135deg, var(--success), #4ade80);
  color: #0a1f14;
  padding: 16px 24px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 1.05rem;
  transition: opacity 0.2s, transform 0.1s;
  box-shadow: 0 4px 24px rgba(52,211,153,0.22);
}
.complete-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.complete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Stuck */
.stuck-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.stuck-btn {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.82rem;
  cursor: pointer;
  transition: color 0.15s;
  padding: 4px 0;
}
.stuck-btn:hover { color: var(--primary-2); }

.quick-card {
  width: 100%;
  background: var(--glass);
  border: 1px solid rgba(124,109,245,0.2);
  border-radius: 10px;
  padding: 14px 18px;
  text-align: center;
  animation: fadeUp 0.2s ease;
}

.quick-label {
  font-size: 0.66rem;
  font-weight: 700;
  
  letter-spacing: 0.12em;
  color: var(--primary-2);
  margin: 0 0 6px;
}

.quick-title { font-size: 0.92rem; color: var(--ink); margin: 0; }

/* Streak pill */
.streak-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(251,191,36,0.12);
  color: var(--warn);
  font-size: 0.78rem;
  font-weight: 700;
}

/* Reward overlay */
.reward-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(13,15,20,0.75);
  backdrop-filter: blur(10px);
  z-index: 500;
}

.reward-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  animation: xpBurst 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.xp-burst {
  font-family: 'Outfit', sans-serif;
  font-size: 4.5rem;
  font-weight: 800;
  background: linear-gradient(120deg, var(--primary), var(--primary-2), var(--success));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.reward-msg { font-size: 1.2rem; font-weight: 700; color: var(--ink); margin: 0; }

@keyframes xpBurst {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}

.reward-enter-active { transition: opacity 0.25s; }
.reward-leave-active { transition: opacity 0.4s; }
.reward-enter-from, .reward-leave-to { opacity: 0; }

/* Button size variant */
.btn-ghost.small { padding: 6px 12px; font-size: 0.8rem; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
