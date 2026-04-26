<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, Habit, Task } from '../api';

type Context = {
  timeOfDay: 'morning' | 'day' | 'evening';
  tasks: Task[];
  habits: Habit[];
  prompts: { taskChecks: Task[]; habitChecks: Habit[]; reflections: string[] };
};

const context = ref<Context | null>(null);
const text = ref('');
const mood = ref(6);
const energy = ref(6);
const loading = ref(false);
const result = ref('');
const error = ref('');
const charCount = computed(() => text.value.length);

const greetingConfig = computed(() => {
  const tod = context.value?.timeOfDay;
  if (tod === 'morning') return { label: 'Morning check-in', emoji: '🌅', color: '#f5a623' };
  if (tod === 'day')     return { label: 'Midday input',     emoji: '☀️',  color: '#38bdf8' };
  return                        { label: 'Evening reflection', emoji: '🌙', color: '#a78bfa' };
});

const moodEmoji = computed(() => {
  const m = mood.value;
  if (m <= 2) return '😔'; if (m <= 4) return '😐'; if (m <= 6) return '🙂'; if (m <= 8) return '😊'; return '🤩';
});

const energyLabel = computed(() => {
  const e = energy.value;
  if (e <= 3) return 'Low'; if (e <= 6) return 'Medium'; if (e <= 8) return 'High'; return 'Peak';
});

const completedTaskIds = ref<Set<string>>(new Set());

async function load() {
  context.value = await api<Context>('/life/context');
}

async function submit(extra = '') {
  const bodyText = [text.value, extra].filter(Boolean).join('\n');
  if (!bodyText.trim()) return;
  loading.value = true;
  error.value = '';
  result.value = '';
  try {
    const response = await api<{ meaning: { summary: string } }>('/life/input', {
      method: 'POST',
      body: JSON.stringify({ text: bodyText, mood: mood.value, energy: energy.value }),
    });
    result.value = response.meaning.summary;
    text.value = '';
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Input failed';
  } finally {
    loading.value = false;
  }
}

async function quickCompleteTask(task: Task) {
  completedTaskIds.value.add(task.id);
  await submit(`Completed task: ${task.title}`);
  setTimeout(() => completedTaskIds.value.delete(task.id), 2000);
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
}

onMounted(load);
</script>

<template>
  <section class="page input-layout">
    <div class="page-heading">
      <p class="eyebrow">{{ greetingConfig.emoji }} {{ greetingConfig.label }}</p>
      <h1>Put anything here. Life OS routes it.</h1>
    </div>

    <div class="input-grid">
      <!-- Main input surface -->
      <form class="input-surface" @submit.prevent="submit()">
        <textarea
          v-model="text"
          rows="7"
          placeholder="I studied for 2 hours, skipped gym, and need to finish my assignment tomorrow…"
          @keydown="handleKeydown"
        />

        <div class="char-hint muted">{{ charCount > 0 ? charCount + ' chars' : '⌘ + Enter to submit' }}</div>

        <div class="range-row">
          <label>
            <span>Mood {{ moodEmoji }} <strong>{{ mood }}/10</strong></span>
            <input v-model.number="mood" type="range" min="1" max="10" />
          </label>
          <label>
            <span>Energy ⚡ <strong>{{ energyLabel }}</strong></span>
            <input v-model.number="energy" type="range" min="1" max="10" />
          </label>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary" type="submit" :disabled="loading || !text.trim()">
          {{ loading ? '⏳ Routing…' : '✦ Route to Life OS' }}
        </button>

        <div v-if="result" class="result-banner">
          <span>✓</span>
          <span>{{ result }}</span>
        </div>
      </form>

      <!-- Context panel -->
      <aside class="context-panel">
        <h2>Quick responses</h2>

        <div v-if="context?.prompts.taskChecks.length" class="quick-group">
          <p class="quick-group-label">📋 Pending tasks</p>
          <button
            v-for="task in context.prompts.taskChecks"
            :key="task.id"
            type="button"
            :class="['quick-btn', { done: completedTaskIds.has(task.id) }]"
            @click="quickCompleteTask(task)"
          >
            <span>{{ completedTaskIds.has(task.id) ? '✓' : '○' }}</span>
            {{ task.title }}
          </button>
        </div>

        <div v-if="context?.prompts.habitChecks.length" class="quick-group">
          <p class="quick-group-label">⟳ Habits today</p>
          <button
            v-for="habit in context.prompts.habitChecks"
            :key="habit.id"
            type="button"
            class="quick-btn"
            @click="submit(`Completed habit: ${habit.name}`)"
          >
            <span>◯</span> {{ habit.name }}
          </button>
        </div>

        <div class="quick-group">
          <p class="quick-group-label">💭 Reflection starters</p>
          <button
            v-for="prompt in context?.prompts.reflections"
            :key="prompt"
            type="button"
            class="quick-btn"
            @click="text = prompt + ' '"
          >
            <span>→</span> {{ prompt }}
          </button>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.char-hint { font-size: 0.75rem; text-align: right; }
.result-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(52,211,153,0.08);
  border: 1px solid rgba(52,211,153,0.2);
  color: var(--success);
  font-size: 0.88rem;
  font-weight: 600;
  animation: fadeUp 0.3s ease;
}
.result-banner span:first-child { font-size: 1.1rem; }
</style>
