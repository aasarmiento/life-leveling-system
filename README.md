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
2. Open with any static server (recommended: **VS Code Live Server**) or simply open `index.html` in a modern browser.
3. **Demo account** (pre-loaded with 16 sample quests):
   - Email: `alex@gmail.com`
   - Password: `12345678`

> New accounts start with an empty board at Level 1.

---

## 🧪 Tested Flows (Summary)

| Flow                                                      | Result            |
|-----------------------------------------------------------|-------------------|
| Sign in → land on Quest Board                             | Pass              |
| Open Tasks / Profile while signed out → redirect + notice | Pass              |
| Create account + avatar selection                         | Pass              |
| Drag cards (mouse / touch / keyboard)                     | Pass              |
| Mark done → XP + notifications → Undo                     | Pass              |
| Refresh → data persists                                   | Pass              |
| Blocked localStorage (private window)                     | Graceful fallback |
| XSS attempt                                               | Escaped correctly |
| 375 px / 768 px layouts                                   | Usable            |

---

## 👥 Team

| Member                    | Role                          | Main Contributions |
|---------------------------|-------------------------------|--------------------|
| **Abigail Ann Sarmiento** | UI/UX Design, Repo Owner      | Figma, Home, About, Profile & Sign-in design, design tokens |
| **Christian Allen Soriano** | Project Manager             | Quest Board, shared header, auth flow, player card, notifications, docs |
| **Sire Ermond Manalo**    | GitHub Lead                   | Repository, merges, bug hunting, code quality |
| **Jeremiah Alzona**       | Documentation                 | Development logs, worksheet, written docs |
| **Rowel Jepsani**         | Documentation / Tester        | Research, consolidated report, testing, final push |

**Mentors:**  
- Aldrin John Tamayo  
- Sir Hanz Cruz

---

## 📅 Milestone 1 Timeline

| Week | Focus |
|------|-------|
| 1    | Ideation & group formation |
| 2    | Semantic HTML skeleton |
| 3    | CSS design system + realignment |
| 4–5  | JavaScript behavior + full audit |
| 6    | Shared header, auth, notifications, integration & testing |

---

##  What's Next (Milestone 2+)

- Real authentication + backend (Node.js / Express)
- Database + multi-device sync
- Live Profile data fully connected
- Compact phone menu
- Settings page
- Feedback form → backend
- Screen-reader & cross-browser formal testing

---

##  License & Academic Notice

This project was developed as a student coursework deliverable for Mapúa-Malayan Digital College (MMDC).  
The template and structure follow institutional guidelines.  
Unauthorized commercial use, redistribution, or claiming ownership of the original template is prohibited.

---

## 📎Quick Links

- **Live Site:** https://aasarmiento.github.io/life-leveling-system/index.html  
- **Repository:** https://github.com/aasarmiento/life-leveling-system  
- **Figma:** https://www.figma.com/design/AJTHmDxEK733yLdHtsNm3P/Questify  

---

**Questify** — Make progress visible. Level up your life.
   
