<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, Task } from '../api';

const tasks = ref<Task[]>([]);

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

function isOverdue(task: Task) {
  return task.dueDate && !task.completedAt && new Date(task.dueDate) < new Date();
}

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
  await api<Task>(`/life/tasks/${task.id}/toggle`, { method: 'PATCH' });
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
              :class="['check-row', { completing: completing.has(task.id) }]"
              @click.prevent="toggle(task)"
            >
              <input type="checkbox" :checked="!!task.completedAt" readonly />
              <span :class="{ 'done-text': task.completedAt }" style="flex:1">{{ task.title }}</span>
              <span v-if="fmtDue(task.dueDate)" class="due-tag" :style="{ color: fmtDue(task.dueDate)!.color }">
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
</style>
