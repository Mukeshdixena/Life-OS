<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';

const session = useSessionStore();
const router  = useRouter();

const mode     = ref<'login' | 'register'>('login');
const name     = ref('');
const email    = ref('');
const password = ref('');
const loading  = ref(false);
const error    = ref('');

async function submit() {
  error.value   = '';
  loading.value = true;
  try {
    await session.login(email.value, password.value, name.value, mode.value);
    router.push('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-panel">
      <div class="auth-brand">
        <span class="brand-mark">L</span>
        <span style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.3rem">Life OS</span>
      </div>
      <p class="muted" style="margin-top:-4px; font-size:0.88rem">Your personal operating system.</p>

      <div class="segmented">
        <button :class="{ active: mode === 'login' }"    @click="mode = 'login'">Sign in</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Create account</button>
      </div>

      <form @submit.prevent="submit" style="display:grid; gap:14px">
        <label v-if="mode === 'register'">
          Name
          <input v-model="name" type="text" placeholder="Your name" autocomplete="name" />
        </label>
        <label>
          Email
          <input v-model="email" type="email" placeholder="you@example.com" required autocomplete="email" />
        </label>
        <label>
          Password
          <input v-model="password" type="password" placeholder="········" required autocomplete="current-password" />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary" type="submit" :disabled="loading">
          {{ loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account' }}
        </button>
      </form>
    </div>
  </div>
</template>
