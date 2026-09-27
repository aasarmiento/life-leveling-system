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
  const TOAST_DEFAULT_ICON = { ok: "check", lv: "star", info: "info", err: "alert" };
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
      TOAST_ICON[icon] || TOAST_ICON[TOAST_DEFAULT_ICON[tone]] || TOAST_ICON.info,
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

  const signedIn = read(SIGNED_IN_KEY) === "1";

  // ---------- 1. GUARD ----------
  const guard = document.documentElement.dataset.guard;
  if (guard && !signedIn) {
    location.replace(
      BASE + "pages/signin.html?next=" + encodeURIComponent(guard),
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
    if (n.type === "levelup" && (m = /Level (\d+)/.exec(n.title)) && /^Level up!/.test(n.title)) {
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
  const NOTIF_CHIP = { done: "Quest", levelup: "Level up", overdue: "Overdue" };

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
      const open = pairs.find(([, panel]) => !panel.hidden);
      closeAll();
      if (open) open[0].focus();
    });

    // ---------- 5. SIGN OUT ----------
    document.querySelectorAll("[data-signout]").forEach((btn) => {
      btn.addEventListener("click", () => {
        write(SIGNED_IN_KEY, null); // flag lang ang binubura, naiiwan ang quests at XP
        location.href = BASE + "index.html?signedout=1";
      });
    });

    // Tasks page: tuwing nagbabago ang XP, i-update din ang rank at "XP to Level",
    // at pa-"bump" ang Alex button para makita na may nagbago sa level mo.
    document.addEventListener("questify:xp", (e) => {
      const t = e.detail.total;
      const rank = document.getElementById("levelRank");
      const next = document.getElementById("levelNext");
      if (rank) rank.textContent = rankFor(t);
      if (next)
        next.textContent = `${toNext(t)} XP to Level ${levelFor(t) + 1}`;
      const acctBtn = document.getElementById("acctBtn");
      if (e.detail.change && acctBtn) {
        acctBtn.classList.remove("xp-bump");
        void acctBtn.offsetWidth; // para mag-restart ang animation
        acctBtn.classList.add("xp-bump");
      }
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
              n.id === item.dataset.notifId ? Object.assign(n, { read: true }) : n,
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
    const withArticle = (word) => (/^[aeiou]/i.test(word) ? "an " : "a ") + word;

    document.addEventListener("questify:quest-done", (e) => {
      const d = e.detail;
      addNotif({
        type: "done",
        quest: d.id,
        title: "Quest completed",
        text: `${d.title} · +${d.xp} XP added to your total.`,
      });
      if (d.leveledUp) {
        const total = savedXp();
        addNotif({
          type: "levelup",
          quest: d.id,
          title: `Level ${d.level} reached`,
          text: `You're now ${withArticle(rankFor(total))}. ${toNext(total)} XP to Level ${d.level + 1}.`,
        });
      }
    });
    // Undo: tanggalin ang "Quest done" / "Level up" ng quest na binawi (hindi ang "Overdue")
    document.addEventListener("questify:quest-undo", (e) => {
      saveNotifs(
        loadNotifs().filter(
          (n) => n.quest !== e.detail.id || n.type === "overdue",
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
        savePlayer({ name: player.name, email: player.email, avatar: player.avatar });
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
      svgIcon(TOAST_ICON.alert) +
      `<span>${allowLink ? msg : esc(msg)}</span>`;
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
  document.addEventListener("DOMContentLoaded", () => {
    setupHeader();
    setupAuthForm();
    signedOutToast();
  });
})();
