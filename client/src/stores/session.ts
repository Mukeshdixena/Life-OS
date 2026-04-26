import { defineStore } from 'pinia';
import { api } from '../api';

type User = { id: string; email: string; name?: string | null };

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: localStorage.getItem('life-os-token'),
    user: JSON.parse(localStorage.getItem('life-os-user') ?? 'null') as User | null,
  }),
  actions: {
    async login(email: string, password: string, name?: string, mode: 'login' | 'register' = 'login') {
      const result = await api<{ token: string; user: User }>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      this.token = result.token;
      this.user = result.user;
      localStorage.setItem('life-os-token', result.token);
      localStorage.setItem('life-os-user', JSON.stringify(result.user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('life-os-token');
      localStorage.removeItem('life-os-user');
    },
  },
});

