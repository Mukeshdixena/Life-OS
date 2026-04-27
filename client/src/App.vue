<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useSessionStore } from './stores/session';

const session = useSessionStore();
const router = useRouter();
const route = useRoute();
const toasts = ref<Array<{ id: number; text: string; type: 'success' | 'error' }>>([]);
let toastId = 0;

const hideSidebar = computed(() => !!(route.meta as Record<string, unknown>).hideSidebar);

// ── Theme ───────────────────────────────────────────────────────────────────
const theme = ref(localStorage.getItem('life-os-theme') || 'dark');
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('life-os-theme', theme.value);
  document.documentElement.setAttribute('data-theme', theme.value);
}

// ── Behavior Trigger ────────────────────────────────────────────────────────
const triggerTime = ref<string | null>(null);
const showTrigger = ref(false);

function fmtTriggerTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function checkTrigger() {
  const stored = localStorage.getItem('life-os-focus-time');
  if (!stored || showTrigger.value) return;
  const today = new Date().toDateString();
  if (localStorage.getItem('life-os-trigger-date') === today) return;
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (current === stored) {
    triggerTime.value = stored;
    showTrigger.value = true;
    localStorage.setItem('life-os-trigger-date', today);
  }
}

function dismissTrigger() { showTrigger.value = false; }

function goFocus() {
  dismissTrigger();
  router.push('/focus');
}

let triggerInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value);
  checkTrigger(); 
  triggerInterval = setInterval(checkTrigger, 30_000); 
});
onUnmounted(() => { if (triggerInterval) clearInterval(triggerInterval); });
// ────────────────────────────────────────────────────────────────────────────

function logout() {
  session.logout();
  router.push('/auth');
}

const navItems = [
  { to: '/',          icon: '✦',  label: 'Input'    },
  { to: '/today',     icon: '☀',  label: 'Today'    },
  { to: '/focus',     icon: '⚡',  label: 'Focus'    },
  { to: '/time',      icon: '⏱',  label: 'Time'     },
  { to: '/projects',  icon: '◈',  label: 'Projects' },
  { to: '/habits',    icon: '⟳',  label: 'Habits'   },
  { to: '/progress',  icon: '◉',  label: 'Progress' },
  { to: '/calendar',  icon: '▦',  label: 'Calendar' },
  { to: '/diary',     icon: '◎',  label: 'Diary'    },
  { to: '/reports',   icon: '≋',  label: 'Reports'  },
  { to: '/guru',      icon: '✺',  label: 'Guru'     },
];
</script>

<template>
  <div class="app-shell" :class="{ 'no-sidebar': !session.token || hideSidebar }">
    <aside v-if="session.token && !hideSidebar" class="sidebar">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">L</span>
        <span>Life OS</span>
      </RouterLink>
      <nav>
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="{ 'router-link-exact-active': $route.path === item.to }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>
      <button class="ghost" type="button" @click="toggleTheme" style="margin-top: auto; margin-bottom: 8px;">
        <span>{{ theme === 'dark' ? '☀' : '🌙' }}</span> {{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}
      </button>
      <button class="ghost" type="button" @click="logout" style="margin-top: 0;">
        <span>⎋</span> Sign out
      </button>
    </aside>

    <main class="main-panel">
      <RouterView />
    </main>

    <!-- Toast container -->
    <div class="toast-container">
      <div v-for="t in toasts" :key="t.id" :class="['toast', t.type]">{{ t.text }}</div>
    </div>

    <!-- Behavior trigger banner -->
    <Transition name="trigger-slide">
      <div
        v-if="showTrigger && session.token && route.path !== '/focus'"
        class="trigger-banner"
      >
        <span class="trigger-icon">⏰</span>
        <div class="trigger-body">
          <strong>It's {{ fmtTriggerTime(triggerTime!) }} — time to focus</strong>
          <span>Your next scheduled activity is starting.</span>
        </div>
        <button class="primary trigger-cta" @click="goFocus">Let's Go →</button>
        <button class="trigger-dismiss" @click="dismissTrigger">✕</button>
      </div>
    </Transition>
  </div>
</template>

<style>
.trigger-banner {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: #1a1c25;
  border: 1px solid rgba(251,191,36,0.35);
  border-radius: 14px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,191,36,0.1);
  z-index: 800;
  max-width: 560px;
  width: calc(100vw - 48px);
}

.trigger-icon { font-size: 1.5rem; flex-shrink: 0; }

.trigger-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.trigger-body strong { font-size: 0.92rem; color: #f0f2f5; }
.trigger-body span   { font-size: 0.78rem; color: #6b7280; }

.trigger-cta { white-space: nowrap; flex-shrink: 0; padding: 8px 16px; font-size: 0.85rem; }

.trigger-dismiss {
  background: transparent;
  border: 0;
  color: #6b7280;
  font-size: 1rem;
  line-height: 1;
  padding: 4px;
  flex-shrink: 0;
  transition: color 0.15s;
}
.trigger-dismiss:hover { color: #f0f2f5; }

.trigger-slide-enter-active { transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.trigger-slide-leave-active { transition: all 0.25s ease; }
.trigger-slide-enter-from  { opacity: 0; transform: translateX(-50%) translateY(20px); }
.trigger-slide-leave-to    { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
