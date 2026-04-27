<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, Task } from '../api';

// ── Behavior Trigger ────────────────────────────────────────────────────────
const focusTrigger = ref(localStorage.getItem('life-os-focus-time') ?? '');
const triggerSaved = ref(false);

function saveTrigger() {
  if (!focusTrigger.value) return;
  localStorage.setItem('life-os-focus-time', focusTrigger.value);
  localStorage.removeItem('life-os-trigger-date');
  triggerSaved.value = true;
  setTimeout(() => { triggerSaved.value = false; }, 1800);
}

function clearTrigger() {
  focusTrigger.value = '';
  localStorage.removeItem('life-os-focus-time');
  localStorage.removeItem('life-os-trigger-date');
}
// ────────────────────────────────────────────────────────────────────────────

const router = useRouter();
const tasks = ref<Task[]>([]);
const rewardId = ref<string | null>(null);

const groups = computed(() => ({
  HIGH:   tasks.value.filter(t => t.importance === 'HIGH'),
  MEDIUM: tasks.value.filter(t => t.importance === 'MEDIUM'),
  LOW:    tasks.value.filter(t => t.importance === 'LOW'),
}));

const groupMeta: Record<string, { icon: string; color: string }> = {
  HIGH:   { icon: '🔴', color: 'var(--danger)' },
  MEDIUM: { icon: '🟡', color: 'var(--warn)' },
  LOW:    { icon: '⚪', color: 'var(--muted)' },
};

const completing = ref<Set<string>>(new Set());

const incompleteTasks = computed(() => tasks.value.filter(t => !t.completedAt));

function fmtDue(date?: string | null) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0)  return { label: 'Overdue', color: 'var(--danger)' };
  if (diff === 0) return { label: 'Today',  color: 'var(--warn)' };
  if (diff === 1) return { label: 'Tomorrow', color: 'var(--primary-2)' };
  return { label: `In ${diff}d`, color: 'var(--muted)' };
}

const totalTasks = computed(() => tasks.value.length);
const doneTasks  = computed(() => tasks.value.filter(t => t.completedAt).length);

async function load() {
  tasks.value = await api<Task[]>('/life/today');
}

async function toggle(task: Task) {
  completing.value.add(task.id);
  const wasIncomplete = !task.completedAt;
  await api<Task>(`/life/tasks/${task.id}/toggle`, { method: 'PATCH' });
  if (wasIncomplete) {
    rewardId.value = task.id;
    setTimeout(() => { rewardId.value = null; }, 1200);
  }
  await load();
  completing.value.delete(task.id);
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <p class="eyebrow">☀ Execution</p>
      <h1>Today</h1>
      <p v-if="totalTasks" class="muted" style="margin-top:8px">
        {{ doneTasks }} / {{ totalTasks }} tasks done
        <span class="mini-bar">
          <span :style="{ width: (doneTasks / totalTasks * 100) + '%' }"></span>
        </span>
      </p>
    </div>

    <div v-if="incompleteTasks.length" class="focus-cta">
      <div class="focus-cta-text">
        <strong>{{ incompleteTasks.length }} task{{ incompleteTasks.length !== 1 ? 's' : '' }} left</strong>
        <span class="muted">— eliminate distractions and lock in</span>
      </div>
      <button class="primary focus-start-btn" @click="router.push('/focus')">
        ⚡ Start Focus Session →
      </button>
    </div>

    <div class="stack">
      <template v-for="(items, label) in groups" :key="label">
        <section v-if="items.length" class="panel group-panel" :style="{ '--grp-color': groupMeta[label].color }">
          <h2 class="group-heading">
            <span>{{ groupMeta[label].icon }}</span>
            {{ label }} PRIORITY
          </h2>
          <div>
            <label
              v-for="task in items"
              :key="task.id"
              :class="['check-row', { completing: completing.has(task.id), rewarding: rewardId === task.id }]"
              @click.prevent="toggle(task)"
            >
              <input type="checkbox" :checked="!!task.completedAt" readonly />
              <span :class="{ 'done-text': task.completedAt }" style="flex:1">{{ task.title }}</span>
              <span v-if="rewardId === task.id" class="xp-pop">+10 XP</span>
              <span v-else-if="fmtDue(task.dueDate)" class="due-tag" :style="{ color: fmtDue(task.dueDate)!.color }">
                {{ fmtDue(task.dueDate)!.label }}
              </span>
            </label>
          </div>
        </section>
      </template>

      <div v-if="!totalTasks" class="empty-state">
        <span class="empty-icon">☀</span>
        <p>No tasks yet — tell the Input page what you need to do</p>
      </div>
    </div>

    <!-- Behavior trigger setter -->
    <div class="trigger-setter panel">
      <div class="trigger-setter-left">
        <span class="trigger-setter-icon">⏰</span>
        <div>
          <p class="trigger-setter-title">Daily Focus Trigger</p>
          <p class="trigger-setter-sub muted">Get a reminder to start focusing at a fixed time every day</p>
        </div>
      </div>
      <div class="trigger-setter-right">
        <input type="time" v-model="focusTrigger" class="time-input" />
        <button
          class="primary"
          style="padding: 8px 16px; font-size: 0.85rem;"
          :disabled="!focusTrigger"
          @click="saveTrigger"
        >
          {{ triggerSaved ? '✓ Saved' : 'Set' }}
        </button>
        <button
          v-if="focusTrigger"
          class="btn-ghost"
          style="padding: 8px 12px; font-size: 0.85rem;"
          @click="clearTrigger"
        >
          Clear
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.group-panel { border-left: 3px solid var(--grp-color); }
.group-heading { display: flex; align-items: center; gap: 8px; color: var(--grp-color); font-size: 0.75rem; letter-spacing: 0.08em; margin-bottom: 8px; }
.completing { opacity: 0.5; pointer-events: none; }
.due-tag { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.05); }

.mini-bar {
  display: inline-block;
  vertical-align: middle;
  width: 80px;
  height: 4px;
  border-radius: 999px;
  background: var(--surface-3);
  margin-left: 10px;
  position: relative;
  overflow: hidden;
}
.mini-bar span {
  position: absolute; top: 0; left: 0; height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--primary-2));
  border-radius: 999px;
  transition: width 0.5s ease;
}

.focus-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: linear-gradient(135deg, rgba(124,109,245,0.1), rgba(157,145,247,0.06));
  border: 1px solid rgba(124,109,245,0.25);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 4px;
}
.focus-cta-text { display: flex; flex-direction: column; gap: 2px; }
.focus-cta-text strong { font-size: 0.95rem; }
.focus-start-btn { white-space: nowrap; }

.rewarding { background: rgba(52,211,153,0.06); }

.xp-pop {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--success);
  animation: xpPop 1.2s ease forwards;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(52,211,153,0.12);
}

@keyframes xpPop {
  0%   { opacity: 0; transform: translateY(4px) scale(0.8); }
  20%  { opacity: 1; transform: translateY(-4px) scale(1.1); }
  60%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-8px) scale(0.9); }
}

/* Trigger setter */
.trigger-setter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.trigger-setter-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trigger-setter-icon { font-size: 1.4rem; flex-shrink: 0; }

.trigger-setter-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink-2);
  margin: 0 0 2px;
}

.trigger-setter-sub { margin: 0; font-size: 0.78rem; }

.trigger-setter-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.time-input {
  border: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--ink);
  font-size: 0.88rem;
  width: auto;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.time-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
}
</style>
