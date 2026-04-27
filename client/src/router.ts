import { createRouter, createWebHistory } from 'vue-router';
import { useSessionStore } from './stores/session';
import AuthPage from './views/AuthPage.vue';
import CalendarPage from './views/CalendarPage.vue';
import DiaryPage from './views/DiaryPage.vue';
import FocusPage from './views/FocusPage.vue';
import GuruPage from './views/GuruPage.vue';
import HabitsPage from './views/HabitsPage.vue';
import InputPage from './views/InputPage.vue';
import ProgressPage from './views/ProgressPage.vue';
import ProjectsPage from './views/ProjectsPage.vue';
import ReportsPage from './views/ReportsPage.vue';
import TodayPage from './views/TodayPage.vue';
import TimeTrackerPage from './views/TimeTrackerPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/auth', component: AuthPage },
    { path: '/', component: InputPage },
    { path: '/today', component: TodayPage },
    { path: '/focus', component: FocusPage, meta: { hideSidebar: true } },
    { path: '/time', component: TimeTrackerPage },
    { path: '/projects', component: ProjectsPage },
    { path: '/habits', component: HabitsPage },
    { path: '/progress', component: ProgressPage },
    { path: '/calendar', component: CalendarPage },
    { path: '/diary', component: DiaryPage },
    { path: '/reports', component: ReportsPage },
    { path: '/guru', component: GuruPage },
  ],
});

router.beforeEach((to) => {
  const session = useSessionStore();
  if (!session.token && to.path !== '/auth') {
    return '/auth';
  }
  if (session.token && to.path === '/auth') {
    return '/';
  }
  return true;
});

