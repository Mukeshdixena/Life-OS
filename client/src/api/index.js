import axios from 'axios';

/* ── Axios Instance ──────────────────────────────────────── */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
});

/* ── Request Interceptor: attach Bearer token ────────────── */
api.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem('life-os-store');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response Interceptor: handle 401 ───────────────────── */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('life-os-store');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/* ── Auth ────────────────────────────────────────────────── */
export const auth = {
  login(email, password) {
    return api.post('/api/auth/login', { email, password });
  },
  register(name, email, password) {
    return api.post('/api/auth/register', { name, email, password });
  },
};

/* ── Plan ────────────────────────────────────────────────── */
export const plan = {
  generate(data) {
    return api.post('/api/plan/generate', data);
  },
  confirm(data) {
    return api.post('/api/plan/confirm', data);
  },
  getToday() {
    return api.get('/api/plan/today');
  },
  updateBlock(id, data) {
    return api.put(`/api/plan/blocks/${id}`, data);
  },
  createBlock(data) {
    return api.post('/api/plan/blocks', data);
  },
};

/* ── Check-ins ───────────────────────────────────────────── */
export const checkins = {
  submit(data) {
    return api.post('/api/checkins', data);
  },
};

/* ── Dashboard ───────────────────────────────────────────── */
export const dashboard = {
  getStats(range) {
    return api.get('/api/dashboard/stats', { params: { range } });
  },
  getHistory(page) {
    return api.get('/api/dashboard/history', { params: { page } });
  },
  getDayDetail(date) {
    return api.get(`/api/dashboard/day/${date}`);
  },
};

/* ── Settings ────────────────────────────────────────────── */
export const settings = {
  getSettings() {
    return api.get('/api/settings');
  },
  updateSettings(data) {
    return api.put('/api/settings', data);
  },
  getHabits() {
    return api.get('/api/settings/habits');
  },
  saveHabit(data) {
    return api.post('/api/settings/habits', data);
  },
  updateHabit(id, data) {
    return api.put(`/api/settings/habits/${id}`, data);
  },
  deleteHabit(id) {
    return api.delete(`/api/settings/habits/${id}`);
  },
  getHabitLogs(date) {
    return api.get('/api/settings/habits/logs', { params: { date } });
  },
  logHabit(data) {
    return api.post('/api/settings/habits/logs', data);
  },
  deleteAccount() {
    return api.delete('/api/settings/account');
  },
};

export default api;
