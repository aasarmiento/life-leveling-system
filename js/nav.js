// =====================================================================
// SHARED HEADER + SIGN IN / SIGN OUT (nav.js) — GUIDE PARA SA TEAM
// ---------------------------------------------------------------------
// Nilalagay 'to sa <head> ng bawat page. Ginagawa nito:
//   1. GUARD   - Tasks at Profile: kung hindi naka-sign in, diretso sa
//                Sign in (bago pa lumabas yung page, kaya walang "kislap").
//   2. HEADER  - naglalagay ng class na "is-member" sa <html> kung naka-sign in.
//                Sa CSS: .member-only = lalabas lang pag naka-sign in,
//                .guest-only = pag hindi pa.
//   3. PLAYER CARD (Alex ▾) + BELL - binubuo gamit ang ISANG blueprint
//                function (playerCardHtml) mula sa isang player object.
//                Parehong idea ng team cards ni Abigail (OOP).
//   4. FORMS   - Sign in / Create account: sine-save ang flag, tapos Tasks.
//   5. SIGN OUT - binubura lang ang flag. Naiiwan ang quests at XP.
//
// Walang totoong login dito (wala pang server). "Signed in" = may naka-save
// na flag sa localStorage. Demo lang ng flow, hindi totoong security.
// =====================================================================
(function () {
  const SIGNED_IN_KEY = "questify.signedIn";
  const PLAYER_KEY = "questify.player";
  // Demo account: may sample quests at Level 12 (1,450 XP) para sa mentor at testers.
  // Bagong account: walang laman ang board, Level 1 (0 XP).
  const DEMO_EMAIL = "alex@gmail.com";
  const DEMO_XP = 1450; // dapat pareho sa tasks.js
  const XP_PER_LEVEL = 125; // dapat pareho sa tasks.js
  // Kapareho ng "Climb the ranks" sa Home (at ng demo sa app.js)
  const RANKS = [
    { name: "Novice", xp: 0 },
    { name: "Apprentice", xp: 100 },
    { name: "Adventurer", xp: 300 },
    { name: "Veteran", xp: 700 },
    { name: "Master", xp: 1500 },
  ];
  // Yung pages na kailangan naka-sign in. Ang <html> nila ay may data-guard="...".
  const GUARDED = { tasks: "tasks.html", profile: "profile.html" };

  // Saan naka-lagay yung site (para gumana ang links sa index.html at sa pages/)
  const BASE = document.currentScript.src.replace(/js\/nav\.js.*$/, "");

  // Pwedeng naka-block yung storage (hal. private mode). Kung ganun, walang
  // natatandaan pero hindi rin mag-e-error.
  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }
  function write(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (err) {
      /* okay lang */
    }
  }

  // ---------- TOAST (maliit na message sa baba-kanan, para sa lahat ng page) ----------
  // Tawagin: window.questifyToast({ tone, title, text }).
  //   tone: "ok" (lime), "lv" (gold, level up), "info" (teal), "err" (red)
  // Walang Undo at walang countdown bar. Mga 4 na segundo, humihinto habang
  // naka-hover, at may X para isara. Isa lang sa isang pagkakataon.
  const TOAST_ICON = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  };
  const TOAST_DEFAULT_ICON = {
    ok: "check",
    lv: "star",
    info: "info",
    err: "alert",
  };
  const svgIcon = (d) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  let toastEl = null;
  let toastTimer = null;

  function hideToast() {
    clearTimeout(toastTimer);
    if (toastEl) toastEl.hidden = true;
  }

  window.questifyToast = function ({
    tone = "info",
    title = "",
    text = "",
    icon = "",
    announce = true,
  } = {}) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "qtoast";
      toastEl.hidden = true;
      toastEl.innerHTML = `
        <span class="qtoast-ico"></span>
        <div class="qtoast-body"><b></b><span></span></div>
        <button type="button" class="qtoast-x" aria-label="Dismiss">${svgIcon('<path d="M6 6l12 12M18 6L6 18"/>')}</button>`;
      toastEl.querySelector(".qtoast-x").addEventListener("click", hideToast);
      // Habang nasa toast ang mouse, hindi muna mawawala
      toastEl.addEventListener("mouseenter", () => clearTimeout(toastTimer));
      toastEl.addEventListener("mouseleave", () => {
        if (!toastEl.hidden) toastTimer = setTimeout(hideToast, 2500);
      });
      document.body.appendChild(toastEl);
    }
    // Ang Tasks page may sariling screen-reader announcer, kaya puwedeng patayin dito
    toastEl.setAttribute("aria-live", announce ? "polite" : "off");
    toastEl.setAttribute("role", tone === "err" ? "alert" : "status");
    toastEl.dataset.tone = tone;
    toastEl.querySelector(".qtoast-ico").innerHTML = svgIcon(
      TOAST_ICON[icon] ||
        TOAST_ICON[TOAST_DEFAULT_ICON[tone]] ||
        TOAST_ICON.info,
    );
    toastEl.querySelector(".qtoast-body b").textContent = title;
    const small = toastEl.querySelector(".qtoast-body span");
    small.textContent = text;
    small.hidden = !text;
    // Restart ng animation kahit may nakabukas pang toast
    toastEl.hidden = true;
    void toastEl.offsetWidth;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4000);
  };

  // ---------- RANK UP (buong-screen na celebration) ----------
  let rankUpEl = null;
  let rankUpTimer = null;

  function hideRankUp() {
    clearTimeout(rankUpTimer);
    if (rankUpEl) rankUpEl.classList.remove("show");
  }

  function showRankUp(rank, total) {
    if (!rankUpEl) {
      rankUpEl = document.createElement("div");
      rankUpEl.className = "rankup";
      rankUpEl.setAttribute("role", "status");
      rankUpEl.setAttribute("aria-live", "polite");
      rankUpEl.innerHTML = `
        <div class="rankup-card">
          <span class="rankup-kicker">Rank up</span>
          <div class="rankup-badge">${svgIcon(TOAST_ICON.star)}</div>
          <h2 class="rankup-name"></h2>
          <p class="rankup-sub"></p>
        </div>`;
      rankUpEl.addEventListener("click", hideRankUp);
      document.body.appendChild(rankUpEl);
    }
    rankUpEl.querySelector(".rankup-name").textContent = rank;
    rankUpEl.querySelector(".rankup-sub").textContent =
      `${total.toLocaleString("en-US")} XP total`;
    rankUpEl.classList.remove("show");
    void rankUpEl.offsetWidth;
    rankUpEl.classList.add("show");
    clearTimeout(rankUpTimer);
    rankUpTimer = setTimeout(hideRankUp, 3600);
  }

  const signedIn = read(SIGNED_IN_KEY) === "1";

  // ---------- 1. GUARD ----------
  const guard = document.documentElement.dataset.guard;
  if (guard && !signedIn) {
    location.replace(
      BASE + "pages/signin.html?next=" + encodeURIComponent(guard),
    );
    return;
  }
  // Sign in / Create account habang naka-sign in na: diretso sa Quest Board
  // (gaya ng GitHub / Notion). May maliit na toast doon kung bakit (?already=1).
  if (signedIn && /\/(signin|create-account)\.html$/.test(location.pathname)) {
    const next = new URLSearchParams(location.search).get("next");
    location.replace(
      BASE + "pages/" + (GUARDED[next] || "tasks.html") + "?already=1",
    );
    return;
  }

  // ---------- 2. HEADER STATE ----------
  if (signedIn) document.documentElement.classList.add("is-member");

  // ---------- player (ang "object" na pinupuno sa blueprint) ----------
  const DEFAULT_PLAYER = {
    name: "Alex Rivera",
    email: DEMO_EMAIL,
    avatar: "lime",
  };
  function loadPlayer() {
    try {
      const p = JSON.parse(read(PLAYER_KEY));
      return p && p.name
        ? Object.assign({}, DEFAULT_PLAYER, p)
        : Object.assign({}, DEFAULT_PLAYER);
    } catch (err) {
      return Object.assign({}, DEFAULT_PLAYER);
    }
  }
  function savePlayer(p) {
    write(PLAYER_KEY, JSON.stringify(p));
  }

  // ---------- sariling data bawat account ----------
  // Bawat account may sariling board, XP at notifications sa localStorage.
  // Ang demo ang gumagamit ng dating pangalan (kaya hindi nawala ang naka-save na).
  //   demo:  questify.board.v1           bago: questify.board.v1:email@site.com
  const ME = loadPlayer();
  const IS_DEMO = ME.email === DEMO_EMAIL;
  const SUFFIX = IS_DEMO ? "" : ":" + ME.email;
  const BOARD_KEY = "questify.board.v1" + SUFFIX; // dito nagsa-save ang Tasks page
  const STARTING_XP = IS_DEMO ? DEMO_XP : 0;
  // Para mabasa ng tasks.js (nauuna ang nav.js sa <head>)
  window.questifyAccount = { boardKey: BOARD_KEY, isDemo: IS_DEMO };

  // Demo board: 16 sample quests + 1,450 XP (Level 12). Dito na ginagawa (hindi sa
  // tasks.js lang) para pareho ang Tasks at Profile kahit alin ang unang buksan.
  // Relative sa araw ngayon ang due dates, kaya laging may overdue at paparating.
  window.questifyDemoBoard = function () {
    const XP_BY_PRIORITY = { low: 10, medium: 20, high: 30 };
    const pad = (n) => String(n).padStart(2, "0");
    const isoFor = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const isoOffset = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return isoFor(d);
    };
    const parseIso = (iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      return new Date(y, m - 1, d);
    };
    let nextId = 1;
    const seedStart = Date.now() - 12 * 86400000;
    const seed = (title, desc, cat, priority, dueInDays, status) => {
      const n = nextId++;
      const due = isoOffset(dueInDays);
      const done = status === "done";
      return {
        id: "q" + n,
        title,
        desc,
        cat,
        priority,
        status,
        due,
        earned: done ? XP_BY_PRIORITY[priority] : null,
        completed: done ? parseIso(due).getTime() + 18 * 3600000 : null,
        added: seedStart + n * 3 * 3600000,
        rank: n,
      };
    };
    const quests = [
      seed(
        "Send client proposal",
        "Attach the PDF and hit send before noon.",
        "work",
        "high",
        2,
        "todo",
      ),
      seed(
        "Inbox zero",
        "Leave the work inbox at zero before you log off.",
        "work",
        "low",
        -1,
        "todo",
      ),
      seed(
        "Draft weekly report",
        "One page. What moved. What is next.",
        "work",
        "medium",
        3,
        "todo",
      ),
      seed(
        "Outline lecture notes",
        "Headings only — the full write-up can wait.",
        "growth",
        "medium",
        4,
        "todo",
      ),
      seed(
        "Pack gym bag",
        "Shoes, bottle, headphones. Night-before so morning is easy.",
        "health",
        "low",
        0,
        "todo",
      ),
      seed(
        "Call the supplier",
        "Confirm the Friday delivery window.",
        "work",
        "high",
        5,
        "todo",
      ),
      seed(
        "Read 20 pages",
        "Stay in the same book. Twenty real pages.",
        "growth",
        "medium",
        -2,
        "doing",
      ),
      seed(
        "Refactor login form",
        "Labels, errors, and the gold / lime buttons.",
        "work",
        "high",
        1,
        "doing",
      ),
      seed(
        "30-min walk",
        "Outside. Phone stays in a pocket.",
        "health",
        "medium",
        0,
        "doing",
      ),
      seed(
        "Watch one course module",
        "One module, notes in the same sitting.",
        "growth",
        "medium",
        2,
        "doing",
      ),
      seed(
        "45-min run",
        "Easy pace. It counted.",
        "health",
        "medium",
        -1,
        "done",
      ),
      seed(
        "Morning stretch",
        "Ten minutes before the first meeting.",
        "health",
        "low",
        -2,
        "done",
      ),
      seed(
        "Ship slide deck",
        "Sent. Not perfect. Sent.",
        "work",
        "high",
        -3,
        "done",
      ),
      seed(
        "Journal half a page",
        "What actually happened today.",
        "growth",
        "low",
        -3,
        "done",
      ),
      seed(
        "Water plants / walk",
        "Two minutes. Then a loop around the block.",
        "health",
        "low",
        -4,
        "done",
      ),
      seed(
        "Plan next week",
        "Pick the top three quests.",
        "work",
        "medium",
        -5,
        "done",
      ),
    ];
    return { quests, xp: [{ id: null, xp: DEMO_XP }], nextId };
  };

  window.questifyDebugShowRankUp = showRankUp; // TEMP: para lang sa testing, tanggalin bago i-launch

  // Total XP = sum ng XP ledger na sine-save ng Tasks page.
  // Kung wala pa: 1,450 sa demo, 0 sa bagong account.
  function savedXp() {
    try {
      const total = JSON.parse(read(BOARD_KEY)).xp.reduce(
        (sum, entry) => sum + entry.xp,
        0,
      );
      return Number.isFinite(total) ? total : STARTING_XP;
    } catch (err) {
      return STARTING_XP;
    }
  }
  const levelFor = (total) => Math.floor(total / XP_PER_LEVEL) + 1;
  const rankFor = (total) => RANKS.filter((r) => total >= r.xp).pop().name;
  const toNext = (total) => XP_PER_LEVEL - (total % XP_PER_LEVEL);
  const pctFor = (total) => ((total % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  const RANK_INDEX = (name) => RANKS.findIndex((r) => r.name === name);
  // Natatandaan ang huling rank na nakita, para malaman kung "umakyat" talaga
  // (hindi lang naka-refresh). Nase-set ulit tuwing bukas ng page.
  let currentRank = rankFor(savedXp());

  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  // ---------- 3. BLUEPRINTS (isang design, pinupuno ng data) ----------
  const ICON = {
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  };

  // Player card (Alex ▾). Yung ids na levelPill / levelNum / levelXp / levelFill
  // ay ginagamit din ng tasks.js para gumalaw ang XP pag Mark done / Undo.
  function playerCardHtml(p, total) {
    return `
      <div class="acct-menu player-card" id="acctMenu" role="menu" hidden>
        <div class="pc-head">
          <span class="pc-avatar"><img src="${BASE}assets/avatars/avatar-${p.avatar === "gold" ? "gold" : "lime"}-slime-256.png" alt=""></span>
          <span class="pc-id">
            <span class="acct-name">${esc(p.name)}</span>
            <span class="acct-email">${esc(p.email)}</span>
          </span>
        </div>
        <div class="acct-level" id="levelPill" data-level="${levelFor(total)}">
          <div class="row"><span><b id="levelNum">Level ${levelFor(total)}</b> · <span id="levelRank">${rankFor(total)}</span></span><span id="levelXp">${total.toLocaleString("en-US")} XP</span></div>
          <div class="acct-bar"><span class="level-fill" id="levelFill" style="width:${pctFor(total)}%"></span></div>
          <small id="levelNext">${toNext(total)} XP to Level ${levelFor(total) + 1}</small>
        </div>
        <button type="button" class="acct-item" role="menuitem" aria-disabled="true" title="Coming soon">${ICON.gear} Settings</button>
        <div class="acct-sep"></div>
        <button type="button" class="acct-item danger" role="menuitem" data-signout>${ICON.out} Sign out</button>
        <div class="pc-foot"><span>Privacy Policy</span><span>Terms of Service</span></div>
      </div>`;
  }

  // ---------- NOTIFICATIONS (starter para kay Abigail) ----------
  // Bawat notification ay isang object: { id, type, quest, title, text, at, read }
  //   type 'done'    = natapos ang quest ("+30 XP")
  //   type 'levelup' = umakyat ng level
  //   type 'overdue' = lumampas na sa due date (isa lang bawat quest)
  // Para magdagdag ng bagong klase: bagong type + icon sa NOTIF_STYLE, tapos
  // tawagin ang addNotif({...}) kung saan nangyari yung event.
  const NOTIF_KEY = "questify.notifs" + SUFFIX; // bawat account may sarili
  const NOTIF_MAX = 20;
  const OVERDUE_SEEN_KEY = "questify.notifs.overdueSeen" + SUFFIX;
  const NOTIF_STYLE = {
    done: {
      tone: "lime",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    },
    levelup: {
      tone: "gold",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
    },
    // Bagong rank (Novice → Apprentice → Adventurer → Veteran → Master)
    rankup: {
      tone: "teal",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l3 6 6 .9-4.5 4.3 1 6.3L12 17.5 6.5 20.5l1-6.3L3 9.9 9 9z"/><path d="M12 8v5"/></svg>',
    },
    overdue: {
      tone: "red",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    },
  };

  function loadNotifs() {
    try {
      const list = JSON.parse(read(NOTIF_KEY));
      return Array.isArray(list)
        ? list.filter((n) => n && NOTIF_STYLE[n.type]).map(modernize)
        : [];
    } catch (err) {
      return [];
    }
  }

  // Lumang notifications (bago ang Sep 27): gawing bagong wording para pare-pareho
  function modernize(n) {
    let m;
    if (n.type === "done" && (m = /^Quest done: (.*)$/.exec(n.title))) {
      const xp = (/\+\d+ XP/.exec(n.text) || ["XP"])[0];
      return Object.assign({}, n, {
        title: "Quest completed",
        text: `${m[1]} · ${xp} added to your total.`,
      });
    }
    if (n.type === "overdue" && (m = /^Overdue: (.*)$/.exec(n.title))) {
      return Object.assign({}, n, {
        title: "Quest overdue",
        text: `${m[1]} ${n.text.replace(/^Was/, "was")}.`,
      });
    }
    if (
      n.type === "levelup" &&
      (m = /Level (\d+)/.exec(n.title)) &&
      /^Level up!/.test(n.title)
    ) {
      const rank = n.text.replace(/^New rank: /, "");
      return Object.assign({}, n, {
        title: `Level ${m[1]} reached`,
        text: `You're now ${/^[aeiou]/i.test(rank) ? "an" : "a"} ${rank}.`,
      });
    }
    return n;
  }
  function saveNotifs(list) {
    write(NOTIF_KEY, JSON.stringify(list.slice(0, NOTIF_MAX)));
  }

  // Label sa maliit na chip ng bawat notification
  const NOTIF_CHIP = {
    done: "Quest",
    levelup: "Level up",
    rankup: "Rank up",
    overdue: "Overdue",
  };

  function timeAgo(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return "Just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    if (s < 172800) return "Yesterday";
    return Math.floor(s / 86400) + " days ago";
  }

  // Blueprint ng ISANG notification.
  // "Quest completed" at "Quest overdue" = puwedeng i-click (bubukas ang details ng quest).
  function notifItemHtml(n) {
    const style = NOTIF_STYLE[n.type];
    const opens = (n.type === "done" || n.type === "overdue") && n.quest;
    const tag = opens ? "button" : "div";
    const attrs = opens
      ? ` type="button" data-open-quest="${esc(n.quest)}" data-notif-id="${esc(n.id)}" title="View quest"`
      : "";
    return `
        <${tag} class="np-item${n.read ? "" : " unread"}${opens ? " opens" : ""}"${attrs}>
          ${n.read ? "" : '<span class="np-dot" aria-hidden="true"></span>'}
          <span class="np-ico ${style.tone}">${style.icon}</span>
          <span class="np-main">
            <span class="np-title">${esc(n.title)}${n.read ? "" : '<span class="sr-only"> (unread)</span>'}</span>
            <span class="np-text">${esc(n.text)}</span>
            <span class="np-meta"><span class="np-chip ${style.tone}">${NOTIF_CHIP[n.type]}</span><time class="np-time">${timeAgo(n.at)}</time></span>
          </span>
        </${tag}>`;
  }

  // Aling tab ang bukas: "all", "unread" o "overdue"
  let notifTab = "all";
  const NOTIF_EMPTY = {
    all: [
      "No notifications yet",
      "Finished quests, level ups and late quests will show up here.",
    ],
    unread: ["You're all caught up", "There are no unread notifications."],
    overdue: ["No overdue quests", "Late quests will show up here."],
  };

  function notifPanelHtml() {
    return `
      <div class="notif-panel" id="notifPanel" role="dialog" aria-label="Notifications" hidden>
        <div class="np-head"><h3>Notifications</h3><button type="button" class="np-link" data-notif-readall hidden>Mark all as read</button></div>
        <div class="np-tabs" id="notifTabs"></div>
        <div id="notifBody"></div>
        <div class="np-foot" id="notifFoot"></div>
      </div>`;
  }

  // I-drawing ulit ang panel + yung dot sa bell (kung may hindi pa nababasa)
  function paintNotifs() {
    const list = loadNotifs();
    const unread = list.filter((n) => !n.read).length;
    const btn = document.getElementById("notifBtn");
    if (btn) {
      btn.classList.toggle("has-unread", unread > 0);
      btn.setAttribute(
        "aria-label",
        unread ? `Notifications, ${unread} unread` : "Notifications",
      );
    }
    const panel = document.getElementById("notifPanel");
    if (!panel) return;

    const tab = (key, label, count) =>
      `<button type="button" class="np-tab${notifTab === key ? " on" : ""}" data-np-tab="${key}" aria-pressed="${notifTab === key}">${label}${count ? ` <span class="np-count">${count}</span>` : ""}</button>`;
    document.getElementById("notifTabs").innerHTML =
      tab("all", "All") +
      tab("unread", "Unread", unread) +
      tab("overdue", "Overdue", 0);

    const shown =
      notifTab === "unread"
        ? list.filter((n) => !n.read)
        : notifTab === "overdue"
          ? list.filter((n) => n.type === "overdue")
          : list;
    const [emptyTitle, emptyText] = NOTIF_EMPTY[notifTab];
    document.getElementById("notifBody").innerHTML = shown.length
      ? `<div class="np-list">${shown.map(notifItemHtml).join("")}</div>`
      : `<div class="np-empty"><span class="np-ico">${ICON.bell}</span><b>${emptyTitle}</b><small>${emptyText}</small></div>`;

    panel.querySelector("[data-notif-readall]").hidden = unread === 0;
    const foot = document.getElementById("notifFoot");
    foot.hidden = list.length === 0;
    foot.innerHTML = `<span>${list.length} notification${list.length === 1 ? "" : "s"}</span><button type="button" class="np-link" data-notif-clear>Clear all</button>`;
  }

  function addNotif(n) {
    const list = loadNotifs();
    list.unshift(
      Object.assign(
        {
          id: "n" + Date.now() + Math.random().toString(36).slice(2, 6),
          at: Date.now(),
          read: false,
        },
        n,
      ),
    );
    saveNotifs(list);
    paintNotifs();
  }

  // ---------- header: dropdowns (Alex ▾ at bell) ----------
  function setupHeader() {
    const player = loadPlayer();
    const total = savedXp();

    document.querySelectorAll("[data-acct-name]").forEach((el) => {
      el.textContent = player.name.split(" ")[0];
    });

    const acctWrap = document.querySelector(".acct-wrap");
    const notifWrap = document.querySelector(".notif-wrap");
    if (acctWrap)
      acctWrap.insertAdjacentHTML("beforeend", playerCardHtml(player, total));
    if (notifWrap) notifWrap.insertAdjacentHTML("beforeend", notifPanelHtml());

    const pairs = [
      [document.getElementById("acctBtn"), document.getElementById("acctMenu")],
      [
        document.getElementById("notifBtn"),
        document.getElementById("notifPanel"),
      ],
    ].filter(([btn, panel]) => btn && panel);

    function closeAll(except) {
      pairs.forEach(([btn, panel]) => {
        if (panel === except) return;
        panel.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      });
    }

    pairs.forEach(([btn, panel]) => {
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const open = panel.hidden;
        closeAll(panel);
        panel.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
      });
    });

    // Click sa labas o Esc = sarado
    // composedPath: dinaanan ng click (gumagana kahit na-redraw na yung pinindot, hal. tab sa bell)
    document.addEventListener("click", (e) => {
      const inside = e
        .composedPath()
        .some(
          (el) =>
            el.classList &&
            (el.classList.contains("acct-wrap") ||
              el.classList.contains("notif-wrap")),
        );
      if (!inside) closeAll();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      hideRankUp();
      const open = pairs.find(([, panel]) => !panel.hidden);
      closeAll();
      if (open) open[0].focus();
    });

    // ---------- 5. SIGN OUT (may confirm popup muna, bug ni Abigail) ----------
    // Parehong itsura ng confirm popup ng Mark done (.modal.cm), pero ginagawa
    // dito sa nav.js para gumana sa lahat ng page na may player card.
    let signOutModal = null;
    let signOutReturn = null;

    function doSignOut() {
      write(SIGNED_IN_KEY, null); // flag lang ang binubura, naiiwan ang quests at XP
      location.href = BASE + "index.html?signedout=1";
    }

    function closeSignOut() {
      if (!signOutModal || signOutModal.hidden) return;
      signOutModal.hidden = true;
      document.body.classList.remove("modal-open");
      if (signOutReturn && signOutReturn.isConnected) signOutReturn.focus();
    }

    function buildSignOut() {
      const back = document.createElement("div");
      back.className = "modal-back so-back";
      back.hidden = true;
      back.innerHTML = `
        <div class="modal cm so-modal" role="alertdialog" aria-modal="true" aria-labelledby="soTitle" aria-describedby="soText">
          <button type="button" class="cm-x" data-so-close aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <h2 id="soTitle">Sign out?</h2>
          <p id="soText">Your quests and XP stay saved on this device. Sign back in anytime to continue.</p>
          <div class="cm-quest so-player">
            <img alt="" width="40" height="40">
            <div><b></b><small></small></div>
          </div>
          <div class="modal-actions cm-actions">
            <button type="button" class="btn-outline fx" data-so-close>Cancel</button>
            <button type="button" class="btn-rose fx" data-so-ok>Sign out</button>
          </div>
        </div>`;
      // Pangalan at email = textContent (hindi innerHTML), para ligtas
      back.querySelector(".so-player img").src =
        `${BASE}assets/avatars/avatar-${player.avatar === "gold" ? "gold" : "lime"}-slime-256.png`;
      back.querySelector(".so-player b").textContent = player.name;
      back.querySelector(".so-player small").textContent = player.email || "";

      let pressedBackdrop = false;
      back.addEventListener("mousedown", (e) => {
        pressedBackdrop = e.target === back;
      });
      back.addEventListener("click", (e) => {
        if (e.target.closest("[data-so-ok]")) doSignOut();
        else if (
          e.target.closest("[data-so-close]") ||
          (pressedBackdrop && e.target === back)
        )
          closeSignOut();
      });
      // Esc = sara; Tab = paikot lang sa loob ng popup
      back.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          closeSignOut();
          return;
        }
        if (e.key !== "Tab") return;
        const items = [...back.querySelectorAll("button")];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
      document.body.appendChild(back);
      return back;
    }

    function openSignOut() {
      if (!signOutModal) signOutModal = buildSignOut();
      signOutReturn = document.getElementById("acctBtn");
      closeAll();
      signOutModal.hidden = false;
      document.body.classList.add("modal-open");
      // Sa Cancel ang focus, para hindi aksidenteng ma-sign out sa Enter
      signOutModal.querySelector("[data-so-close].btn-outline").focus();
    }

    document.querySelectorAll("[data-signout]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openSignOut();
      });
    });

    document.addEventListener("questify:xp", (e) => {
      const t = e.detail.total;
      const rankName = rankFor(t);
      const rankEl = document.getElementById("levelRank");
      const next = document.getElementById("levelNext");
      if (rankEl) rankEl.textContent = rankName;
      if (next)
        next.textContent = `${toNext(t)} XP to Level ${levelFor(t) + 1}`;
      const acctBtn = document.getElementById("acctBtn");
      if (e.detail.change && acctBtn) {
        acctBtn.classList.remove("xp-bump");
        void acctBtn.offsetWidth; // para mag-restart ang animation
        acctBtn.classList.add("xp-bump");
      }

      // Rank up lang (hindi rank down, hal. galing sa Undo done).
      // Popup lang dito; ang "Rank up" notification ay nasa questify:quest-done sa baba.
      if (
        rankName !== currentRank &&
        RANK_INDEX(rankName) > RANK_INDEX(currentRank)
      ) {
        showRankUp(rankName, t);
      }
      currentRank = rankName;
    });

    // ---------- notifications ----------
    paintNotifs();
    const notifBtn = document.getElementById("notifBtn");
    const notifPanel = document.getElementById("notifPanel");
    if (notifBtn && notifPanel) {
      // Pagbukas: i-refresh lang ang oras ("2 min ago"). Hindi na awtomatikong
      // "read" lahat — may sariling "Mark all as read" na button.
      notifBtn.addEventListener("click", () => {
        if (!notifPanel.hidden) paintNotifs();
      });
      notifPanel.addEventListener("click", (e) => {
        // Click sa "Quest completed" / "Quest overdue" = buksan ang quest sa Tasks
        const item = e.target.closest("[data-open-quest]");
        if (item) {
          const id = item.dataset.openQuest;
          saveNotifs(
            loadNotifs().map((n) =>
              n.id === item.dataset.notifId
                ? Object.assign(n, { read: true })
                : n,
            ),
          );
          paintNotifs();
          closeAll();
          if (document.getElementById("board")) {
            // Nasa Tasks na: sabihan ang tasks.js
            document.dispatchEvent(
              new CustomEvent("questify:open-quest", { detail: { id } }),
            );
          } else {
            location.href =
              BASE + "pages/tasks.html?quest=" + encodeURIComponent(id);
          }
          return;
        }
        const tab = e.target.closest("[data-np-tab]");
        if (tab) {
          notifTab = tab.dataset.npTab;
          paintNotifs();
          notifPanel.querySelector(`[data-np-tab="${notifTab}"]`).focus();
          return;
        }
        if (e.target.closest("[data-notif-readall]")) {
          saveNotifs(loadNotifs().map((n) => Object.assign(n, { read: true })));
          paintNotifs();
          notifPanel.querySelector(".np-tab.on").focus();
          return;
        }
        if (e.target.closest("[data-notif-clear]")) {
          notifTab = "all";
          saveNotifs([]);
          paintNotifs();
          notifBtn.focus();
        }
      });
    }

    // "a Master" / "an Adventurer"
    const withArticle = (word) =>
      (/^[aeiou]/i.test(word) ? "an " : "a ") + word;

    document.addEventListener("questify:quest-done", (e) => {
      const d = e.detail;
      addNotif({
        type: "done",
        quest: d.id,
        title: "Quest completed",
        text: `${d.title} · +${d.xp} XP added to your total.`,
      });
      const total = savedXp();
      if (d.leveledUp) {
        addNotif({
          type: "levelup",
          quest: d.id,
          title: `Level ${d.level} reached`,
          text: `Keep going: ${toNext(total)} XP to Level ${d.level + 1}.`,
        });
      }
      // Umakyat din ba ng rank? (hal. 300 XP = Adventurer)
      const rankNow = rankFor(total);
      if (rankFor(total - d.xp) !== rankNow) {
        const next = RANKS.find((r) => r.xp > total);
        addNotif({
          type: "rankup",
          quest: d.id,
          title: `New rank: ${rankNow}`,
          text: next
            ? `You're now ${withArticle(rankNow)}. Next: ${next.name} at ${next.xp.toLocaleString("en-US")} XP.`
            : "You reached the top rank. Well played.",
        });
      }
    });
    // Undo: tanggalin ang "Quest done" / "Level up" ng quest na binawi (hindi ang "Overdue")
    document.addEventListener("questify:quest-undo", (e) => {
      // Pagkatapos ng Undo, bumaba ang XP: tanggalin din ang "Level N reached" at
      // "New rank" na hindi na totoo (hal. Master pa sa bell pero Veteran na ngayon)
      const total = savedXp();
      const levelNow = levelFor(total);
      const rankNow = RANKS.findIndex((r) => r.name === rankFor(total));
      const stillTrue = (n) => {
        if (n.type === "levelup") {
          const m = /Level (\d+)/.exec(n.title || "");
          return !m || Number(m[1]) <= levelNow;
        }
        if (n.type === "rankup") {
          const i = RANKS.findIndex((r) => (n.title || "").endsWith(r.name));
          return i === -1 || i <= rankNow;
        }
        return true;
      };
      saveNotifs(
        loadNotifs().filter(
          (n) =>
            (n.quest !== e.detail.id || n.type === "overdue") && stillTrue(n),
        ),
      );
      paintNotifs();
    });

    // Overdue: isang notification bawat quest. Tinatandaan kung alin na ang
    // na-notify, para hindi bumalik kahit i-refresh o i-"Clear all".
    document.addEventListener("questify:overdue", (e) => {
      let seen = [];
      try {
        seen = JSON.parse(read(OVERDUE_SEEN_KEY)) || [];
      } catch (err) {
        seen = [];
      }
      const fresh = e.detail.quests.filter((q) => !seen.includes(q.id));
      fresh.forEach((q) => {
        addNotif({
          type: "overdue",
          quest: q.id,
          title: "Quest overdue",
          text: `${q.title} was due ${q.due}.`,
        });
      });
      if (fresh.length)
        write(
          OVERDUE_SEEN_KEY,
          JSON.stringify(seen.concat(fresh.map((q) => q.id))),
        );
    });
  }

  // Tasks: galing sa Sign in / Create account pero naka-sign in na (tingnan ang GUARD)
  function alreadySignedInToast() {
    const url = new URL(location.href);
    if (!url.searchParams.has("already")) return;
    url.searchParams.delete("already");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    // setTimeout: pagkatapos ng ibang toast sa pagbukas (hal. "overdue" ng Tasks),
    // kasi ito ang paliwanag kung bakit sila napunta rito
    setTimeout(() =>
      window.questifyToast({
        tone: "info",
        title: `You're already signed in as ${ME.name}`,
        text: "To use another account, sign out from the menu at the top right first.",
      }),
    );
  }

  // Home: kapag naka-sign in, ang "Create free account" sa baba ay nagiging
  // "Open your Quest Board" (JS lang, hindi ginalaw ang HTML ng Home)
  function memberFinalCta() {
    const cta = document.querySelector(".final-cta");
    if (!cta || !signedIn) return;
    const title = cta.querySelector("h2");
    const btn = cta.querySelector(".btn-primary");
    const note = cta.querySelector(".cta-note");
    if (title) title.innerHTML = "Ready for today’s<br>quests?";
    if (btn) {
      btn.href = BASE + "pages/tasks.html";
      btn.textContent = "Open your Quest Board";
    }
    if (note)
      note.textContent = `Pick up where you left off, ${ME.name.split(" ")[0]}.`;
  }

  // Home: maliit na toast pagkatapos mag-Sign out
  function signedOutToast() {
    const url = new URL(location.href);
    if (!url.searchParams.has("signedout")) return;
    url.searchParams.delete("signedout");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    window.questifyToast({
      tone: "info",
      title: "Signed out",
      text: "Your quests stay saved in this browser.",
    });
  }

  // ---------- 4. FORMS (Sign in / Create account) ----------
  function setupAuthForm() {
    const form = document.querySelector("form.auth-card");
    if (!form) return;

    // Saan pupunta pagkatapos: yung page na gusto nila kanina, o Tasks.
    const next = new URLSearchParams(location.search).get("next");
    const target = BASE + "pages/" + (GUARDED[next] || "tasks.html");

    // Notice kung galing sila sa Tasks / Profile na naka-sign out
    const notice = document.getElementById("authNotice");
    if (notice && GUARDED[next]) {
      document.getElementById("authNoticeText").textContent =
        next === "profile"
          ? "Sign in to see your profile."
          : "Sign in to open your Quest Board.";
      notice.hidden = false;
    }
    // Dalhin din yung ?next= kapag lumipat sa kabilang tab
    if (GUARDED[next]) {
      form.querySelectorAll(".tabs a").forEach((a) => {
        a.href += "?next=" + encodeURIComponent(next);
      });
    }

    // Show / Hide ng password
    form.querySelectorAll(".show-btn").forEach((btn) => {
      const input = document.getElementById(btn.getAttribute("aria-controls"));
      btn.addEventListener("click", () => {
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        btn.textContent = reveal ? "Hide" : "Show";
        btn.setAttribute("aria-pressed", String(reveal));
      });
    });

    // Kami na ang nagche-check (hindi yung maliit na popup ng browser),
    // para pare-pareho ang itsura ng errors: pulang text sa ilalim ng field.
    form.noValidate = true;
    const isSignup = form.id === "signupForm";
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const name = document.getElementById("name");
    const confirm = document.getElementById("confirm");
    const submitBtn = form.querySelector(".auth-submit");

    // Bawat field na nagbago, tanggal ang sarili niyang error (at yung "incorrect" na alert)
    [email, password, name, confirm].forEach((input) => {
      if (!input) return;
      input.addEventListener("input", () => {
        fieldError(input, null);
        formAlert(form, null);
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault(); // walang server: dito na lang natin hinahawakan
      formAlert(form, null);
      const mail = email.value.trim().toLowerCase();
      const errors = [];
      const check = (input, msg) => {
        fieldError(input, msg);
        if (msg) errors.push(input);
      };

      if (isSignup) {
        check(name, name.value.trim() ? null : "Enter a display name.");
      }
      check(
        email,
        !mail
          ? "Enter your email address."
          : !EMAIL_RE.test(mail)
            ? "Enter a full email address, like name@example.com."
            : null,
      );
      if (isSignup) {
        check(
          password,
          password.value.length < 8 ? "Use at least 8 characters." : null,
        );
        check(
          confirm,
          !confirm.value
            ? "Type your password again."
            : confirm.value !== password.value
              ? "Passwords don't match."
              : null,
        );
        if (!errors.length && findAccount(mail)) {
          const signinHref = form.querySelector('.tabs a[href*="signin"]').href;
          fieldError(
            email,
            `An account with this email already exists. <a href="${signinHref}">Sign in instead</a>`,
            true,
          );
          errors.push(email);
        }
      } else {
        check(password, password.value ? null : "Enter your password.");
      }
      if (errors.length) {
        errors[0].focus();
        return;
      }

      submitBtn.disabled = true;
      try {
        let player;
        if (isSignup) {
          // Yung avatar radios ay nasa kaliwa (labas ng <form>), kaya form.elements ang gamit
          const avatar = form.elements.namedItem("avatar");
          const salt = randomHex(16);
          const account = {
            email: mail,
            name: name.value.trim(),
            avatar: avatar && avatar.value === "gold" ? "gold" : "lime",
            salt,
            hash: await hashPassword(password.value, salt),
            created: Date.now(),
          };
          saveAccounts(loadAccounts().concat(account));
          player = account;
        } else {
          player = await checkLogin(mail, password.value);
          if (!player) {
            formAlert(form, "Email or password is incorrect.");
            password.value = "";
            password.focus();
            return;
          }
        }
        savePlayer({
          name: player.name,
          email: player.email,
          avatar: player.avatar,
        });
        write(SIGNED_IN_KEY, "1");
        location.href = target;
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ---------- accounts (naka-save lang sa browser na 'to) ----------
  // Demo account para sa mentor at testers. Ang ibang account ay galing sa
  // Create account. HINDI sine-save ang totoong password: "hash" lang
  // (scrambled na bersyon) + salt, gaya ng ginagawa ng totoong websites.
  // Paalala: demo pa rin 'to — walang server, kaya hindi totoong security.
  const ACCOUNTS_KEY = "questify.accounts";
  const DEMO = {
    email: DEMO_EMAIL,
    password: "12345678",
    name: "Alex Rivera",
    avatar: "lime",
  };
  // name@site.com: may @, may tuldok sa domain, at 2+ letra sa dulo (.com, .ph)
  const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

  function loadAccounts() {
    try {
      const list = JSON.parse(read(ACCOUNTS_KEY));
      return Array.isArray(list)
        ? list.filter((a) => a && a.email && a.hash && a.salt)
        : [];
    } catch (err) {
      return [];
    }
  }
  function saveAccounts(list) {
    write(ACCOUNTS_KEY, JSON.stringify(list));
  }
  function findAccount(mail) {
    if (mail === DEMO.email) return DEMO;
    return loadAccounts().find((a) => a.email === mail) || null;
  }

  function randomHex(bytes) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // SHA-256 (Web Crypto). Kung wala (hal. binuksan bilang file://), simpleng
  // fallback hash para hindi pa rin naka-save ang totoong password.
  async function hashPassword(pw, salt) {
    const text = salt + ":" + pw;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(text),
      );
      return [...new Uint8Array(buf)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    let h = 0x811c9dc5;
    for (let r = 0; r < 1000; r++) {
      for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
    }
    return "fnv-" + h.toString(16);
  }

  async function checkLogin(mail, pw) {
    const acc = findAccount(mail);
    if (!acc) return null;
    if (acc === DEMO) return pw === DEMO.password ? DEMO : null;
    return (await hashPassword(pw, acc.salt)) === acc.hash ? acc : null;
  }

  // Pulang text sa ilalim ng isang field (null = tanggalin)
  function fieldError(input, msg, allowLink = false) {
    const field = input.closest(".field");
    let p = field.querySelector(".field-err");
    field.classList.toggle("has-err", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (!msg) {
      if (p) p.remove();
      input.removeAttribute("aria-describedby");
      return;
    }
    if (!p) {
      p = document.createElement("p");
      p.className = "field-err";
      p.id = input.id + "Err";
      // Diretso sa ilalim ng box (bago yung hint, kung meron)
      (input.closest(".in-wrap") || input).after(p);
    }
    p.innerHTML =
      svgIcon(TOAST_ICON.alert) + `<span>${allowLink ? msg : esc(msg)}</span>`;
    input.setAttribute("aria-describedby", p.id);
  }

  // Isang message sa taas ng button (hal. mali ang email o password)
  function formAlert(form, msg) {
    let box = form.querySelector(".auth-alert");
    if (!msg) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.className = "auth-alert";
      box.setAttribute("role", "alert");
      form.querySelector(".auth-submit").before(box);
    }
    box.innerHTML = svgIcon(TOAST_ICON.alert) + `<span>${esc(msg)}</span>`;
  }

  // Hintayin munang ma-load yung HTML bago galawin ang header at forms.
  // (Nauuna 'to sa tasks.js, kaya andyan na ang player card pag nag-start ang Tasks.)
  // =====================================================================
  // BACKGROUND MUSIC (lahat ng page, kasama Sign in at Create account)
  // - Tumutugtog pagka-click o pindot mo sa page (bawal sa browser ang tunog
  //   bago ka mag-interact).
  // - Pinatay mo = patay sa buong pagbisita sa tab na ito (lahat ng page).
  //   Bagong bisita / bagong tab = tutugtog ulit sa unang click (gusto ni
  //   Abigail, para ma-engage ang bisita). Kaya sessionStorage, hindi localStorage.
  // - Tuloy-tuloy paglipat ng page: tinatandaan kung nasaan na yung kanta.
  // - Hover (o keyboard focus) sa button = volume slider sa kaliwa.
  // - Walang music HTML sa ibang page, kaya dito ginagawa yung audio at button.
  // =====================================================================
  const MUSIC_KEY = "questify.music"; // localStorage: { volume }
  const MUSIC_TIME_KEY = "questify.music.time"; // sessionStorage: nasaan na yung kanta
  const MUSIC_OFF_KEY = "questify.music.off"; // sessionStorage: pinatay sa tab na ito

  function setupMusic() {
    let prefs = {};
    try {
      prefs = JSON.parse(read(MUSIC_KEY)) || {};
    } catch (err) {
      prefs = {};
    }
    delete prefs.off; // lumang setting ("naka-mute dati"), hindi na ginagamit
    const savePrefs = () => write(MUSIC_KEY, JSON.stringify(prefs));

    let audio = document.getElementById("bg-music");
    let btn = document.getElementById("music-toggle");
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "bg-music";
      audio.loop = true;
      audio.preload = "auto";
      audio.src = BASE + "assets/audio/bg-music.mp3";
      document.body.appendChild(audio);
    }
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "music-toggle";
      btn.className = "music-btn";
      btn.innerHTML =
        '<svg class="icon-off" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>' +
        '<svg class="icon-on" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
      document.body.appendChild(btn);
    }
    btn.setAttribute("aria-label", "Background music");

    // Button + volume slider sa iisang lalagyan (para hindi mawala ang hover sa pagitan)
    const ctl = document.createElement("div");
    ctl.className = "music-ctl";
    btn.before(ctl);
    ctl.appendChild(btn);
    ctl.insertAdjacentHTML(
      "afterbegin",
      `<div class="music-pop"><div class="music-pop-in">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
        <input type="range" id="musicVolume" min="0" max="100" step="5" aria-label="Music volume">
        <span class="music-pct" aria-hidden="true"></span>
      </div></div>`,
    );
    const slider = ctl.querySelector("#musicVolume");
    const pct = ctl.querySelector(".music-pct");

    const vol = Number(prefs.volume);
    audio.volume = Number.isFinite(vol) && vol >= 0 && vol <= 1 ? vol : 0.6;

    function showVolume() {
      const p = Math.round(audio.volume * 100);
      slider.value = p;
      slider.style.setProperty("--v", p + "%");
      slider.setAttribute("aria-valuetext", p + " percent");
      pct.textContent = p + "%";
    }
    function showOn(on) {
      btn.setAttribute("aria-pressed", String(on));
      btn.title = on ? "Pause music" : "Play music";
    }
    function saveTime() {
      try {
        sessionStorage.setItem(MUSIC_TIME_KEY, String(audio.currentTime || 0));
      } catch (err) {
        /* okay lang */
      }
    }
    async function play() {
      if (audio.volume === 0) {
        audio.volume = 0.6;
        showVolume();
      }
      try {
        await audio.play();
        return true;
      } catch (err) {
        return false;
      }
    }
    // Pinatay mo = tatandaan habang bukas ang tab (sessionStorage).
    // Bagong tab o bagong bisita = malinis ulit, tutugtog sa unang click.
    function isOff() {
      try {
        return sessionStorage.getItem(MUSIC_OFF_KEY) === "1";
      } catch (err) {
        return false;
      }
    }
    function setOff(off) {
      try {
        if (off) sessionStorage.setItem(MUSIC_OFF_KEY, "1");
        else sessionStorage.removeItem(MUSIC_OFF_KEY);
      } catch (err) {
        /* okay lang */
      }
    }
    function turnOff() {
      setOff(true);
      audio.pause();
    }
    function turnOn() {
      setOff(false);
      play();
    }

    audio.addEventListener("play", () => showOn(true));
    audio.addEventListener("pause", () => showOn(false));

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (audio.paused) turnOn();
      else turnOff();
    });

    slider.addEventListener("input", () => {
      audio.volume = slider.value / 100;
      prefs.volume = audio.volume;
      savePrefs();
      showVolume();
      // Tinaas ang volume habang naka-off = gusto nang marinig. Sa 0 = patay.
      if (audio.volume > 0 && audio.paused) turnOn();
      if (audio.volume === 0 && !audio.paused) turnOff();
    });

    window.addEventListener("pagehide", saveTime);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveTime();
    });

    showVolume();
    showOn(false);
    savePrefs(); // tanggalin ang lumang "off" sa naka-save
    if (isOff()) return; // pinatay sa tab na ito: hintayin na lang na i-on ulit sa button

    // Bawal ng browser ang tunog bago mag-interact, kaya tutugtog sa unang
    // click o pindot sa page (hindi sa music button mismo, siya na ang bahala doon).
    const onFirst = (e) => {
      if (ctl.contains(e.target)) return;
      stopWaiting();
      if (!isOff() && audio.paused) play();
    };
    const stopWaiting = () => {
      document.removeEventListener("pointerdown", onFirst, true);
      document.removeEventListener("keydown", onFirst, true);
    };
    document.addEventListener("pointerdown", onFirst, true);
    document.addEventListener("keydown", onFirst, true);
    audio.addEventListener("play", stopWaiting, { once: true });

    // Ituloy kung saan huminto sa kabilang page (kung papayagan ng browser, agad)
    const start = () => {
      let t = 0;
      try {
        t = Number(sessionStorage.getItem(MUSIC_TIME_KEY)) || 0;
      } catch (err) {
        t = 0;
      }
      if (t > 0) audio.currentTime = t;
      if (t > 0) play();
    };
    if (audio.readyState >= 1) start();
    else audio.addEventListener("loadedmetadata", start, { once: true });
  }

  // ---------- CUSTOM CURSOR (Cursorly, galing kay Abigail) ----------
  // Nandito (hindi sa app.js) para gumana sa lahat ng page, kasama Tasks at Profile.
  // Kailangan ng <script src=".../cursorly.min.js"> sa <head> ng page
  // (naka-lock sa version 1.0.5, para hindi masira pag may bagong labas).
  // Normal na cursor lang (at tuloy ang site) kapag:
  //  - hindi nag-load ang Cursorly (hal. offline)
  //  - touch screen ang gamit (phone/tablet: walang mouse, sayang sa battery)
  //  - naka-"reduce motion" ang device (ayaw ng gumagalaw na trail)
  function setupCursor() {
    if (!window.Cursorly) return;
    const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
    if (mq("(pointer: coarse)") || mq("(prefers-reduced-motion: reduce)"))
      return;
    try {
      const cur = window.Cursorly.init({
        cursor: 23, // index ng cursor icon
        effect: { name: "trail", color: "rainbow" },
      });
      // 1) Tama ang turo: naka-GITNA sa mouse ang drawing ng Cursorly (24px), pero ang
      //    dulo ng daliri ay nasa ~(8, 3) ng image. Kaya inuusog ang drawing para ang
      //    dulo ng daliri mismo ang nasa totoong puwesto ng mouse (click, highlight).
      const SIZE = 24;
      const TIP = { x: 8, y: 3 };
      if (cur && cur.mouse) {
        window.addEventListener("mousemove", (e) => {
          cur.mouse.x = e.clientX + SIZE / 2 - TIP.x;
          cur.mouse.y = e.clientY + SIZE / 2 - TIP.y;
        });
      }
      // 2) Walang stretch: kasing-laki ng window ang canvas (kasama ang scrollbar),
      //    pareho ng sukat na ginagamit ng Cursorly sa pag-drawing
      if (cur && cur.canvas) {
        cur.canvas.style.width = "100vw";
        cur.canvas.style.height = "100vh";
      }
      // Para sa CSS: itago ang cursor ng Windows sa lahat (pati buttons at links),
      // kung hindi may dalawang cursor sa ibabaw ng mga pinipindot
      document.documentElement.classList.add("has-custom-cursor");
    } catch (err) {
      /* okay lang: normal na cursor */
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupMusic();
    setupCursor();
    setupHeader();
    setupAuthForm();
    signedOutToast();
    alreadySignedInToast();
    memberFinalCta();
  });
})();
