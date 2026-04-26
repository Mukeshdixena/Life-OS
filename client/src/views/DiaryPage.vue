<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';

type Entry = { id: string; title: string; body: string; mood?: number; createdAt: string };

const entries = ref<Entry[]>([]);
const showModal = ref(false);
const newTitle = ref('');
const newBody  = ref('');
const saving   = ref(false);

function moodEmoji(m?: number): string {
  if (!m) return '📝';
  if (m <= 2) return '😔'; if (m <= 4) return '😐'; if (m <= 6) return '🙂'; if (m <= 8) return '😊'; return '🤩';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function load() {
  entries.value = await api<Entry[]>('/life/diary');
}

async function write() {
  if (!newBody.value.trim()) return;
  saving.value = true;
  await api('/life/input', {
    method: 'POST',
    body: JSON.stringify({ text: newBody.value }),
  });
  newTitle.value = '';
  newBody.value  = '';
  showModal.value = false;
  saving.value = false;
  await load();
}

onMounted(load);
</script>

<template>
  <section class="page">
    <div class="page-heading" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px">
      <div>
        <p class="eyebrow">◎ Personal memory</p>
        <h1>Diary</h1>
      </div>
      <button class="primary" @click="showModal = true">+ Write entry</button>
    </div>

    <div v-if="!entries.length" class="empty-state">
      <span class="empty-icon">◎</span>
      <p>Diary entries are created automatically when you express feelings or thoughts in Input. Or tap "Write entry".</p>
    </div>

    <div v-else class="stack">
      <article v-for="e in entries" :key="e.id" class="card diary-entry">
        <div class="diary-meta">
          <span class="mood-emoji">{{ moodEmoji(e.mood) }}</span>
          <div>
            <h2 style="margin:0">{{ e.title }}</h2>
            <span class="diary-time">{{ relativeTime(e.createdAt) }}<template v-if="e.mood"> · Mood {{ e.mood }}/10</template></span>
          </div>
        </div>
        <p class="diary-body">{{ e.body }}</p>
      </article>
    </div>

    <!-- Write modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal=false">
      <div class="modal">
        <h2>Write a diary entry</h2>
        <textarea v-model="newBody" rows="6" placeholder="What's on your mind?" style="margin-top:8px" />
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:12px">
          <button class="btn-ghost" @click="showModal=false">Cancel</button>
          <button class="primary" :disabled="saving || !newBody.trim()" @click="write">
            {{ saving ? 'Saving…' : 'Save entry' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: grid; place-items: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}
.modal {
  width: min(520px, 90vw);
  background: var(--bg-2);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  padding: 28px;
  animation: fadeUp 0.2s ease;
}
</style>
