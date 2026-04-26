<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { ref } from 'vue';
import { useSessionStore } from './stores/session';

const session = useSessionStore();
const router = useRouter();
const toasts = ref<Array<{ id: number; text: string; type: 'success' | 'error' }>>([]);
let toastId = 0;

function logout() {
  session.logout();
  router.push('/auth');
}

const navItems = [
  { to: '/',          icon: '✦',  label: 'Input'    },
  { to: '/today',     icon: '☀',  label: 'Today'    },
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
  <div class="app-shell" :class="{ 'no-sidebar': !session.token }">
    <aside v-if="session.token" class="sidebar">
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
      <button class="ghost" type="button" @click="logout">
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
  </div>
</template>
