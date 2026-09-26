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
  const SIGNED_IN_KEY = 'questify.signedIn';
  const PLAYER_KEY = 'questify.player';
  const BOARD_KEY = 'questify.board.v1';   // dito nagsa-save ang Tasks page (tasks.js)
  const STARTING_XP = 1450;                // dapat pareho sa tasks.js
  const XP_PER_LEVEL = 125;                // dapat pareho sa tasks.js
  // Kapareho ng "Climb the ranks" sa Home (at ng demo sa app.js)
  const RANKS = [
    { name: 'Novice', xp: 0 },
    { name: 'Apprentice', xp: 100 },
    { name: 'Adventurer', xp: 300 },
    { name: 'Veteran', xp: 700 },
    { name: 'Master', xp: 1500 }
  ];
  // Yung pages na kailangan naka-sign in. Ang <html> nila ay may data-guard="...".
  const GUARDED = { tasks: 'tasks.html', profile: 'profile.html' };

  // Saan naka-lagay yung site (para gumana ang links sa index.html at sa pages/)
  const BASE = document.currentScript.src.replace(/js\/nav\.js.*$/, '');

  // Pwedeng naka-block yung storage (hal. private mode). Kung ganun, walang
  // natatandaan pero hindi rin mag-e-error.
  function read(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  }
  function write(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (err) { /* okay lang */ }
  }

  const signedIn = read(SIGNED_IN_KEY) === '1';

  // ---------- 1. GUARD ----------
  const guard = document.documentElement.dataset.guard;
  if (guard && !signedIn) {
    location.replace(BASE + 'pages/signin.html?next=' + encodeURIComponent(guard));
    return;
  }

  // ---------- 2. HEADER STATE ----------
  if (signedIn) document.documentElement.classList.add('is-member');

  // ---------- player (ang "object" na pinupuno sa blueprint) ----------
  const DEFAULT_PLAYER = { name: 'Alex Rivera', email: 'alex@email.com', avatar: 'lime' };
  function loadPlayer() {
    try {
      const p = JSON.parse(read(PLAYER_KEY));
      return p && p.name ? Object.assign({}, DEFAULT_PLAYER, p) : Object.assign({}, DEFAULT_PLAYER);
    } catch (err) {
      return Object.assign({}, DEFAULT_PLAYER);
    }
  }
  function savePlayer(p) {
    write(PLAYER_KEY, JSON.stringify(p));
  }

  // Total XP = sum ng XP ledger na sine-save ng Tasks page. Kung wala pa, 1,450.
  function savedXp() {
    try {
      const total = JSON.parse(read(BOARD_KEY)).xp.reduce((sum, entry) => sum + entry.xp, 0);
      return Number.isFinite(total) ? total : STARTING_XP;
    } catch (err) {
      return STARTING_XP;
    }
  }
  const levelFor = total => Math.floor(total / XP_PER_LEVEL) + 1;
  const rankFor = total => RANKS.filter(r => total >= r.xp).pop().name;
  const toNext = total => XP_PER_LEVEL - (total % XP_PER_LEVEL);
  const pctFor = total => ((total % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- 3. BLUEPRINTS (isang design, pinupuno ng data) ----------
  const ICON = {
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'
  };

  // Player card (Alex ▾). Yung ids na levelPill / levelNum / levelXp / levelFill
  // ay ginagamit din ng tasks.js para gumalaw ang XP pag Mark done / Undo.
  function playerCardHtml(p, total) {
    return `
      <div class="acct-menu player-card" id="acctMenu" role="menu" hidden>
        <div class="pc-head">
          <span class="pc-avatar"><img src="${BASE}assets/avatars/avatar-${p.avatar === 'gold' ? 'gold' : 'lime'}-slime-256.png" alt=""></span>
          <span class="pc-id">
            <span class="acct-name">${esc(p.name)}</span>
            <span class="acct-email">${esc(p.email)}</span>
          </span>
        </div>
        <div class="acct-level" id="levelPill" data-level="${levelFor(total)}">
          <div class="row"><span><b id="levelNum">Level ${levelFor(total)}</b> · <span id="levelRank">${rankFor(total)}</span></span><span id="levelXp">${total.toLocaleString('en-US')} XP</span></div>
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
  const NOTIF_KEY = 'questify.notifs';
  const NOTIF_MAX = 20;
  const OVERDUE_SEEN_KEY = 'questify.notifs.overdueSeen';
  const NOTIF_STYLE = {
    done: { tone: 'lime', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' },
    levelup: { tone: 'gold', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>' },
    overdue: { tone: 'red', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>' }
  };

  function loadNotifs() {
    try {
      const list = JSON.parse(read(NOTIF_KEY));
      return Array.isArray(list) ? list.filter(n => n && NOTIF_STYLE[n.type]) : [];
    } catch (err) {
      return [];
    }
  }
  function saveNotifs(list) {
    write(NOTIF_KEY, JSON.stringify(list.slice(0, NOTIF_MAX)));
  }

  function timeAgo(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
  }

  // Blueprint ng ISANG notification
  function notifItemHtml(n) {
    const style = NOTIF_STYLE[n.type];
    return `
        <div class="notif-item${n.read ? '' : ' unread'}">
          <span class="notif-ico ${style.tone}">${style.icon}</span>
          <span class="notif-text"><b>${esc(n.title)}</b><small>${esc(n.text)}</small></span>
          <time>${timeAgo(n.at)}</time>
        </div>`;
  }

  // Laman ng panel: listahan, o "No notifications yet" kung wala pa
  function notifBodyHtml(list) {
    if (!list.length) {
      return `<div class="notif-empty"><span class="notif-ico">${ICON.bell}</span><b>No notifications yet</b><small>Finish a quest and it will show up here.</small></div>`;
    }
    return `<div class="notif-list">${list.map(notifItemHtml).join('')}</div>
        <button type="button" class="notif-foot" data-notif-clear>Clear all</button>`;
  }

  function notifPanelHtml() {
    return `
      <div class="notif-panel" id="notifPanel" role="dialog" aria-label="Notifications" hidden>
        <div class="notif-head"><b>Notifications</b></div>
        <div id="notifBody">${notifBodyHtml(loadNotifs())}</div>
      </div>`;
  }

  // I-drawing ulit ang panel + yung dot sa bell (kung may hindi pa nababasa)
  function paintNotifs() {
    const list = loadNotifs();
    const body = document.getElementById('notifBody');
    const btn = document.getElementById('notifBtn');
    if (body) body.innerHTML = notifBodyHtml(list);
    if (btn) btn.classList.toggle('has-unread', list.some(n => !n.read));
  }

  function addNotif(n) {
    const list = loadNotifs();
    list.unshift(Object.assign({ id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6), at: Date.now(), read: false }, n));
    saveNotifs(list);
    paintNotifs();
  }

  // ---------- header: dropdowns (Alex ▾ at bell) ----------
  function setupHeader() {
    const player = loadPlayer();
    const total = savedXp();

    document.querySelectorAll('[data-acct-name]').forEach(el => { el.textContent = player.name.split(' ')[0]; });

    const acctWrap = document.querySelector('.acct-wrap');
    const notifWrap = document.querySelector('.notif-wrap');
    if (acctWrap) acctWrap.insertAdjacentHTML('beforeend', playerCardHtml(player, total));
    if (notifWrap) notifWrap.insertAdjacentHTML('beforeend', notifPanelHtml());

    const pairs = [
      [document.getElementById('acctBtn'), document.getElementById('acctMenu')],
      [document.getElementById('notifBtn'), document.getElementById('notifPanel')]
    ].filter(([btn, panel]) => btn && panel);

    function closeAll(except) {
      pairs.forEach(([btn, panel]) => {
        if (panel === except) return;
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      });
    }

    pairs.forEach(([btn, panel]) => {
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', e => {
        e.preventDefault();
        const open = panel.hidden;
        closeAll(panel);
        panel.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    // Click sa labas o Esc = sarado
    document.addEventListener('click', e => {
      if (!e.target.closest('.acct-wrap, .notif-wrap')) closeAll();
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const open = pairs.find(([, panel]) => !panel.hidden);
      closeAll();
      if (open) open[0].focus();
    });

    // ---------- 5. SIGN OUT ----------
    document.querySelectorAll('[data-signout]').forEach(btn => {
      btn.addEventListener('click', () => {
        write(SIGNED_IN_KEY, null);   // flag lang ang binubura, naiiwan ang quests at XP
        location.href = BASE + 'index.html?signedout=1';
      });
    });

    // Tasks page: tuwing nagbabago ang XP, i-update din ang rank at "XP to Level",
    // at pa-"bump" ang Alex button para makita na may nagbago sa level mo.
    document.addEventListener('questify:xp', e => {
      const t = e.detail.total;
      const rank = document.getElementById('levelRank');
      const next = document.getElementById('levelNext');
      if (rank) rank.textContent = rankFor(t);
      if (next) next.textContent = `${toNext(t)} XP to Level ${levelFor(t) + 1}`;
      const acctBtn = document.getElementById('acctBtn');
      if (e.detail.change && acctBtn) {
        acctBtn.classList.remove('xp-bump');
        void acctBtn.offsetWidth;   // para mag-restart ang animation
        acctBtn.classList.add('xp-bump');
      }
    });

    // ---------- notifications ----------
    paintNotifs();
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    if (notifBtn && notifPanel) {
      // Pagbukas: kita pa yung "unread" na kulay ngayon, pero bilang nabasa na (wala nang dot)
      notifBtn.addEventListener('click', () => {
        if (notifPanel.hidden) return;
        const list = loadNotifs();
        if (!list.some(n => !n.read)) return;
        saveNotifs(list.map(n => Object.assign(n, { read: true })));
        notifBtn.classList.remove('has-unread');
      });
      notifPanel.addEventListener('click', e => {
        if (!e.target.closest('[data-notif-clear]')) return;
        saveNotifs([]);
        paintNotifs();
      });
    }

    document.addEventListener('questify:quest-done', e => {
      const d = e.detail;
      addNotif({ type: 'done', quest: d.id, title: 'Quest done: ' + d.title, text: `+${d.xp} XP earned` });
      if (d.leveledUp) {
        addNotif({ type: 'levelup', quest: d.id, title: `Level up! You reached Level ${d.level}`, text: 'New rank: ' + rankFor(savedXp()) });
      }
    });
    // Undo: tanggalin ang "Quest done" / "Level up" ng quest na binawi (hindi ang "Overdue")
    document.addEventListener('questify:quest-undo', e => {
      saveNotifs(loadNotifs().filter(n => n.quest !== e.detail.id || n.type === 'overdue'));
      paintNotifs();
    });

    // Overdue: isang notification bawat quest. Tinatandaan kung alin na ang
    // na-notify, para hindi bumalik kahit i-refresh o i-"Clear all".
    document.addEventListener('questify:overdue', e => {
      let seen = [];
      try { seen = JSON.parse(read(OVERDUE_SEEN_KEY)) || []; } catch (err) { seen = []; }
      const fresh = e.detail.quests.filter(q => !seen.includes(q.id));
      fresh.forEach(q => {
        addNotif({ type: 'overdue', quest: q.id, title: 'Overdue: ' + q.title, text: 'Was due ' + q.due });
      });
      if (fresh.length) write(OVERDUE_SEEN_KEY, JSON.stringify(seen.concat(fresh.map(q => q.id))));
    });
  }

  // Home: maliit na toast pagkatapos mag-Sign out
  function signedOutToast() {
    const url = new URL(location.href);
    if (!url.searchParams.has('signedout')) return;
    url.searchParams.delete('signedout');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.dataset.tone = 'info';
    toast.setAttribute('role', 'status');
    toast.textContent = 'You signed out. Your quests stay saved in this browser.';
    document.body.appendChild(toast);
    setTimeout(() => { toast.hidden = true; }, 5000);
  }

  // ---------- 4. FORMS (Sign in / Create account) ----------
  function setupAuthForm() {
    const form = document.querySelector('form.auth-card');
    if (!form) return;

    // Saan pupunta pagkatapos: yung page na gusto nila kanina, o Tasks.
    const next = new URLSearchParams(location.search).get('next');
    const target = BASE + 'pages/' + (GUARDED[next] || 'tasks.html');

    // Notice kung galing sila sa Tasks / Profile na naka-sign out
    const notice = document.getElementById('authNotice');
    if (notice && GUARDED[next]) {
      document.getElementById('authNoticeText').textContent =
        next === 'profile' ? 'Sign in to see your profile.' : 'Sign in to open your Quest Board.';
      notice.hidden = false;
    }
    // Dalhin din yung ?next= kapag lumipat sa kabilang tab
    if (GUARDED[next]) {
      form.querySelectorAll('.tabs a').forEach(a => { a.href += '?next=' + encodeURIComponent(next); });
    }

    // Show / Hide ng password
    form.querySelectorAll('.show-btn').forEach(btn => {
      const input = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', () => {
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        btn.textContent = reveal ? 'Hide' : 'Show';
        btn.setAttribute('aria-pressed', String(reveal));
      });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();   // walang server: dito na lang natin hinahawakan
      const confirm = document.getElementById('confirm');
      const password = document.getElementById('password');
      const confirmErr = document.getElementById('confirmErr');
      if (confirm && confirm.value !== password.value) {
        confirmErr.hidden = false;
        confirm.focus();
        return;
      }

      const player = loadPlayer();
      const email = document.getElementById('email');
      const name = document.getElementById('name');
      // Yung avatar radios ay nasa kaliwa (labas ng <form>), kaya form.elements ang gamit
      const avatar = form.elements.namedItem('avatar');
      if (email && email.value.trim()) player.email = email.value.trim();
      if (name && name.value.trim()) player.name = name.value.trim();
      if (avatar && avatar.value) player.avatar = avatar.value;
      savePlayer(player);

      write(SIGNED_IN_KEY, '1');
      location.href = target;
    });

    const confirm = document.getElementById('confirm');
    if (confirm) confirm.addEventListener('input', () => { document.getElementById('confirmErr').hidden = true; });
  }

  // Hintayin munang ma-load yung HTML bago galawin ang header at forms.
  // (Nauuna 'to sa tasks.js, kaya andyan na ang player card pag nag-start ang Tasks.)
  document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    setupAuthForm();
    signedOutToast();
  });
})();
