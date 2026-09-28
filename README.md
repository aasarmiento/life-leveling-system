# Questify

**Conquer your goals, one quest at a time.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen)](https://aasarmiento.github.io/life-leveling-system/index.html)
[![GitHub](https://img.shields.io/badge/Repository-life--leveling--system-blue)](https://github.com/aasarmiento/life-leveling-system)
[![Milestone](https://img.shields.io/badge/Milestone-1%20%7C%20Interactive%20Frontend-purple)]()
[![Tech](https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20Vanilla%20JS-orange)]()

Questify is a **gamified browser-based personal progress dashboard** that turns real daily effort (Work, Learning, and Health) into XP, levels, and ranks.  

Everyday work that normally stays invisible — hours worked, tasks finished, workouts logged — becomes something you can **see move**.

> Inspired by Habitica, Codédex, and the Solo Leveling system.

---

## 🎯 Problem & Goal

Most daily effort disappears without feedback.  
Questify solves this by treating every completed task as a **quest** that earns XP, fills a progress bar, and raises the player’s level and rank — exactly like a game.

**Milestone 1 Goal**  
Deliver a fully interactive, multi-page frontend prototype that demonstrates the complete core loop (sign in → manage quests → earn XP → level up → notifications → sign out) running entirely in the browser with no server or database.

---

## ✨ Features (Milestone 1)

### Core Loop
- **Quest Board** (Kanban-style): To Do → Doing → Done
- Create, edit, delete, and move quests
- Priority-based XP (Low 10 · Medium 20 · High 30)
- Level formula: `Level = floor(totalXP ÷ 125) + 1`
- Ranks: Novice → Apprentice → Adventurer → Veteran → Master
- Undo completed quests (with confirmation + XP reversal)
- Drag-and-drop reordering (mouse, touch long-press, keyboard Alt+↑/↓)
- Search, category filters, and sort (with Manual mode when dragging)
- Overdue detection (runs every 60 s)

### Site-wide Layer
- Shared header for visitors and signed-in members
- Page guard (redirects protected pages with clear notice)
- Demo sign-in / create account flow (avatar picker, validation, salted SHA-256 hash stored only in browser)
- Player card (level, rank, XP bar, XP to next level)
- Notification bell (Quest done, Level up, Rank up, Overdue) with max 20 items and click-to-open
- Profile page with live data, category stats, XP chart, ranks, trophy shelf, and export/import backup

### Home & About
- Hero with mascot video
- How It Works (4-step onboarding)
- Interactive “Try It” XP demo
- Level-up animation (IntersectionObserver)
- Star rating + feedback form with receipt
- FAQ (single-open accordion)
- Background music toggle (respects autoplay policy)
- Team cards with member details

### Technical Highlights (Advanced Functionality)
- Data-driven rendering (quests array is single source of truth)
- Custom events for inter-script communication (`questify:xp`, `questify:quest-done`, etc.)
- Reusable blueprint functions (`cardHtml`, `playerCardHtml`, `notifItemHtml`…)
- localStorage with validation + fallback to 16 sample quests
- Progressive disclosure (⋮ menus, Show all / Show less)
- Confirmation dialogs + Undo for destructive/XP-changing actions
- XSS protection (all user text escaped)
- Reduced-motion support
- Responsive design (desktop + 375 px / 768 px tested)

---

## 🛠 Tech Stack

| Layer        | Technology                          | Why |
|--------------|-------------------------------------|-----|
| Structure    | Semantic HTML5                      | Clean, accessible base |
| Styling      | CSS3 (Custom Properties / Design Tokens, Grid, Flexbox) | Full control of pixel aesthetic |
| Behavior     | Vanilla JavaScript (ES6+)           | No framework overhead; every line is explainable |
| Persistence  | localStorage                        | Works offline, survives refresh, no backend needed |
| Fonts        | Press Start 2P + Space Grotesk (Google Fonts) | Pixel titles + readable body |
| Hosting      | GitHub Pages                        | Free static hosting |
| Design       | Figma                               | Shared visual source of truth |
| Versioning   | Git + GitHub (branches + PRs)       | Safe teamwork |

**No frameworks, no build tools, no backend** — pure frontend as required for Milestone 1.

---

## 📁 Project Structure
life-leveling-system/
├── index.html                  # Home
├── pages/
│   ├── about.html
│   ├── signin.html
│   ├── create-account.html
│   ├── tasks.html              # Quest Board
│   └── profile.html
├── css/
│   └── style.css               # Single shared stylesheet (design tokens + all pages)
├── js/
│   ├── nav.js                  # Header, guard, player card, notifications, sign-in/out
│   ├── tasks.js                # Quest Board logic, XP, drag, search, sort, Undo
│   └── app.js                  # Home & About interactions
└── assets/                     # Images, avatars, icons, videos, audio



---

##  Getting Started

### Live Demo
 **[https://aasarmiento.github.io/life-leveling-system/index.html](https://aasarmiento.github.io/life-leveling-system/index.html)**

### Run Locally
1. Clone the repository
   ```bash
   git clone https://github.com/aasarmiento/life-leveling-system.git
   cd life-leveling-system
