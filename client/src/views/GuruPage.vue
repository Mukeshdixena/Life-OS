<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { api } from '../api';

type Message = { id: string; role: string; content: string; createdAt?: string };

const messages  = ref<Message[]>([]);
const message   = ref('');
const loading   = ref(false);
const convRef   = ref<HTMLElement | null>(null);

const suggestions = [
  'What patterns do you see in my recent habits?',
  'What am I avoiding based on my tasks?',
  'Which life area deserves more attention?',
  'What would future-me thank me for doing today?',
];

async function load() {
  messages.value = await api<Message[]>('/life/guru');
  scrollBottom();
}

async function send(preset?: string) {
  const msg = preset ?? message.value.trim();
  if (!msg) return;
  message.value = '';
  loading.value = true;
  messages.value.push({ id: 'temp-user', role: 'user', content: msg });
  scrollBottom();
  try {
    await api<Message>('/life/guru', { method: 'POST', body: JSON.stringify({ message: msg }) });
    await load();
  } finally {
    loading.value = false;
    scrollBottom();
  }
}

function scrollBottom() {
  nextTick(() => {
    if (convRef.value) convRef.value.scrollTop = convRef.value.scrollHeight;
  });
}

onMounted(load);
</script>

<template>
  <section class="page guru-page">
    <div class="page-heading">
      <p class="eyebrow">✺ Reflection system</p>
      <h1>Socratic Guru</h1>
    </div>

    <!-- Conversation -->
    <div class="conversation" ref="convRef">
      <div v-if="!messages.length" class="empty-state" style="padding: 32px 0">
        <span class="empty-icon">✺</span>
        <p>Ask what your recent actions are trying to show you.</p>
        <div class="suggestions">
          <button
            v-for="s in suggestions" :key="s"
            class="quick-btn"
            @click="send(s)"
          >{{ s }}</button>
        </div>
      </div>

      <article
        v-for="item in messages"
        :key="item.id"
        :class="['bubble', item.role]"
      >{{ item.content }}</article>

      <!-- Typing indicator -->
      <div v-if="loading" class="bubble assistant typing-dots">
        <span /><span /><span />
      </div>
    </div>

    <!-- Suggestion chips (after conversation started) -->
    <div v-if="messages.length && !loading" class="suggest-row">
      <button
        v-for="s in suggestions.slice(0, 2)"
        :key="s"
        class="period-btn"
        @click="send(s)"
      >{{ s }}</button>
    </div>

    <!-- Composer -->
    <form class="composer" @submit.prevent="send()">
      <input
        v-model="message"
        placeholder="Ask the Guru something…"
        :disabled="loading"
        @keydown.enter.prevent="send()"
      />
      <button class="primary" :disabled="loading || !message.trim()">
        {{ loading ? '…' : 'Ask' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.suggestions { display: grid; gap: 8px; width: 100%; max-width: 420px; margin-top: 8px; }
.suggest-row { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 0 4px; }
.suggest-row .period-btn { font-size: 0.78rem; }
</style>
