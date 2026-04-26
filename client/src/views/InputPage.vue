<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api, Habit, Task, TimeBlock } from '../api';

type Context = {
  timeOfDay: 'morning' | 'day' | 'evening';
  tasks: Task[];
  habits: Habit[];
  prompts: { taskChecks: Task[]; habitChecks: Habit[]; reflections: string[] };
};

const context = ref<Context | null>(null);
const timeblocks = ref<TimeBlock[]>([]);
const text = ref('');
const mood = ref(6);
const energy = ref(6);
const loading = ref(false);
const result = ref('');
const error = ref('');
const charCount = computed(() => text.value.length);

const now = ref(new Date());
let ticker: ReturnType<typeof setInterval>;

// RPG Player Stats (Mocks for UI)
const playerLevel = ref(12);
const playerXP = ref(3450);
const xpNeeded = ref(5000);
const recentActions = ref<Array<{id: number, text: string, xp: number, type: string}>>([]);
let actionId = 0;

const xpProgress = computed(() => (playerXP.value / xpNeeded.value) * 100);
const healthProgress = computed(() => (mood.value / 10) * 100);
const manaProgress = computed(() => (energy.value / 10) * 100);

const completedTaskIds = ref<Set<string>>(new Set());

// Date helpers
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const todayStr = computed(() => fmtDate(now.value));
const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes());

// Find Current Mission based on time blocks
const currentMission = computed(() => {
  return timeblocks.value.find(b => {
    return nowMinutes.value >= b.startMinutes && nowMinutes.value < (b.startMinutes + b.durationMins);
  });
});

// Find Next Mission
const nextMission = computed(() => {
  const upcoming = timeblocks.value.filter(b => b.startMinutes > nowMinutes.value).sort((a,b) => a.startMinutes - b.startMinutes);
  return upcoming.length > 0 ? upcoming[0] : null;
});

// Find Unconfirmed Past Missions
const unconfirmedMissions = computed(() => {
  return timeblocks.value.filter(b => {
    const isPast = (b.startMinutes + b.durationMins) <= nowMinutes.value;
    const isUnhandled = !b.completedAt && !b.note?.startsWith('Deviation:');
    return isPast && isUnhandled;
  });
});
const activeUnconfirmed = computed(() => unconfirmedMissions.value[0]);

function formatTime(mins: number) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

async function load() {
  try {
    const [ctxRes, blocksRes] = await Promise.all([
      api<Context>('/life/context'),
      api<TimeBlock[]>(`/life/timeblocks?date=${todayStr.value}`)
    ]);
    context.value = ctxRes;
    timeblocks.value = blocksRes;
  } catch (e) {
    console.error("Failed to load dashboard data", e);
  }
}

async function submit(extra = '', xpReward = 15, actionType = 'Action') {
  const bodyText = [text.value, extra].filter(Boolean).join('\n');
  if (!bodyText.trim()) return;
  loading.value = true;
  error.value = '';
  result.value = '';
  try {
    const response = await api<{ meaning: { summary: string } }>('/life/input', {
      method: 'POST',
      body: JSON.stringify({ text: bodyText, mood: mood.value, energy: energy.value }),
    }).catch(() => ({ meaning: { summary: `Logged: ${bodyText.substring(0, 30)}...` } }));
    
    result.value = response.meaning.summary;
    text.value = '';
    
    playerXP.value += xpReward;
    if (playerXP.value >= xpNeeded.value) {
      playerLevel.value++;
      playerXP.value = playerXP.value - xpNeeded.value;
      xpNeeded.value = Math.floor(xpNeeded.value * 1.2);
    }
    
    recentActions.value.unshift({ id: actionId++, text: response.meaning.summary, xp: xpReward, type: actionType });
    if(recentActions.value.length > 4) recentActions.value.pop();

    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Action failed';
  } finally {
    loading.value = false;
  }
}

async function markMissionDone(block: TimeBlock) {
  try {
    await api(`/life/timeblocks/${block.id}/done`, { method: 'PATCH' });
    await submit(`Completed Scheduled Mission: ${block.title}`, 100, 'Mission Clear');
  } catch(e) {
    console.error(e);
  }
}

async function logDeviation(block: TimeBlock, deviationText: string) {
  try {
    await api(`/life/timeblocks/${block.id}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ note: `Deviation: ${deviationText}` }) 
    });
    await submit(`Failed Mission [${block.title}]. Deviated: ${deviationText}`, 10, 'Deviation');
  } catch(e) {
    console.error(e);
  }
}

const isRewriting = ref(false);
const rewriteForm = ref({ title: '', lifeArea: 'WORK', durationMins: 60 });

function startRewrite(block: TimeBlock) {
  rewriteForm.value = { 
    title: '', 
    lifeArea: block.lifeArea, 
    durationMins: block.durationMins 
  };
  isRewriting.value = true;
}

async function submitRewrite(block: TimeBlock) {
  try {
    // 1. Update the block with new truth
    await api(`/life/timeblocks/${block.id}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ 
        title: rewriteForm.value.title,
        lifeArea: rewriteForm.value.lifeArea,
        durationMins: rewriteForm.value.durationMins,
        note: `[Rewritten] Was originally: ${block.title}`
      }) 
    });
    // 2. Mark it done
    await api(`/life/timeblocks/${block.id}/done`, { method: 'PATCH' });
    
    await submit(`Rewrote History: Did [${rewriteForm.value.title}] instead of [${block.title}]`, 20, 'Reality Override');
    isRewriting.value = false;
  } catch(e) {
    console.error(e);
  }
}

async function quickCompleteTask(task: Task) {
  completedTaskIds.value.add(task.id);
  await submit(`Completed task: ${task.title}`, 50, 'Quest Complete');
  setTimeout(() => completedTaskIds.value.delete(task.id), 2000);
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
}

// --- Wake Up Tracker ---
const wakeupTime = ref('07:00');
const wakeupLogged = ref(false);

function checkWakeup() {
  const logged = localStorage.getItem(`wakeup_${todayStr.value}`);
  if (logged) {
    wakeupLogged.value = true;
    wakeupTime.value = logged;
  }
}

async function logWakeup() {
  if (!wakeupTime.value) return;
  await submit(`Woke up at ${wakeupTime.value}`, 20, 'Morning Protocol');
  localStorage.setItem(`wakeup_${todayStr.value}`, wakeupTime.value);
  wakeupLogged.value = true;
}

// --- Vice / Bad Habit Tracker ---
const viceName = ref('');
const viceDuration = ref<number | null>(null);

async function confessVice() {
  if (!viceName.value || !viceDuration.value) return;
  
  const name = viceName.value;
  const duration = viceDuration.value;
  
  // Deal damage to player stats
  mood.value = Math.max(1, mood.value - 2); // Takes 20% HP damage
  
  // Retroactively add this to the time tracker so it visually eats their day
  const startMins = Math.max(0, nowMinutes.value - duration);
  try {
    await api('/life/timeblocks', {
      method: 'POST',
      body: JSON.stringify({
        title: `[Vice] ${name}`,
        lifeArea: 'MINDFULNESS',
        date: todayStr.value,
        startMinutes: startMins,
        durationMins: duration,
        note: 'Deviation: Logged as a Vice',
        completedAt: new Date().toISOString()
      })
    });
  } catch(e) { console.error("Failed to log vice block", e); }
  
  // Submit the log and apply negative XP
  await submit(`Confessed Vice: [${name}] for ${duration} mins. Took HP Damage.`, -15, 'Vice Confession');
  
  viceName.value = '';
  viceDuration.value = null;
  await load();
}

onMounted(() => {
  load();
  checkWakeup();
  ticker = setInterval(() => { now.value = new Date(); }, 15000);
});

onUnmounted(() => clearInterval(ticker));
</script>

<template>
  <section class="page rpg-layout">
    
    <!-- Player HUD -->
    <div class="player-hud panel glass">
      <div class="avatar-section">
        <div class="avatar-ring" :class="{'damage-flash': mood < 5}">
          <img :src="'/life_os_avatar.png'" alt="Avatar" class="avatar-img" @error="$event.target.src='https://api.dicebear.com/7.x/bottts/svg?seed=LifeOS&backgroundColor=13161e'" />
        </div>
        <div class="player-info">
          <h2>Hero</h2>
          <div class="level-badge">Lv {{ playerLevel }}</div>
        </div>
      </div>
      
      <div class="stats-bars">
        <div class="stat-bar-group">
          <div class="bar-labels">
            <span class="bar-name">XP</span>
            <span class="bar-val">{{ playerXP }} / {{ xpNeeded }}</span>
          </div>
          <div class="bar-bg xp-bg">
            <div class="bar-fill xp-fill" :style="{ width: xpProgress + '%' }"></div>
          </div>
        </div>

        <div class="stat-bar-group">
          <div class="bar-labels">
            <span class="bar-name">HP (Mood)</span>
            <span class="bar-val">{{ mood * 10 }} / 100</span>
          </div>
          <div class="bar-bg hp-bg">
            <div class="bar-fill hp-fill" :style="{ width: healthProgress + '%' }"></div>
          </div>
          <input class="invisible-range" v-model.number="mood" type="range" min="1" max="10" />
        </div>

        <div class="stat-bar-group">
          <div class="bar-labels">
            <span class="bar-name">MP (Energy)</span>
            <span class="bar-val">{{ energy * 10 }} / 100</span>
          </div>
          <div class="bar-bg mp-bg">
            <div class="bar-fill mp-fill" :style="{ width: manaProgress + '%' }"></div>
          </div>
          <input class="invisible-range" v-model.number="energy" type="range" min="1" max="10" />
        </div>
      </div>
    </div>

    <!-- MISSION CONTROL HEADER -->
    <div class="mission-control panel glass">
      
      <!-- Unconfirmed Past Mission (Highest Priority to Clear) -->
      <div v-if="activeUnconfirmed" class="active-mission unconfirmed-report">
        <div class="mission-status pulse-text text-warn">⚠️ AFTER ACTION REPORT REQUIRED</div>
        <p class="mission-prompt">You had a scheduled mission in the past that was not confirmed.</p>
        <h1 class="mission-title">{{ activeUnconfirmed.title }}</h1>
        <div class="mission-meta">
          <span>⏰ {{ formatTime(activeUnconfirmed.startMinutes) }} - {{ formatTime(activeUnconfirmed.startMinutes + activeUnconfirmed.durationMins) }}</span>
          <span class="badge" :class="'badge-' + activeUnconfirmed.lifeArea.toLowerCase()">{{ activeUnconfirmed.lifeArea }}</span>
        </div>
        
        <div v-if="!isRewriting" class="mission-prompt">Did you actually do this as planned?</div>
        
        <div v-if="!isRewriting" class="mission-actions" style="flex-wrap: wrap;">
           <button class="primary action-btn large-btn" @click="markMissionDone(activeUnconfirmed)">
             YES, I COMPLETED IT ✓
           </button>
           <button class="btn-ghost large-btn text-danger" @click="logDeviation(activeUnconfirmed, prompt('What did you do instead?', '') || 'Unknown Deviation')">
             NO, I WAS DISTRACTED ✕
           </button>
           <button class="btn-ghost large-btn" style="border-color: #38bdf8; color: #38bdf8;" @click="startRewrite(activeUnconfirmed)">
             REWRITE REALITY ✎
           </button>
        </div>

        <!-- Rewrite Form -->
        <div v-else class="rewrite-form">
          <p style="margin-bottom: 15px; color: var(--primary-2); font-weight: 700;">Overwrite plan with what actually happened:</p>
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <input v-model="rewriteForm.title" class="terminal-input" style="flex: 2; padding: 10px;" placeholder="Actual activity (e.g. Slept in, Talked with friend)" />
            <select v-model="rewriteForm.lifeArea" class="terminal-input" style="flex: 1; padding: 10px;">
              <option v-for="area in ['LEARNING','HEALTH','WORK','CREATIVITY','SOCIAL','MINDFULNESS','FINANCE']" :key="area" :value="area">{{ area }}</option>
            </select>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; justify-content: center; margin-bottom: 20px;">
            <span>Actual Duration:</span>
            <input type="number" v-model.number="rewriteForm.durationMins" class="terminal-input" style="width: 80px; padding: 5px; text-align: center;" />
            <span>mins</span>
          </div>
          <div class="mission-actions">
            <button class="btn-ghost large-btn text-muted" @click="isRewriting = false">CANCEL</button>
            <button class="primary action-btn large-btn" :disabled="!rewriteForm.title.trim()" @click="submitRewrite(activeUnconfirmed)">OVERWRITE HISTORY</button>
          </div>
        </div>
      </div>

      <!-- Current Active Mission -->
      <div v-else-if="currentMission" class="active-mission">
        <div class="mission-status pulse-text">● ACTIVE MISSION DETECTED</div>
        <h1 class="mission-title">{{ currentMission.title }}</h1>
        <div class="mission-meta">
          <span>⏰ {{ formatTime(currentMission.startMinutes) }} - {{ formatTime(currentMission.startMinutes + currentMission.durationMins) }}</span>
          <span class="badge" :class="'badge-' + currentMission.lifeArea.toLowerCase()">{{ currentMission.lifeArea }}</span>
        </div>
        
        <div class="mission-prompt">Are you focused on this mission right now?</div>
        <div class="mission-actions">
           <button class="primary action-btn large-btn" :disabled="!!currentMission.completedAt" @click="markMissionDone(currentMission)">
             {{ currentMission.completedAt ? 'MISSION ACCOMPLISHED' : 'YES, ON IT & DONE ✓' }}
           </button>
           <button class="btn-ghost large-btn text-danger" @click="text = `Deviation: I am not doing [${currentMission.title}]. Instead I am... `">
             NO, I AM DEVIATING
           </button>
        </div>
      </div>
      <div v-else class="free-time">
        <div class="mission-status text-muted">○ NO ACTIVE MISSION</div>
        <h1 class="mission-title text-muted">Free Roam Mode</h1>
        <p class="mission-prompt text-muted" style="margin-top: 10px;">You have no scheduled blocks at this time. <router-link to="/time" style="color:var(--primary-2); text-decoration: underline;">Plan your day</router-link> or log what you're doing below.</p>
        
        <div v-if="nextMission" class="next-mission-hint">
           Next up: <strong>{{ nextMission.title }}</strong> at {{ formatTime(nextMission.startMinutes) }}
        </div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="rpg-grid">
      <!-- Left: Omni Console -->
      <div class="omni-console panel glass">
        <div class="console-header">
          <span class="pulse-dot"></span>
          <span>Omni-Action Console</span>
        </div>
        
        <form class="console-body" @submit.prevent="submit()">
          <textarea
            v-model="text"
            class="terminal-input"
            rows="4"
            placeholder="> Declare your current action, record a thought, or confess a deviation..."
            @keydown="handleKeydown"
          />
          
          <div class="console-actions">
             <div class="hint">{{ charCount > 0 ? charCount + ' chars' : '⌘ + Enter to execute' }}</div>
             <button class="primary action-btn" type="submit" :disabled="loading || !text.trim()">
               {{ loading ? 'Processing...' : 'Execute Action' }}
             </button>
          </div>
        </form>

        <!-- Battle Log -->
        <div class="battle-log">
          <div class="log-header">Recent Activity Feed</div>
          <transition-group name="list" tag="div" class="log-list">
            <div v-if="recentActions.length === 0" class="log-item empty-log" key="empty">
              System standing by. Awaiting commands.
            </div>
            <div v-for="action in recentActions" :key="action.id" class="log-item" :class="{'damage-item': action.xp < 0}">
               <div class="log-content">
                  <span class="log-type" :class="{'text-warn': action.type === 'Deviation' || action.xp < 0}">[{{ action.type }}]</span>
                  <span class="log-text">{{ action.text }}</span>
               </div>
               <span class="xp-gain" :class="{'text-danger': action.xp < 0}">{{ action.xp > 0 ? '+' : '' }}{{ action.xp }} XP</span>
            </div>
          </transition-group>
        </div>
      </div>

      <!-- Right: Side Quests -->
      <aside class="quests-panel">
        
        <!-- Morning Protocol (Wake Up Tracker) -->
        <div class="panel glass" v-if="!wakeupLogged">
          <h2 class="section-title" style="color: #34d399;">🌅 Morning Protocol</h2>
          <p class="muted-text mb-2">When did you wake up today?</p>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="time" v-model="wakeupTime" class="terminal-input" style="padding: 10px; font-size: 1.1rem; flex: 1;" />
            <button class="primary action-btn" @click="logWakeup" style="padding: 10px 16px;">LOG TIME</button>
          </div>
        </div>
        <div class="panel glass" v-else>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="muted-text" style="font-weight: 700;">🌅 WOKE UP AT:</span>
            <span style="font-size: 1.2rem; font-weight: 800; color: #34d399;">{{ wakeupTime }}</span>
          </div>
        </div>

        <!-- Vice Confession Console -->
        <div class="panel glass mt-4" style="border-color: rgba(248,113,113,0.3);">
          <h2 class="section-title text-danger">⚠️ Confess a Vice</h2>
          <p class="muted-text mb-2">Did a bad habit? Log it and take the HP hit.</p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <input v-model="viceName" class="terminal-input" placeholder="What did you do? (e.g. Doomscrolling)" style="padding: 10px;" />
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="number" v-model.number="viceDuration" class="terminal-input" placeholder="Mins" style="width: 80px; padding: 10px;" />
              <span class="text-muted">minutes wasted</span>
            </div>
            <button class="btn-ghost text-danger" style="padding: 10px; border-color: #f87171; font-weight: 800;" @click="confessVice">CONFESS (-HP)</button>
          </div>
        </div>

        <!-- Quick Deviations -->
        <div class="panel glass mt-4">
          <h2 class="section-title">Quick Actions</h2>
          <p class="muted-text mb-2">If you aren't following the plan, own it.</p>
          <div class="action-grid">
             <button class="quick-action-btn secondary" @click="submit('Did not follow the plan, procrastinated.', 5, 'Deviation')">
              🌀 Procrastinated
             </button>
             <button class="quick-action-btn secondary" @click="submit('Took an unplanned break/nap.', 10, 'Deviation')">
              💤 Unplanned Break
             </button>
             <button class="quick-action-btn secondary" @click="submit('Got distracted by social media.', 5, 'Deviation')">
              📱 Scrolled Socials
             </button>
             <button class="quick-action-btn secondary" @click="submit('Did an unplanned productive side-quest.', 40, 'Side Quest')">
              ⚡ Side Quest
             </button>
          </div>
        </div>

        <div class="panel glass mt-4">
          <h2 class="section-title">Active Quests (Tasks)</h2>
          <div class="quest-list">
            <div v-if="!context?.prompts.taskChecks?.length" class="empty-quest">No active quests.</div>
            <button
              v-for="task in context?.prompts.taskChecks"
              :key="task.id"
              :class="['quest-btn', { done: completedTaskIds.has(task.id) }]"
              @click="quickCompleteTask(task)"
            >
              <div class="quest-icon">{{ completedTaskIds.has(task.id) ? '🏆' : '📜' }}</div>
              <div class="quest-details">
                <div class="quest-title">{{ task.title }}</div>
                <div class="quest-reward">Reward: +50 XP</div>
              </div>
            </button>
          </div>
        </div>

      </aside>
    </div>
  </section>
</template>

<style scoped>
.rpg-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
}

.glass {
  background: rgba(20, 24, 36, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(124, 109, 245, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.muted-text { font-size: 0.8rem; color: var(--muted); }
.text-danger { color: #f87171 !important; border-color: rgba(248,113,113,0.3) !important; }
.text-danger:hover { background: rgba(248,113,113,0.1) !important; }
.text-muted { color: var(--muted) !important; }
.text-warn { color: var(--warn) !important; }

/* --- HUD --- */
.player-hud {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 30px;
  padding: 24px;
  align-items: center;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2), #f472b6);
  box-shadow: 0 0 20px rgba(124, 109, 245, 0.4);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-2);
}

.player-info h2 {
  font-size: 1.8rem;
  margin: 0 0 4px 0;
  text-shadow: 0 0 10px rgba(255,255,255,0.2);
}

.level-badge {
  display: inline-block;
  background: rgba(124, 109, 245, 0.2);
  color: var(--primary-2);
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  border: 1px solid rgba(124, 109, 245, 0.4);
}

.stats-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-bar-group {
  position: relative;
}

.invisible-range {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  opacity: 0;
  cursor: pointer;
}

.bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 4px;
  color: var(--ink-2);
}

.bar-bg {
  height: 12px;
  background: rgba(0,0,0,0.4);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05);
}

.bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.xp-fill { background: linear-gradient(90deg, #f5a623, #fcd34d); box-shadow: 0 0 10px rgba(245, 166, 35, 0.5); }
.hp-fill { background: linear-gradient(90deg, #ef4444, #f87171); box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
.mp-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }

/* --- MISSION CONTROL --- */
.mission-control {
  padding: 30px;
  text-align: center;
  border-top: 4px solid var(--primary-2);
  background: linear-gradient(to bottom, rgba(124,109,245,0.1), rgba(0,0,0,0.3));
}

.mission-status {
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #34d399;
  margin-bottom: 10px;
}

.pulse-text {
  animation: textPulse 2s infinite;
}

@keyframes textPulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.mission-title {
  font-size: 2.8rem;
  font-weight: 800;
  margin: 0 0 16px 0;
  background: linear-gradient(120deg, #fff 40%, var(--primary-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(124,109,245,0.3);
}

.mission-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink-2);
  margin-bottom: 24px;
}

.mission-prompt {
  font-size: 1.1rem;
  color: var(--ink);
  margin-bottom: 20px;
}

.mission-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.large-btn {
  padding: 14px 30px;
  font-size: 1.1rem;
  font-weight: 800;
}

.next-mission-hint {
  margin-top: 20px;
  display: inline-block;
  background: rgba(255,255,255,0.05);
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.9rem;
  color: var(--ink-2);
}

/* --- RPG GRID --- */
.rpg-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
}

/* --- CONSOLE --- */
.omni-console {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.console-header {
  padding: 12px 20px;
  background: rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  color: var(--primary-2);
  letter-spacing: 0.05em;
}

.pulse-dot {
  width: 8px; height: 8px;
  background: var(--primary-2);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--primary-2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(157, 145, 247, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(157, 145, 247, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(157, 145, 247, 0); }
}

.console-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.terminal-input {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(124, 109, 245, 0.3);
  color: #34d399;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 1.05rem;
  padding: 16px;
  border-radius: 8px;
  resize: vertical;
  box-shadow: inset 0 0 15px rgba(0,0,0,0.5);
  transition: all 0.3s ease;
}

.terminal-input:focus {
  outline: none;
  border-color: #34d399;
  box-shadow: inset 0 0 20px rgba(52, 211, 153, 0.1), 0 0 10px rgba(52, 211, 153, 0.2);
}

.terminal-input::placeholder {
  color: rgba(52, 211, 153, 0.4);
}

.console-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
  font-family: 'Outfit', sans-serif;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.action-btn:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
}

/* --- BATTLE LOG --- */
.battle-log {
  padding: 0 20px 20px 20px;
}

.log-header {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 6px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  border-left: 3px solid var(--primary-2);
  font-size: 0.85rem;
}

.empty-log {
  border-left: 3px solid var(--muted);
  color: var(--muted);
  font-style: italic;
  justify-content: center;
}

.log-content {
  display: flex;
  gap: 8px;
}

.log-type { color: var(--primary-2); font-weight: 700; }
.log-text { color: var(--ink-2); }

.xp-gain {
  color: #f5a623;
  font-weight: 800;
  font-family: 'Outfit', sans-serif;
  text-shadow: 0 0 5px rgba(245, 166, 35, 0.3);
}

.damage-item {
  border-left-color: #ef4444 !important;
  background: rgba(239, 68, 68, 0.05) !important;
}

@keyframes damageFlash {
  0% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
  50% { box-shadow: 0 0 40px rgba(239, 68, 68, 1); }
  100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); }
}

.damage-flash {
  animation: damageFlash 1.5s infinite;
  background: linear-gradient(135deg, #7f1d1d, #ef4444, #fca5a5);
}

/* Transitions for battle log */
.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from { opacity: 0; transform: translateX(-20px); }
.list-leave-to { opacity: 0; transform: translateX(20px); }

/* --- RIGHT SIDE PANELS --- */
.quests-panel {
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 1rem;
  color: var(--ink);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title::before {
  content: '';
  display: block;
  width: 4px; height: 16px;
  background: var(--primary-2);
  border-radius: 2px;
}

.empty-quest {
  font-size: 0.85rem;
  color: var(--muted);
  padding: 10px;
  text-align: center;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
}

.quest-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quest-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 12px;
  border-radius: 12px;
  text-align: left;
  transition: all 0.2s ease;
  width: 100%;
}
.quest-btn:hover {
  background: rgba(124, 109, 245, 0.1);
  border-color: rgba(124, 109, 245, 0.3);
  transform: translateX(4px);
}
.quest-btn.done {
  opacity: 0.5;
  filter: grayscale(1);
}

.quest-icon {
  font-size: 1.5rem;
  width: 40px; height: 40px;
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quest-title {
  color: var(--ink);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.quest-reward {
  color: #f5a623;
  font-size: 0.75rem;
  font-weight: 700;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.quick-action-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px;
  border-radius: 8px;
  color: var(--ink-2);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.quick-action-btn:hover {
  background: rgba(124, 109, 245, 0.15);
  border-color: var(--primary-2);
  color: white;
}
.quick-action-btn.secondary {
  background: rgba(248, 113, 113, 0.05);
  border-color: rgba(248, 113, 113, 0.2);
  color: rgba(248, 113, 113, 0.9);
}
.quick-action-btn.secondary:hover {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.5);
  color: white;
}

@media (max-width: 860px) {
  .rpg-grid {
    grid-template-columns: 1fr;
  }
  .player-hud {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .mission-actions {
    flex-direction: column;
  }
}
</style>

