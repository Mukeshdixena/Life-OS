# 🌌 Life OS — Premium AI-Powered Personal Operating System

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-AI--Scheduling-8A2BE2?style=for-the-badge)](https://openrouter.ai/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

> Life OS is a premium, all-in-one personal cockpit designed to bridge the gap between rigid calendar planning and actual, fluid daily execution. By combining **AI-driven dynamic scheduling**, an **interactive Google Calendar-inspired Time Grid**, **real-time outcome check-ins**, and **analytical self-reflection metrics**, Life OS helps you conquer your day with focus and intention.

---

## 📖 What is Life OS all about?

Traditional calendars are passive, and to-do lists lack a sense of time. When plans hit real-world disruptions, static tools break down. **Life OS** treats your day as a dynamic sequence of **Time Blocks**, helping you bridge intent and action:

1. **Intention**: You express what you want to achieve using natural language prompts.
2. **Context-Aware AI Generation**: The platform interfaces with advanced language models to schedule a realistic, highly personalized timeline based on your current mood, energy levels, and mental state.
3. **Immersive Execution**: An interactive Google Calendar-style interface keeps you locked in on the current task with a dedicated **Focus Panel**, featuring counting rings, progress bars, and one-click time extensions.
4. **Accountability & Reflection**: When time blocks finish, you complete a rapid check-in logging the actual outcome, notes, and **Time ROI** (Return on Investment). The day concludes with an overall rating, a breakdown of daily wins, and analytical insights.

---

## 🌟 Core Pillars & Features

### 1. 🤖 AI-Powered Day Scheduler (Intent-to-Blocks)
* **Natural Intent Input**: Simply type what you want to achieve (e.g., *"I have a lot of work to catch up on, need to do a 1-hour run, and want a relaxed dinner with family"*).
* **Context-Driven Scheduling**: Input your daily mood (1–10), energy score (1–10), and current mental state. The AI factors this in to place challenging intellectual tasks when your energy is high, and relaxing personal tasks when it is low.
* **OpenRouter API Integration**: Communicates seamlessly with OpenRouter (using fast, versatile models like `openai/gpt-4o-mini` or `mistral-7b-instruct`) to generate valid schedule objects instantly.

### 2. 🗓️ Interactive Time Grid (Google Calendar-Inspired)
* **Hour Ruler & Time Grid**: Elegant calendar time grid rendering from **6:00 AM to 11:00 PM** with custom alternating half-hour markers.
* **Interactive Blocks**: Supports quick click-to-create empty slots, and block editing using an inline floating popover anchored directly to the block.
* **Side-by-Side Overlaps**: Intelligent rendering math automatically handles overlapping blocks to keep your schedule neat and legible.
* **Live "Now" Tracker**: A distinct, glowing red indicator line moves across the time grid in real-time, scrolling automatically on load to focus your attention.

### 3. ⏱️ Execution Cockpit (The "Now" Panel)
* **Countdown Ring**: An animated circular progress indicator showing remaining time down to the second.
* **Quick Controls**: Instantly adapt to disruptions using the **Extend Block (+15m)** or **Complete Early** actions.
* **Up Next Feed**: A visual sequence of upcoming cards showing what is next, complete with countdowns (e.g., *"Starting in 45m"*).

### 4. 🎯 Mindfulness & Time ROI Check-ins
* **Actionable Logging**: Log block outcomes as `done`, `extended`, `skipped`, or `did_something_else`.
* **Value Assessment**: Refined tracking of actual ending time, notes, and a cognitive **Time ROI** assessment (e.g., whether the block was high value or a distraction).

### 5. 📈 Self-Reflection & Analytics Dashboard
* **Daily Review Reviews**: Rate your day, log your primary energy drains, specify wins, and identify areas for improvement.
* **Interactive Charts (Recharts)**: Analyze completion streaks, distribution of time across categories (Work, Learning, Health, Relationships, Admin, Personal, Sleep), and longitudinal mood vs. energy trends.

### 6. 🔄 Integrated Habits Tracker
* **Routines Tracking**: Create positive recurring habits (categorized and color-coded).
* **Daily Habit Logs**: Toggle daily completions to build and maintain powerful streaks.

---

## 🛠️ Tech Stack & Architecture

```mermaid
graph TD
    A[React Client / Vite] <-->|JSON over HTTP / JWT| B[Express Server]
    B <-->|pg Node-postgres Pool| C[(PostgreSQL Database)]
    B <-->|External HTTPS Requests| D[OpenRouter AI Service]
```

### Frontend (`client/`)
* **Core**: React 18, Vite (fast HMR build tool).
* **Routing**: React Router DOM (v6 / future React Router compatibility setup).
* **State Management**: Zustand (lightweight, reactive global store).
* **Visuals & Utilities**: Recharts (interactive graphs), Lucide React (sleek modern icons), Date-fns (date formatting and logic).
* **Styling**: Premium Vanilla CSS custom variables (`theme.css`) with light/dark variables, glassmorphic filters, and animated keyframes.

### Backend (`server/`)
* **Core**: Node.js, Express, Cors.
* **Database Driver**: `pg` (custom pool queries).
* **Authentication**: Password hashing with `bcryptjs` and secure authorization with `jsonwebtoken` (JWT).
* **AI Service**: Custom AXIOS integration with the **OpenRouter API** supporting fallback schemas, error handling, and robust JSON extraction rules.
* **DB Schema Sync**: Auto-checks and initializes schema using an idempotent migration script (`db-init.js`) on launch.

---

## 🗄️ Database Architecture

The schema is built on a reliable, relational **PostgreSQL** model designed for rapid reads, analytical grouping, and cascade deletions:

```
                  ┌──────────────┐
                  │    users     │
                  └──────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌────────────────┐ ┌───────────┐ ┌──────────────┐
│  daily_plans   │ │  habits   │ │  habit_logs  │
└────────┬───────┘ └─────┬─────┘ └──────────────┘
         │               │
         ▼               │
┌────────────────┐       │
│  time_blocks   │◄──────┘ (Habit correlations)
└────────┬───────┘
         │
         ├───► [ checkins ]
         │
         └───► [ daily_reviews ]
```

1. **`users`**: Manages credentials, custom themes, and user settings JSON.
2. **`daily_plans`**: Captures daily context including intent prompts, date, mood scores, energy scores, and mental state.
3. **`time_blocks`**: Captures titles, categories (work, learning, health, etc.), precise times, planned constraints, status states, and positioning indexes.
4. **`checkins`**: Links outcomes, actual end times, alternate activities, and Time ROI directly to time blocks.
5. **`daily_reviews`**: Combines day summary logs, completion rates, wins, and improvement notes for future analytical queries.
6. **`habits` & `habit_logs`**: Tracks recurring habit names, active statuses, and daily toggled checkboxes.

---

## ⚙️ Getting Started & Installation

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **PostgreSQL** (Local instance or cloud databases like Supabase)
* **OpenRouter API Key** (Get yours at [openrouter.ai](https://openrouter.ai/))

### 1. Environment Variables Configuration

Create a `.env` file at the **root** of the project (you can duplicate `.env.example` as a starting point):

```env
# Database connection string (PostgreSQL)
DB_URL="postgresql://postgres:your-password@localhost:5432/life_os"

# JWT Secret for secure logins
JWT_SECRET="generate-a-long-random-alphanumeric-string-here"

# OpenRouter Configuration for AI scheduling
OPENROUTER_API_KEY="your_openrouter_api_key_here"
OPENROUTER_MODEL="openai/gpt-4o-mini" # or mistralai/mistral-7b-instruct:free

# Network Rules
PORT=5000
CLIENT_URL="http://localhost:5173"
VITE_API_URL="http://localhost:5000"
```

### 2. Dependency Installation

From the **root directory** of the project, install all dependencies for the server and client in one sweep:

```bash
# Install root dependencies (concurrently, etc.)
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 3. Launching in Development Mode

Run the integrated concurrently script from the **root directory** to spin up both the Express backend and the Vite frontend simultaneously:

```bash
# Return to the root folder if needed, then run:
npm run dev
```

* **Frontend** will spin up at: `http://localhost:5173`
* **Express API** will spin up at: `http://localhost:5000` (Database tables will be created automatically if they do not exist).

---

## 🎨 Aesthetic Theme & Styling Design System

Life OS is styled using premium, contemporary design systems to deliver maximum immersion. Highlights:
* **Glassmorphism Elements**: Subtle backing blurs (`backdrop-filter: blur(12px)`), thin transparent borders, and soft shadows to create modern depths.
* **Tailored Harmonious Colors**: Predefined custom properties based on semantic categories:
  * 💻 **Work**: Blue (`#3B82F6`)
  * 🍏 **Health**: Green (`#22C55E`)
  * 🎓 **Learning**: Purple (`#A855F7`)
  * 🤝 **Relationships**: Orange (`#F97316`)
  * ⚙️ **Admin**: Slate Gray (`#6B7280`)
  * 🎀 **Personal**: Pink (`#EC4899`)
  * 🌙 **Sleep**: Deep Slate (`#1E293B`)
* **Interactive Micro-animations**: Active blocks feature a glowing pulsing animation, transitions are animated smoothly (e.g., hover scaling, active countdown rings), and time block updates animate into place elegantly.
* **Light/Dark Semantic Mapping**: Pure CSS customization mapping tokens dynamically using standard selectors (e.g., `[data-theme="dark"]`).

---

## 🚀 Deployment Recommendations

* **Frontend Deployment**: Fully optimized for static hosting platforms like **Vercel**, **Netlify**, or **GitHub Pages**. Ensure that `VITE_API_URL` points to your production server URL.
* **Backend Server**: Deploy as a persistent node service on **Render**, **Railway**, or **Heroku**.
* **Database**: Utilize managed relational PostgreSQL platforms like **Supabase** or **Neon** for secure connections and effortless scaling.
