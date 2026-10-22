# Questify

**Conquer your goals, one quest at a time.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen)](https://aasarmiento.github.io/life-leveling-system/index.html)
[![GitHub](https://img.shields.io/badge/Repository-life--leveling--system-blue)](https://github.com/aasarmiento/life-leveling-system)
[![Milestone](https://img.shields.io/badge/Milestone-2%20%7C%20Backend--Supported%20Web%20App-purple)]()
[![Tech](https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Node.js%20%7C%20Express%20%7C%20SQLite-orange)]()

Questify is a **gamified personal progress web app** that turns real daily effort (Work, Learning, and Health) into XP, levels, and ranks.

Everyday work that normally stays invisible — hours worked, tasks finished, workouts logged — becomes something you can **see move**.

> Inspired by Habitica, Codédex, and the Solo Leveling system.

---

## 🎯 Problem & Goal

Most daily effort disappears without feedback.
Questify solves this by treating every completed task as a **quest** that earns XP, fills a progress bar, and raises the player's level and rank — exactly like a game.

**Milestone 1** delivered the full interactive frontend (sign in → manage quests → earn XP → level up → notifications → sign out), running in the browser.

**Milestone 2** adds a real **backend**: a Node.js + Express REST API with a SQLite database, so accounts, the Quest Board and feedback are saved on the server, checked by the server, and the same on every device.

---

## 🚀 Run It Locally (with the server)

### 1. Requirements
- **Node.js 22.13 or newer** (the database uses Node's built-in SQLite). Check with:
  ```bash
  node -v
  ```
  Older version? Download the LTS from [nodejs.org](https://nodejs.org). If it is too old, the server says so clearly when it starts.
- Git

### 2. Install and start
```bash
git clone https://github.com/aasarmiento/life-leveling-system.git
cd life-leveling-system
npm install
npm start
```

You should see:
```
Database ready: data\questify.db
Questify running at http://localhost:3000
```

Open **http://localhost:3000** in your browser.

- The first start creates `data/questify.db` (the database) with the demo account. The `data/` folder is not in Git, so each computer has its own database.
- Stop the server with **Ctrl + C**. After pulling new changes, stop it and run `npm start` again.

### 3. Demo account
| Email | Password |
|---|---|
| `alex@gmail.com` | `12345678` |

The demo account starts with 16 sample quests at Level 12. New accounts start with an empty board at Level 1.

### 4. Try it on your phone
Connect your phone to the same Wi-Fi, find your computer's IP address (`ipconfig` on Windows), and open `http://<that IP>:3000`. Or in Brave/Chrome on the computer: **F12 → Ctrl + Shift + M** for a phone view.

---

## 🔀 Server Mode vs Demo Mode

The same pages work in two ways. They detect which one automatically.

| | **Server mode** (`npm start` → localhost:3000) | **Demo mode** (GitHub Pages, Live Server, opening the file) |
|---|---|---|
| Accounts | Saved in the SQLite database; passwords hashed with scrypt + salt | Saved in this browser only |
| Sign in | Server checks the password and gives a session token (1 day) | Checked in the browser |
| Quest Board | Saved on the server: **same board on every device** | Saved in this browser only |
| Offline | Changes stay on the device and sync when the server is back | — |
| Feedback | Saved in the database with a server-made reference number | Saved in this browser only |

The **live link on GitHub Pages runs in demo mode**, because GitHub Pages can only host files and cannot run a Node.js server. To see the backend, run it locally with `npm start`.

---

## 🔌 API

All addresses start with `http://localhost:3000`. Everything answers in JSON; errors look like `{ "error": "...", "field": "..." }`.

| Method | Address | Sign in needed | What it does |
|---|---|---|---|
| GET | `/api/health` | No | Server check → `{ status: "ok" }` |
| POST | `/api/signup` | No | Create an account `{ name, email, password, avatar }` → `201 { token, player }` (409 if the email is taken) |
| POST | `/api/signin` | No | Sign in `{ email, password }` → `{ token, player }` (401 wrong email/password, 429 after 5 wrong tries for 15 minutes) |
| GET | `/api/me` | Yes | Who is signed in → `{ player }` |
| POST | `/api/signout` | No (uses the token if sent) | End this sign in (the token stops working); always answers OK |
| GET | `/api/board` | Yes | The player's Quest Board → `{ board, version }` |
| PUT | `/api/board` | Yes | Save the whole board `{ board, base }` in one transaction (409 if another device saved first, with the newest board) |
| POST | `/api/feedback` | No | Send feedback `{ rating, tags, message }` → `201` with a server-made `FB-YYMMDD-XXXX` reference (max 10 per minute) |
| GET | `/api/feedback` | No | The newest 100 feedback |

"Sign in needed" = send the token as `Authorization: Bearer <token>` (the pages do this for you).

---

## ✨ Features

### Milestone 2: Backend
- **SQLite database** (`db/schema.sql`): 6 tables — users, sessions, quests, boards, xp_log, feedback — with rules (unique email, allowed values, lengths, links between tables)
- **Accounts and sign in on the server**: scrypt + salt passwords (never stored or sent back), 1-day session tokens, same message for a wrong email or password, wrong-password limit
- **Server-side validation** of every request, with the same messages the pages show
- **Quest Board on the server**: saved in one transaction, version check so two devices never overwrite each other, offline changes sync later, the board already in a browser is uploaded once
- **Feedback in the database** with a unique server-made reference; the receipt only appears after the server saved it
- **Phone layout** (720 px and below): one-row header with a ☰ menu, notifications panel, To do / Doing / Done tabs, floating + Add quest — desktop unchanged
- **Clear errors**: a damaged database, a missing schema or an old Node version stop the server with a plain message; unknown `/api` addresses and bad requests answer in JSON

### Milestone 1: Frontend
- **Quest Board** (Kanban-style): To Do → Doing → Done; create, edit, delete, move, drag to reorder (mouse, touch, keyboard)
- Priority-based XP (Low 10 · Medium 20 · High 30), `Level = floor(totalXP ÷ 125) + 1`, ranks Novice → Apprentice → Adventurer → Veteran → Master
- Undo completed quests (confirmation + XP reversal), search, category filters, sort, overdue detection
- Shared header, page guard, player card, notification bell (Quest done, Level up, Rank up, Overdue)
- Profile with live stats, category grid, XP chart, ranks, trophy shelf, export/import backup
- Home: mascot hero, how it works, XP demo, level-up animation, feedback form, FAQ, background music; About with team cards
- Accessibility: keyboard support, focus management, reduced motion, screen-reader announcements; all user text escaped (XSS-safe)

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Structure | Semantic HTML5 | Clean, accessible base |
| Styling | CSS3 (design tokens, Grid, Flexbox, media queries) | Full control of the pixel style; phone + desktop layouts |
| Behavior | Vanilla JavaScript (ES6+) | No framework overhead; every line is explainable |
| Server | **Node.js + Express 5** | REST API taught in the course (Weeks 7–9) |
| Database | **SQLite** (Node's built-in `node:sqlite`) | A real database in one file; nothing extra to install |
| Security | Node `crypto` (scrypt + salt, random tokens) | Passwords never stored; sign-in sessions |
| Hosting | GitHub Pages (demo mode) · localhost (server mode) | Free static demo + full backend locally |
| Design | Figma | Shared visual source of truth |
| Versioning | Git + GitHub (branches + PRs) | Safe teamwork |

---

## 📁 Project Structure
```
life-leveling-system/
├── server.js                  # Express server: pages, API routes, JSON errors
├── package.json               # npm start, Express
├── db/
│   ├── schema.sql             # The 6 tables and their rules
│   └── db.js                  # Opens data/questify.db, runs the schema, adds the demo account
├── lib/
│   ├── passwords.js           # scrypt + salt
│   ├── sessions.js            # Session tokens, requireAuth
│   ├── validate.js            # Server-side checks (sign up, sign in, board)
│   └── limit.js               # Wrong-password limit
├── routes/
│   ├── auth.js                # /api/signup, /signin, /me, /signout
│   ├── board.js               # /api/board (GET, PUT)
│   └── feedback.js            # /api/feedback (POST, GET)
├── index.html                 # Home
├── pages/                     # about, signin, create-account, tasks (Quest Board), profile
├── css/style.css              # One shared stylesheet (design tokens, all pages, phone layout)
├── js/
│   ├── nav.js                 # Header, guard, sign in/out, board sync, notifications, phone menu
│   ├── tasks.js               # Quest Board logic, XP, drag, search, sort, tabs
│   ├── profile.js             # Profile stats, charts, export/import
│   └── app.js                 # Home & About interactions, feedback form
├── assets/                    # Images, avatars, icons, videos, audio
└── data/                      # Created on first start (not in Git): questify.db
```

---

## 🧪 Testing

Every Milestone 2 checkpoint was tested on a separate copy of the project with its own database, using automated scripts that send real API requests and drive a real browser (headless Brave), plus manual tests.

| Area | Examples of what was checked |
|---|---|
| Database | Every table rule refuses bad data; deleting a user removes their data |
| Accounts & sign in | Validation, duplicate emails (any letter case), 5 sign-ups at once, SQL injection, wrong-password limit, expired sessions |
| Quest Board | Two devices on one account, conflicts, offline sync, a 500-quest board, two players kept apart, restart keeps everything |
| Feedback | Unique references, spam limit, old data moved once, receipt only after saving, server down |
| Phone layout | Every page at 360–414 px, menu and panels with keyboard, tabs, desktop unchanged |
| UI audit | 51 screens on phone and desktop: no sideways scroll, cut-off or overlapping text, small buttons |

All checks pass. Details are in the team's checkpoint change logs.

---

## 👥 Team

| Member | Role | Main Contributions |
|---|---|---|
| **Abigail Ann Sarmiento** | UI/UX Design, Repo Owner | Figma, Home, About, Profile & Sign-in design, design tokens |
| **Christian Allen Soriano** | Project Manager | Quest Board, header, auth, player card, notifications; Milestone 2 database, accounts, sync, feedback, phone layout; docs |
| **Sire Ermond Manalo** | GitHub Lead | Repository, merges, Express server and feedback API, bug hunting, code quality |
| **Jeremiah Alzona** | Documentation | Development logs, worksheet, written docs |
| **Rowel Jepsani** | Documentation / Tester | Research, consolidated report, testing, final push |

**Mentors:**
- Aldrin John Tamayo
- Sir Hanz Cruz

---

## 📅 Timeline

| When | Focus |
|---|---|
| Weeks 1–6 | Milestone 1: ideation, HTML, CSS design system, JavaScript, shared header, auth, notifications, testing |
| Oct 20–21 | Milestone 2 starts: Express server + feedback API (Sire) |
| Oct 22 | Checkpoints 1–5: SQLite database, accounts and sign in, Quest Board sync, feedback in the database, phone layout + UI polish |
| Oct 26 | Milestone 2 submission |

---

##  What's Next

- Host the server online (so the live link has accounts and sync too)
- Live updates between devices (WebSockets) and notifications saved on the server
- Settings page (change name, avatar, password)
- Sessions in secure cookies; wrong-password counts saved in the database

---

##  License & Academic Notice

This project was developed as a student coursework deliverable for Mapúa-Malayan Digital College (MMDC).
The template and structure follow institutional guidelines.
Unauthorized commercial use, redistribution, or claiming ownership of the original template is prohibited.

---

## 📎 Quick Links

- **Live Site (demo mode):** https://aasarmiento.github.io/life-leveling-system/index.html
- **Repository:** https://github.com/aasarmiento/life-leveling-system
- **Figma:** https://www.figma.com/design/AJTHmDxEK733yLdHtsNm3P/Questify

---

**Questify** — Make progress visible. Level up your life.
