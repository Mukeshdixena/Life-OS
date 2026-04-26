# Life OS

Life OS is a full-stack personal operating system built around one primary input surface. The user writes natural language or responds to quick prompts, and the system routes the meaning into tasks, habits, projects, life-area progress, calendar days, diary entries, reports, and Socratic reflection.

## Stack

- Vue, Vite, Vue Router, Pinia
- NestJS, TypeScript
- PostgreSQL via Prisma
- JWT authentication
- OpenRouter for AI routing, with a local heuristic fallback
- Plain CSS variables, no Tailwind or UI library

## Run

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Client: http://localhost:5173  
API: http://localhost:4000

Create an account from the app, then use the Input page as the main interaction point.

