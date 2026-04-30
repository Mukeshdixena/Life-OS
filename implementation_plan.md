# Rich Day Plan UI — Google Calendar Inspired

## Overview

Transform the current `Today.jsx` from a basic timeline into a premium, Google Calendar-style day planner with drag-to-create blocks, rich event editing, mini calendar, and a powerful "Now" panel. Every interaction should feel fast and polished.

---

## Proposed Changes

### Core Layout Redesign

The new layout splits the screen into **3 panels** (like Google Calendar's day view):

| Panel | Content |
|---|---|
| Left Sidebar | Mini calendar, category legend, stats |
| Center | Full Google Calendar-style time grid (6am–11pm) |
| Right | Active block timer + "Up Next" feed |

---

### Feature List

#### 🗓️ Time Grid (Center)
- **Pixel-perfect time ruler** — Hour labels on the left, alternating half-hour dividers
- **Click-to-create** — Click any empty time slot to create a new event at that time
- **Drag-to-resize** — Drag the bottom handle of a block to extend it
- **Block overlap handling** — Side-by-side rendering when blocks overlap
- **Live "Now" line** — Animated red line with pulsing dot and time label
- **Auto-scroll** — Scroll to current time on load
- **Block status chips** — ✅ Done, ▶️ Active, ⏳ Pending with color coding

#### 📅 Mini Calendar (Sidebar)
- Month view with week grid
- Current day highlighted
- Navigation arrows (prev/next month)
- Day-of-year counter

#### 🎯 Block Quick-Create Popover
- Click on time grid → popover at cursor position
- Title input + category select + time range
- Save creates the block directly (no modal required)

#### ✏️ Block Edit Popover (Google Calendar style)
- Clicking an existing block opens a **floating popover** anchored to the block
- Edit title, category, start/end time, add notes
- Delete button

#### ⏱️ Now Panel (Right)
- Animated countdown ring (existing, improved)
- Progress bar
- Quick actions: Complete Early, Extend +15m
- "Up Next" cards with time-until labels

#### 📊 Day Stats Row (Below header)
- Total hours planned
- Hours completed
- Focused time % 
- Completion streak

#### 🎨 Visual Design
- Rich color blocks with glassmorphism effect
- Category color gradients on block left border
- Active block with animated glow pulse
- Smooth transitions on all interactions
- Dark theme optimized

---

### Files to Modify

#### [MODIFY] [Today.jsx](file:///c:/dev/other/Life-OS/client/src/pages/Today.jsx)
Full rewrite with:
- `MiniCalendar` component
- `TimeGrid` component (replaces `Timeline`)
- `BlockPopover` component (inline create/edit popover)
- `DayStatsRow` component  
- Improved `NowPanel` with extend functionality
- Improved `QuickPlanModal`

#### [MODIFY] [theme.css](file:///c:/dev/other/Life-OS/client/src/styles/theme.css)
Append a new `/* ===== TODAY V2 =====*/` section with:
- `.day-view-layout` — 3-col grid
- `.time-grid` — main calendar grid
- `.time-slot` — clickable empty slot
- `.gc-block` — Google Calendar style event block
- `.block-popover` — floating popover styles
- `.mini-cal` — mini calendar styles
- `.day-stats-bar` — stats row
- Block create animation

---

## Verification Plan

### Automated
- `npm run dev` — check no build errors

### Manual
- Verify time grid renders from 6am–11pm correctly
- Verify "Now" line is at correct position
- Verify clicking empty slot creates a block
- Verify clicking existing block opens edit popover
- Verify mini calendar shows correct month
- Verify stats row reflects block data
- Verify drag-to-resize works on blocks
- Verify dark mode looks correct
