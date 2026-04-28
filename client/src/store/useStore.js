import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const CATEGORY_COLORS = {
  work:          '#3B82F6',
  health:        '#22C55E',
  learning:      '#A855F7',
  relationships: '#F97316',
  admin:         '#6B7280',
  personal:      '#EC4899',
  sleep:         '#1E293B',
};

export const useStore = create(
  persist(
    (set, get) => ({
      /* ── Persisted State ─────────────────────────────── */
      user:  null,
      token: null,
      theme: 'dark',

      /* ── Session State ───────────────────────────────── */
      todayPlan:        null,
      activeBlock:      null,
      showCheckinModal: false,
      completingBlock:  null,

      /* ── Auth Actions ────────────────────────────────── */
      setUser(user) {
        set({ user });
      },

      setToken(token) {
        set({ token });
      },

      logout() {
        set({
          user:             null,
          token:            null,
          todayPlan:        null,
          activeBlock:      null,
          showCheckinModal: false,
          completingBlock:  null,
        });
        localStorage.removeItem('life-os-store');
        window.location.href = '/login';
      },

      /* ── Theme Actions ───────────────────────────────── */
      initTheme() {
        const saved = localStorage.getItem('life-os-theme') || 'dark';
        set({ theme: saved });
        document.documentElement.setAttribute('data-theme', saved);
      },

      toggleTheme() {
        const current = get().theme;
        const next = current === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        localStorage.setItem('life-os-theme', next);
        document.documentElement.setAttribute('data-theme', next);
      },

      /* ── Plan Actions ────────────────────────────────── */
      setTodayPlan(plan, blocks) {
        set({ todayPlan: { plan, blocks } });
      },

      updateBlock(id, changes) {
        const { todayPlan } = get();
        if (!todayPlan) return;
        set({
          todayPlan: {
            ...todayPlan,
            blocks: todayPlan.blocks.map((b) =>
              b.id === id ? { ...b, ...changes } : b
            ),
          },
        });
      },

      setBlocks(blocks) {
        const { todayPlan } = get();
        if (!todayPlan) return;
        set({ todayPlan: { ...todayPlan, blocks } });
      },

      /* ── Check-in Actions ────────────────────────────── */
      triggerCheckin(block) {
        set({ showCheckinModal: true, completingBlock: block });
      },

      dismissCheckin() {
        set({ showCheckinModal: false, completingBlock: null });
      },
    }),
    {
      name: 'life-os-store',
      partialize: (state) => ({
        user:  state.user,
        token: state.token,
        theme: state.theme,
      }),
    }
  )
);
