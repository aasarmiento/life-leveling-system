// =====================================================================
// QUEST BOARD (pages/tasks.html) — GUIDE PARA SA TEAM
// ---------------------------------------------------------------------
// Ano ginagawa ng file na 'to?
//   Lahat ng galaw sa Tasks page: add, edit, delete, Start, Mark done,
//   Undo, search, filter, sort, drag, at yung Level pill sa taas.
//
// Paano umiikot (yung flow papuntang JS):
//   1. DATA   - yung `quests` array ang "totoong listahan". Bawat quest ay
//               object: { id, title, desc, cat, priority, status, due, ... }
//   2. ACTION - may pinindot (hal. "Mark done") → may function na
//               nagbabago ng data (hal. completeQuest).
//   3. RENDER - tinatawag yung render(): binubura at dino-drawing ulit lahat
//               ng card galing sa `quests`. Hindi natin ine-edit isa-isa
//               yung HTML ng card.
//   4. SAVE   - sa dulo ng render(), sine-save sa localStorage, kaya andun
//               pa rin kahit i-refresh o i-restart ang Live Server.
//
// Kung magdadagdag ng feature, ganito lang din:
//   baguhin yung data → render() → announce() (para sa screen reader).
//
// Yung mga id sa tasks.html (hal. id="addQuestBtn") ay "hawakan" ng JS.
// Huwag palitan yung id nang hindi binabago dito, kasi masisira yung JS.
// =====================================================================
// Nagsisimula pag handa na ang page (DOMContentLoaded), para nauna na ang
// nav.js na gumawa ng player card (Alex ▾) kung saan naka-lagay ang Level at XP.
document.addEventListener("DOMContentLoaded", function () {
  const XP_BY_PRIORITY = { low: 10, medium: 20, high: 30 };
  const PRIORITY_VALUE = { low: 1, medium: 2, high: 3 };
  const PRIORITY_LABEL = { low: "Low", medium: "Medium", high: "High" };
  const CATEGORY_LABEL = { work: "Work", growth: "Learning", health: "Health" };
  const STATUSES = ["todo", "doing", "done"];
  const STATUS_LABEL = { todo: "To do", doing: "Doing", done: "Done" };
  const COLUMN_EMPTY = {
    todo: "Nothing queued.",
    doing: "Nothing in progress.",
    done: "Nothing finished yet.",
  };
  // Bawat sort may sariling default na direction (hal. Due date = pinakamalapit muna).
  // Sa To do at Doing lang gumagana yung sort; ang Done ay laging pinakabago sa taas.
  const SORTS = {
    due: { label: "Due date", dir: "asc" },
    xp: { label: "XP value", dir: "desc" },
    priority: { label: "Priority", dir: "desc" },
    added: { label: "Date added", dir: "desc" },
    manual: { label: "Manual", dir: null },
  };
  const DRAG_THRESHOLD = 6;
  const LONG_PRESS_MS = 350;
  // Pinakahuling puwedeng due date (para walang year 20260 na mali ang type)
  const MAX_DUE = "2099-12-31";
  // Ilang card lang ang pinapakita per column bago lumabas yung "Show all".
  const COLUMN_LIMIT = 10;
  // Pangalan ng save sa localStorage. Binabasa rin 'to ng js/nav.js para sa Level
  // pill ng Dashboard / Profile / About.
  // Bawat account may sariling board (galing sa nav.js). Demo = "questify.board.v1".
  const ACCOUNT = window.questifyAccount || {
    boardKey: "questify.board.v1",
    isDemo: true,
  };
  const STORE_KEY = ACCOUNT.boardKey;
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Panimulang XP (pareho sa Dashboard): 1,450 XP ÷ 125 per level = Level 12.
  const STARTING_XP = 1450;
  const XP_PER_LEVEL = 125;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- dates (pang-format ng petsa, hal. "Sep 27", "Done yesterday") ----------

  const pad = (n) => String(n).padStart(2, "0");
  const isoFor = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayIso = () => isoFor(new Date());

  function isoOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return isoFor(d);
  }

  function parseIso(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function shortDate(iso) {
    const d = parseIso(iso);
    return MONTHS[d.getMonth()] + " " + pad(d.getDate());
  }

  function longDate(date) {
    return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  function doneLabel(ms) {
    const iso = isoFor(new Date(ms));
    if (iso === todayIso()) return "Done today";
    if (iso === isoOffset(-1)) return "Done yesterday";
    return "Done " + shortDate(iso);
  }

  const isOverdue = (q) => q.status !== "done" && !!q.due && q.due < todayIso();

  // ---------- data (yung mga quest mismo) ----------

  let nextId = 1;

  // Sample quests para sa first visit. Relative sa araw ngayon yung due dates,
  // kaya laging may ilang overdue at ilang paparating pa lang.
  function sampleQuests() {
    nextId = 1;
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
    return [
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
  }

  // XP ledger = listahan ng lahat ng nakuhang XP. Pag nag-delete ng quest, hindi
  // nababawas yung XP. Yung Undo lang pagkatapos ng "Mark done" ang nagbabawas.
  // Demo: nagsisimula sa 1,450 XP (Level 12). Bagong account: 0 XP (Level 1).
  const startingXp = () => (ACCOUNT.isDemo ? [{ id: null, xp: STARTING_XP }] : []);

  // ---------- saving (localStorage = maliit na storage ng browser) ----------

  const isQuest = (q) =>
    !!q &&
    typeof q.id === "string" &&
    typeof q.title === "string" &&
    typeof q.desc === "string" &&
    STATUSES.includes(q.status) &&
    !!CATEGORY_LABEL[q.cat] &&
    !!XP_BY_PRIORITY[q.priority] &&
    typeof q.due === "string" &&
    typeof q.added === "number" &&
    typeof q.rank === "number" &&
    (q.status !== "done" ||
      (typeof q.earned === "number" && typeof q.completed === "number"));

  // Babasahin yung naka-save. Kung wala, sira, o naka-block yung storage
  // (hal. private mode), null ang babalik at sample quests ang lalabas.
  function loadBoard() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!data || !Array.isArray(data.quests) || !data.quests.every(isQuest))
        return null;
      if (
        !Array.isArray(data.xp) ||
        !data.xp.every((entry) => entry && Number.isFinite(entry.xp))
      )
        return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function saveBoard() {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          quests,
          xp: bankedXp,
          nextId,
          sort: state.sort,
          dir: state.dir,
        }),
      );
    } catch (err) {
      // Naka-block o puno yung storage: gagana pa rin yung board, hindi lang ma-sa-save.
    }
  }

  // Pagbukas ng page: kunin yung naka-save. Kung wala: sample quests para sa
  // demo account, at walang laman para sa bagong account.
  const saved = loadBoard();
  let quests = saved ? saved.quests : ACCOUNT.isDemo ? sampleQuests() : [];
  let bankedXp = saved ? saved.xp : startingXp();
  if (saved) {
    const highest = Math.max(
      0,
      ...quests.map((q) => parseInt(q.id.slice(1), 10) || 0),
    );
    nextId = Math.max(Number(saved.nextId) || 0, highest + 1);
  }

  // Tinatandaan yung Sort. Hindi tinatandaan yung search at category filter.
  const state = { filter: "all", query: "", sort: "due", dir: "asc" };
  if (saved && SORTS[saved.sort]) {
    state.sort = saved.sort;
    if (saved.dir === "asc" || saved.dir === "desc") state.dir = saved.dir;
  }

  const $ = (id) => document.getElementById(id);
  const board = $("board");
  const lists = {};
  const counts = {};
  const moreBtns = {};
  const expanded = {};
  STATUSES.forEach((s) => {
    lists[s] = board.querySelector(`[data-list="${s}"]`);
    counts[s] = board.querySelector(`[data-count="${s}"]`);
    moreBtns[s] = board.querySelector(`[data-more="${s}"]`);
    expanded[s] = false;
  });

  const searchInput = $("questSearch");
  const searchClear = $("searchClear");
  const filterChips = document.querySelectorAll(".filters .chip");
  const addBtn = $("addQuestBtn");
  const emptyBox = $("boardEmpty");
  const emptyTitle = $("emptyTitle");
  const emptyText = $("emptyText");
  const emptyReset = $("emptyReset");
  const emptyAdd = $("emptyAdd");
  const announcer = $("announcer");

  const sortBtn = $("sortBtn");
  const sortValue = $("sortValue");
  const sortPanel = $("sortPanel");
  const sortItems = [...sortPanel.querySelectorAll("[data-sort]")];
  const sortDir = $("sortDir");

  const levelPill = $("levelPill");
  const levelNum = $("levelNum");
  const levelXp = $("levelXp");
  const levelFill = $("levelFill");

  const questModal = $("questModal");
  const questForm = $("questForm");
  const questModalTitle = $("questModalTitle");
  const qTitle = $("qTitle");
  const qTitleErr = $("qTitleErr");
  const qDesc = $("qDesc");
  const qTitleCount = $("qTitleCount");
  const qDescCount = $("qDescCount");
  const quickDue = [...questForm.querySelectorAll("[data-due]")];
  // Category at Priority = radio buttons (pills), hindi na dropdown
  const getChoice = (name) => {
    const on = questForm.querySelector(`input[name="${name}"]:checked`);
    return on ? on.value : "";
  };
  const setChoice = (name, value) => {
    questForm.querySelectorAll(`input[name="${name}"]`).forEach((r) => {
      r.checked = r.value === value;
    });
  };
  const qDue = $("qDue");
  const qDueErr = $("qDueErr");
  const qXp = $("qXp");
  const qSubmit = $("qSubmit");

  const detailModal = $("detailModal");
  const detailClose = $("detailClose");

  // Iisang confirm popup para sa Mark done, Undo done at Delete
  const confirmModal = $("confirmModal");
  const cmIco = $("cmIco");
  const cmTitle = $("cmTitle");
  const cmText = $("cmText");
  const cmQuest = $("cmQuest");
  const cmMeta = $("cmMeta");
  const cmXp = $("cmXp");
  const cmCancel = $("cmCancel");
  const cmOk = $("cmOk");

  // ---------- helpers (maliliit na tools na paulit-ulit gamitin) ----------

  const ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
  const findQuest = (id) => quests.find((q) => q.id === id);
  const shownXp = (q) =>
    q.status === "done" ? q.earned : XP_BY_PRIORITY[q.priority];

  function restartAnimation(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function announce(message) {
    announcer.textContent = message;
  }

  // ---------- toast (maliit na message sa baba-kanan) ----------
  // Galing sa nav.js (window.questifyToast) para pare-pareho sa buong site.
  // Wala nang Undo button at timer dito: nasa 3-dot menu na ang Undo.
  // announce: false kasi may sariling announcer ang page na 'to.
  function showToast(opts) {
    if (window.questifyToast)
      window.questifyToast(Object.assign({ announce: false }, opts));
  }

  // ---------- filtering + sorting (search, category chips, Sort) ----------

  function matches(q) {
    if (state.filter !== "all" && q.cat !== state.filter) return false;
    if (!state.query) return true;
    return (q.title + " " + q.desc)
      .toLowerCase()
      .includes(state.query.toLowerCase());
  }

  function compare(a, b) {
    if (state.sort === "manual") return a.rank - b.rank;
    const dir = state.dir === "asc" ? 1 : -1;
    const byTitle = a.title.localeCompare(b.title);
    const byDue = (a.due || "9999").localeCompare(b.due || "9999");

    if (state.sort === "due") {
      // Overdue laging nasa taas kahit anong direction, pinaka-late muna.
      const ao = isOverdue(a);
      const bo = isOverdue(b);
      if (ao !== bo) return ao ? -1 : 1;
      if (ao) return byDue || byTitle;
      if (!a.due !== !b.due) return a.due ? -1 : 1;
      return (
        dir * byDue ||
        PRIORITY_VALUE[b.priority] - PRIORITY_VALUE[a.priority] ||
        byTitle
      );
    }
    if (state.sort === "xp")
      return dir * (shownXp(a) - shownXp(b)) || byDue || byTitle;
    if (state.sort === "priority")
      return (
        dir * (PRIORITY_VALUE[a.priority] - PRIORITY_VALUE[b.priority]) ||
        byDue ||
        byTitle
      );
    return dir * (a.added - b.added) || byTitle;
  }

  // Yung manual order (drag) ay naka-save sa `rank`. Bago yung unang drag,
  // kinokopya muna yung order na nakikita mo para walang tatalon na card.
  function freezeOrder() {
    if (state.sort === "manual") return;
    quests
      .slice()
      .sort(compare)
      .forEach((q, i) => {
        q.rank = i;
      });
  }

  function normalizeRanks() {
    quests
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .forEach((q, i) => {
        q.rank = i;
      });
  }

  // `ids` = order ng isang column pagkatapos ilipat yung card.
  function placeManually(q, ids) {
    freezeOrder();
    const i = ids.indexOf(q.id);
    const prev = findQuest(ids[i - 1]);
    const next = findQuest(ids[i + 1]);
    if (prev) q.rank = prev.rank + 0.5;
    else if (next) q.rank = next.rank - 0.5;
    normalizeRanks();
    setSort("manual");
  }

  function moveToColumnTop(q, status) {
    const ranks = quests
      .filter((x) => x.status === status && x !== q)
      .map((x) => x.rank);
    q.status = status;
    if (ranks.length) q.rank = Math.min(...ranks) - 1;
  }

  // ---------- rendering (pag-drawing ng cards sa screen) ----------

  function dueText(q) {
    if (!q.due) return "No date";
    return isOverdue(q) ? "Was due " + shortDate(q.due) : shortDate(q.due);
  }

  // Maliliit na icon sa 3-dot menu
  const MENU_ICON = {
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    delete: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  };
  const menuItem = (action, label, icon, extra = "", cls = "") =>
    `<button type="button" role="menuitem"${cls ? ` class="${cls}"` : ""} data-action="${action}"><svg viewBox="0 0 24 24" aria-hidden="true">${MENU_ICON[icon]}</svg>${label}${extra}</button>`;

  // 3-dot menu, iba bawat column:
  //   To do: Edit · Delete
  //   Doing: Move back to To do · Edit · Delete
  //   Done:  Undo done (−XP) · Delete
  function menuHtml(q, title) {
    let items = "";
    if (q.status === "doing")
      items += menuItem("back", "Move back to To do", "back");
    if (q.status === "done")
      items += menuItem(
        "undo",
        "Undo done",
        "undo",
        `<em aria-hidden="true">−${q.earned} XP</em>`,
      );
    else items += menuItem("edit", "Edit", "edit");
    items +=
      '<hr role="separator">' +
      menuItem("delete", "Delete", "delete", "", "danger");
    return `
      <div class="qcard-menu">
        <button type="button" class="kebab" data-action="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Options for ${title}"></button>
        <div class="qmenu" role="menu" hidden>${items}</div>
      </div>`;
  }

  function doneCardHtml(q) {
    const title = esc(q.title);
    return `
      <article class="qcard is-done" data-id="${q.id}">
        <div class="qcard-head">
          <h3 class="qcard-title"><button type="button" class="qcard-open" data-action="open" aria-haspopup="dialog"><span class="done-check" aria-hidden="true"></span>${title}</button></h3>
          <div class="qcard-tools">${menuHtml(q, title)}</div>
        </div>
        ${q.desc ? `<p class="cap">${esc(q.desc)}</p>` : ""}
        <div class="meta">
          <span class="chip chip-${q.cat}">${CATEGORY_LABEL[q.cat]}</span>
          <span class="xp earned">+${q.earned} XP earned</span>
          <span class="due">${doneLabel(q.completed)}</span>
        </div>
        <div class="qactions"><span class="done-label">Completed</span></div>
      </article>`;
  }

  function cardHtml(q) {
    if (q.status === "done") return doneCardHtml(q);
    const overdue = isOverdue(q);
    const title = esc(q.title);
    const action =
      q.status === "todo"
        ? '<button type="button" class="btn-gold fx" data-action="start">Start</button>'
        : '<button type="button" class="btn-lime fx" data-action="done">Mark done</button>';
    return `
      <article class="qcard can-drag${overdue ? " is-overdue" : ""}" data-id="${q.id}">
        <div class="qcard-head">
          <h3 class="qcard-title"><button type="button" class="qcard-open" data-action="open" aria-haspopup="dialog" aria-describedby="dragHelp">${title}</button></h3>
          <div class="qcard-tools">${menuHtml(q, title)}</div>
        </div>
        ${q.desc ? `<p class="cap">${esc(q.desc)}</p>` : ""}
        <div class="meta">
          <span class="chip chip-${q.cat}">${CATEGORY_LABEL[q.cat]}</span>
          <span class="xp" title="${PRIORITY_LABEL[q.priority]} priority">+${shownXp(q)} XP</span>
          ${overdue ? '<span class="badge-overdue">Overdue</span>' : ""}
          <span class="due">${dueText(q)}</span>
        </div>
        <div class="qactions">${action}</div>
      </article>`;
  }

  // render() = binubura at dino-drawing ulit lahat ng card galing sa `quests`.
  // Lahat ng pagbabago dumadaan dito, kaya dito na rin tayo nagsa-save.
  // `highlight` = id ng card na kakagalaw lang (para ma-highlight).
  // `first` = positions na sinukat na ng drag code (lumulutang pa kasi yung card pag drop).
  function render({ animate = true, highlight = null, first = null } = {}) {
    closeMenu();
    let before = null;
    if (!reduceMotion.matches) before = first || (animate ? snapshot() : null);

    const visible = quests.filter(matches);
    STATUSES.forEach((status) => {
      let items = visible.filter((q) => q.status === status);
      items =
        status === "done"
          ? items.sort((a, b) => b.completed - a.completed)
          : items.sort(compare);

      // Kung yung kakagalaw na quest ay lampas card 10, bubuksan na yung column (Show all).
      if (
        highlight &&
        items.findIndex((q) => q.id === highlight) >= COLUMN_LIMIT
      )
        expanded[status] = true;
      const long = items.length > COLUMN_LIMIT;
      const shown =
        long && !expanded[status] ? items.slice(0, COLUMN_LIMIT) : items;

      counts[status].textContent = items.length;
      lists[status].innerHTML = shown.length
        ? shown.map(cardHtml).join("")
        : `<p class="col-empty">${COLUMN_EMPTY[status]}</p>`;

      const more = moreBtns[status];
      more.parentElement.hidden = !long;
      more.textContent = expanded[status]
        ? "Show less"
        : `Show all (${items.length})`;
      more.setAttribute("aria-expanded", String(expanded[status]));
    });

    const nothing = visible.length === 0;
    board.hidden = nothing;
    emptyBox.hidden = !nothing;
    if (nothing) fillEmptyState();

    if (highlight) revealInList(highlight);
    updateFades();
    saveBoard();
    if (before) play(before, highlight);
  }

  // I-scroll yung list ng column (hindi yung buong page) para kita yung card na kakalipat lang.
  function revealInList(id) {
    const el = board.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    const list = el.parentElement;
    if (list.scrollHeight <= list.clientHeight) return;
    const lr = list.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (er.top < lr.top) list.scrollTop -= lr.top - er.top + 16;
    else if (er.bottom > lr.bottom)
      list.scrollTop += er.bottom - lr.bottom + 16;
  }

  // Yung fade sa baba ng column, lalabas lang kung may cards pa sa ilalim.
  function updateFade(list) {
    const more = list.scrollHeight - list.scrollTop - list.clientHeight > 4;
    list.parentElement.classList.toggle("has-more", more);
  }

  function updateFades() {
    STATUSES.forEach((s) => updateFade(lists[s]));
  }

  STATUSES.forEach((s) => {
    lists[s].addEventListener("scroll", () => updateFade(lists[s]), {
      passive: true,
    });
    moreBtns[s].addEventListener("click", () => {
      expanded[s] = !expanded[s];
      render();
      announce(
        expanded[s]
          ? `Showing all ${STATUS_LABEL[s]} quests.`
          : `Showing the first ${COLUMN_LIMIT} ${STATUS_LABEL[s]} quests.`,
      );
    });
  });
  window.addEventListener("resize", updateFades);

  function fillEmptyState() {
    emptyReset.hidden = false;
    if (state.query) {
      emptyTitle.textContent = `No quests match "${state.query}"`;
      emptyText.textContent =
        "Check the spelling, clear the search, or add a new quest.";
      emptyReset.textContent = "Clear search";
    } else if (state.filter !== "all") {
      emptyTitle.textContent = `No ${CATEGORY_LABEL[state.filter]} quests yet`;
      emptyText.textContent = "Add one, or go back to all quests.";
      emptyReset.textContent = "Show all quests";
    } else {
      emptyTitle.textContent = "Your board is empty";
      emptyText.textContent = "Add your first quest to start earning XP.";
      emptyReset.hidden = true;
    }
  }

  // FLIP animation: tandaan kung nasaan bawat card, i-render ulit, tapos
  // i-animate bawat card mula sa dati niyang pwesto papunta sa bago.
  function snapshot() {
    const rects = new Map();
    board.querySelectorAll(".qcard").forEach((el) =>
      rects.set(el.dataset.id, {
        rect: el.getBoundingClientRect(),
        list: el.parentElement.dataset.list,
      }),
    );
    return rects;
  }

  function play(first, highlight) {
    board.querySelectorAll(".qcard").forEach((el) => {
      const id = el.dataset.id;
      const before = first.get(id);
      if (!before) {
        el.animate(
          [
            { opacity: 0, transform: "scale(0.96)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 240, easing: "ease-out" },
        );
        return;
      }
      const after = el.getBoundingClientRect();
      const dx = before.rect.left - after.left;
      const dy = before.rect.top - after.top;
      if (!dx && !dy) return;

      const travelling = id === highlight;
      const keyframes = [
        {
          transform: `translate(${dx}px, ${dy}px)${travelling ? " scale(1.03)" : ""}`,
        },
        { transform: "none" },
      ];
      const timing = {
        duration: travelling ? 560 : 320,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      };

      // May sariling scroll bawat column, kaya pag lumipat ng column yung card,
      // mapuputol yung animation. Kaya kopya ng card yung "lumilipad" papunta doon.
      if (before.list !== el.parentElement.dataset.list) {
        flyCopy(el, after, keyframes, timing, travelling);
        return;
      }

      el.classList.add("is-moving");
      const anim = el.animate(keyframes, timing);
      const done = () => el.classList.remove("is-moving");
      anim.onfinish = done;
      anim.oncancel = done;
    });

    if (highlight) {
      const el = board.querySelector(`[data-id="${highlight}"]`);
      if (el) {
        el.classList.add("arrived");
        el.addEventListener(
          "animationend",
          () => el.classList.remove("arrived"),
          { once: true },
        );
      }
    }
  }

  function flyCopy(el, rect, keyframes, timing, arrived) {
    const copy = el.cloneNode(true);
    copy.removeAttribute("data-id");
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    copy.classList.add("qcard-flying");
    if (arrived) copy.classList.add("arrived");
    Object.assign(copy.style, {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
    document.body.appendChild(copy);
    // Opacity (hindi visibility) para ma-focus pa rin yung totoong card habang lumilipad yung kopya.
    el.style.opacity = "0";

    const anim = copy.animate(keyframes, timing);
    const done = () => {
      copy.remove();
      el.style.opacity = "";
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  function focusCard(id, target = "action") {
    const el = board.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    const pick = {
      action:
        el.querySelector(".qactions button") || el.querySelector(".kebab"),
      kebab: el.querySelector(".kebab"),
      title: el.querySelector(".qcard-open"),
    };
    pick[target].focus();
  }

  // ---------- level pill (Level at XP sa header) ----------

  const totalXp = () => bankedXp.reduce((sum, entry) => sum + entry.xp, 0);
  const xpLabel = (n) => n.toLocaleString("en-US") + " XP";
  let levelTimer = null;
  let countFrame = 0;
  let pillXp = 0; // what the pill's XP text says right now

  function setFill(pct, animate = true) {
    if (!animate) levelFill.style.transition = "none";
    levelFill.style.width = pct + "%";
    if (!animate) {
      void levelFill.offsetWidth;
      levelFill.style.transition = "";
    }
  }

  // Pinapatakbo yung numero ng XP (hal. 1,450 → 1,470), gaya ng demo sa Home.
  function countXp(to) {
    const from = pillXp;
    const start = performance.now();
    cancelAnimationFrame(countFrame);
    (function step(now) {
      const p = Math.min(1, (now - start) / 450);
      pillXp = Math.round(from + (to - from) * p);
      levelXp.textContent = xpLabel(pillXp);
      if (p < 1) countFrame = requestAnimationFrame(step);
    })(start);
  }

  // `change` = XP na nadagdag (+) o binawi ng Undo (−).
  // Kung walang `change` (hal. pagbukas ng page), diretso update lang, walang animation.
  function paintLevel(change = 0) {
    const total = totalXp();
    const level = Math.floor(total / XP_PER_LEVEL) + 1;
    const pct = ((total % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
    const prevLevel = Number(levelPill.dataset.level) || level;

    levelNum.textContent = "Level " + level;
    levelPill.dataset.level = level;
    // Sabihan ang header (nav.js) para ma-update ang rank at "XP to Level"
    document.dispatchEvent(
      new CustomEvent("questify:xp", { detail: { total, level, change } }),
    );
    levelPill.title = `${XP_PER_LEVEL - (total % XP_PER_LEVEL)} XP to Level ${level + 1}`;

    clearTimeout(levelTimer);
    cancelAnimationFrame(countFrame);
    if (!change || reduceMotion.matches) {
      pillXp = total;
      levelXp.textContent = xpLabel(total);
      setFill(pct, false);
      return;
    }

    countXp(total);
    if (level > prevLevel) {
      // Level up: punuin muna hanggang dulo, tapos balik sa zero para sa bagong level.
      setFill(100);
      levelTimer = setTimeout(() => {
        setFill(0, false);
        setFill(pct);
      }, 600);
      restartAnimation(levelNum, "pop");
    } else if (level < prevLevel) {
      // Undo na nagpababa ng level: ubusin yung bar, tapos ipakita ulit yung laman ng dating level.
      setFill(0);
      levelTimer = setTimeout(() => {
        setFill(100, false);
        setFill(pct);
      }, 600);
      restartAnimation(levelNum, "pop");
    } else {
      setFill(pct);
    }

    // Wala nang "+20 XP" float at glow dito: nasa loob na ng Alex ▾ menu ang level
    // (sarado kadalasan), kaya hindi nakikita. Ang nav.js na ang nagpapa-"bump"
    // sa Alex button, at ang toast ang nagsasabi ng +XP.
  }

  // ---------- quest actions (Start, Mark done, Undo) ----------

  // "Start": ililipat sa Doing, sa pinakataas.
  function startQuest(q) {
    moveToColumnTop(q, "doing");
    render({ highlight: q.id });
    focusCard(q.id);
    announce(`Started "${q.title}". It moved to Doing.`);
  }

  // "Mark done" (pagkatapos i-confirm sa popup): lipat sa Done + dagdag XP sa ledger.
// Wala nang Undo sa toast: nasa 3-dot menu na ng card ("Undo done").
function completeQuest(q) {
  const levelBefore = Number(levelPill.dataset.level);
  q.status = "done";
  q.completed = Date.now();
  q.earned = XP_BY_PRIORITY[q.priority];
  bankedXp.push({ id: q.id, xp: q.earned });
  knownOverdue.delete(q.id);
  render({ highlight: q.id });
  paintLevel(q.earned);
  focusCard(q.id, "kebab");

  const levelNow = Number(levelPill.dataset.level);
  const leveledUp = levelNow > levelBefore;
  const toNext = XP_PER_LEVEL - (totalXp() % XP_PER_LEVEL);

  showToast(
    leveledUp
      ? {
          tone: "lv",
          title: `Level ${levelNow} reached`,
          text: `${q.title} · +${q.earned} XP`,
        }
      : {
          tone: "ok",
          title: `+${q.earned} XP — Level up in ${toNext} XP!`,
          text: q.title,
        },
  );
  announce(
    `Completed "${q.title}". Plus ${q.earned} XP.${leveledUp ? ` Level ${levelNow}!` : ""} You can undo it from the quest's menu.`,
  );
  if (leveledUp) showRankup(levelNow, totalXp());
  document.dispatchEvent(
    new CustomEvent("questify:quest-done", {
      detail: {
        id: q.id,
        title: q.title,
        xp: q.earned,
        level: levelNow,
        leveledUp: levelNow > levelBefore,
      },
    }),
  );
}
  // "Undo done" (3-dot menu ng Done, may confirm): babalik sa taas ng Doing
  // at babawiin yung XP na nakuha dito.
  function undoDone(q) {
    if (q.status !== "done" || !quests.includes(q)) return;
    const i = bankedXp.findLastIndex((entry) => entry.id === q.id);
    let lost;
    if (i > -1) {
      lost = bankedXp.splice(i, 1)[0].xp;
    } else {
      // Sample quests: kasama na ang XP nila sa panimulang 1,450 (walang sariling
      // linya sa ledger), kaya magbabawas tayo ng hiwalay na linya.
      lost = q.earned || 0;
      bankedXp.push({ id: null, xp: -lost });
    }
    moveToColumnTop(q, "doing");
    q.earned = null;
    q.completed = null;
    // Kung late na 'to dati, huwag nang ulitin yung "overdue" na toast
    if (isOverdue(q)) knownOverdue.add(q.id);
    render({ highlight: q.id });
    paintLevel(-lost);
    focusCard(q.id);
    showToast({
      tone: "info",
      icon: "undo",
      title: "Moved back to Doing",
      text: `${q.title} · −${lost} XP`,
    });
    announce(`"${q.title}" is back in Doing. Minus ${lost} XP.`);
    // Binawi: tanggalin din yung notifications ng quest na 'to
    document.dispatchEvent(
      new CustomEvent("questify:quest-undo", { detail: { id: q.id } }),
    );
  }

  // "Move back to To do" (3-dot menu ng Doing): walang XP na gumagalaw, kaya walang confirm
  function moveBackToTodo(q) {
    moveToColumnTop(q, "todo");
    render({ highlight: q.id });
    focusCard(q.id);
    showToast({
      tone: "info",
      icon: "back",
      title: "Moved back to To do",
      text: q.title,
    });
    announce(`"${q.title}" moved back to To do.`);
  }

  // ---------- overdue nudge (paalala pag late na yung quest) ----------

  let knownOverdue = new Set(quests.filter(isOverdue).map((q) => q.id));

  function nudge(list) {
    if (!list.length) return;
    showToast(
      list.length === 1
        ? {
            tone: "err",
            title: "Quest overdue",
            text: `${list[0].title} was due ${shortDate(list[0].due)}.`,
            announce: true, // walang announce() dito, kaya ang toast ang magsasabi
          }
        : {
            tone: "err",
            title: `${list.length} quests are overdue`,
            text: "They're marked in red on your board.",
            announce: true,
          },
    );
  }

  // Chine-check kada minuto: hal. pag lumampas ng hatinggabi, o nag-save ka ng lumang petsa.
  // Para sa notifications (nav.js): isang "Overdue" bawat quest na late na.
  // Si nav.js na ang bahala na hindi maulit ang parehong quest.
  function notifyOverdue(list) {
    if (!list.length) return;
    document.dispatchEvent(
      new CustomEvent("questify:overdue", {
        detail: {
          quests: list.map((q) => ({
            id: q.id,
            title: q.title,
            due: shortDate(q.due),
          })),
        },
      }),
    );
  }

  function checkOverdue({ rerender = true } = {}) {
    const now = quests.filter(isOverdue);
    const fresh = now.filter((q) => !knownOverdue.has(q.id));
    knownOverdue = new Set(now.map((q) => q.id));
    if (fresh.length) {
      if (rerender) render();
      nudge(fresh);
      notifyOverdue(fresh);
    }
  }

  setInterval(checkOverdue, 60000);

  // ---------- card menu (yung 3 dots: Edit / Delete) ----------

  let openMenu = null;

  function toggleMenu(kebab) {
    const menu = kebab.nextElementSibling;
    const wasOpen = openMenu && openMenu.menu === menu;
    closeMenu();
    if (wasOpen) return;
    menu.hidden = false;
    kebab.setAttribute("aria-expanded", "true");
    kebab.closest(".qcard").classList.add("menu-open");
    openMenu = { kebab, menu };
    menu.querySelector('[role="menuitem"]').focus();
  }

  function closeMenu({ returnFocus = false } = {}) {
    if (!openMenu) return;
    const { kebab, menu } = openMenu;
    openMenu = null;
    menu.hidden = true;
    kebab.setAttribute("aria-expanded", "false");
    const card = kebab.closest(".qcard");
    if (card) card.classList.remove("menu-open");
    if (returnFocus) kebab.focus();
  }

  // Isang listener lang para sa lahat ng button sa cards. Bawat button may
  // data-action (hal. data-action="done") kaya alam natin kung anong function.
  board.addEventListener("click", (e) => {
    if (justDragged) return;
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const card = btn.closest(".qcard");
    const q = card && findQuest(card.dataset.id);
    if (!q) return;
    const kebab = card.querySelector(".kebab");

    switch (btn.dataset.action) {
      case "open":
        openDetail(q, card.querySelector(".qcard-open"));
        break;
      case "start":
        startQuest(q);
        break;
      case "done":
        openConfirm("done", q, btn);
        break;
      case "menu":
        toggleMenu(btn);
        break;
      case "edit":
        closeMenu();
        openQuestModal(q, kebab);
        break;
      case "back":
        closeMenu();
        moveBackToTodo(q);
        break;
      case "undo":
        closeMenu();
        openConfirm("undo", q, kebab);
        break;
      case "delete":
        closeMenu();
        openConfirm("delete", q, kebab);
        break;
    }
  });

  board.addEventListener("keydown", (e) => {
    if (openMenu) {
      const items = [...openMenu.menu.querySelectorAll('[role="menuitem"]')];
      const i = items.indexOf(document.activeElement);
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu({ returnFocus: true });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      } else if (e.key === "Tab") {
        closeMenu();
      }
      return;
    }

    // Alt + arrow up/down: ilipat yung naka-focus na card (para sa keyboard users).
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      const card = e.target.closest(".qcard.can-drag");
      if (!card) return;
      e.preventDefault();
      nudgeCard(findQuest(card.dataset.id), e.key === "ArrowUp" ? -1 : 1);
    }
  });

  document.addEventListener("click", (e) => {
    if (openMenu && !e.target.closest(".qcard-menu")) closeMenu();
    if (!sortPanel.hidden && !e.target.closest(".sort-wrap")) closeSortPanel();
  });

  // ---------- drag to reorder (buong card, sa loob lang ng sariling column) ----------
  // Mouse: pindutin at igalaw nang konti. Touch: pindutin nang matagal, para
  // gumana pa rin yung normal na swipe/scroll. Pindot na walang galaw = click
  // (bubukas yung details).

  let pending = null;
  let drag = null;
  // Para hindi mabuksan yung card pagkatapos mag-drop.
  let justDragged = false;

  function visibleIds(list, skip) {
    return [...list.children]
      .filter(
        (el) =>
          el.classList.contains("drag-placeholder") ||
          (el.classList.contains("qcard") && el !== skip),
      )
      .map((el) =>
        el.classList.contains("drag-placeholder") ? drag.q.id : el.dataset.id,
      );
  }

  // Gitna ng card (hindi kasama yung animation na tumatakbo pa).
  function layoutMid(el) {
    const r = el.getBoundingClientRect();
    const t = getComputedStyle(el).transform;
    const ty = t && t !== "none" ? new DOMMatrixReadOnly(t).m42 : 0;
    return r.top - ty + r.height / 2;
  }

  board.addEventListener("pointerdown", (e) => {
    if (drag || pending || e.button !== 0) return;
    const card = e.target.closest(".qcard.can-drag");
    if (!card || e.target.closest(".qactions button, .qcard-menu")) return;
    pending = {
      card,
      pointerId: e.pointerId,
      touch: e.pointerType === "touch",
      x: e.clientX,
      y: e.clientY,
      lastY: e.clientY,
      timer: 0,
    };
    if (pending.touch) pending.timer = setTimeout(beginDrag, LONG_PRESS_MS);
  });

  function cancelPending() {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending = null;
  }

  function beginDrag() {
    const { card, pointerId, y, lastY } = pending;
    clearTimeout(pending.timer);
    pending = null;
    closeMenu();

    const list = card.parentElement;
    const rect = card.getBoundingClientRect();
    const placeholder = document.createElement("div");
    placeholder.className = "drag-placeholder";
    placeholder.style.height = rect.height + "px";
    list.insertBefore(placeholder, card);

    Object.assign(card.style, {
      position: "fixed",
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      margin: "0",
    });
    card.classList.add("is-dragging");
    document.body.classList.add("is-sorting");
    try {
      card.setPointerCapture(pointerId);
    } catch (err) {
      /* bitaw na yung pointer */
    }
    if (navigator.vibrate) navigator.vibrate(8);

    drag = {
      q: findQuest(card.dataset.id),
      card,
      list,
      placeholder,
      rect,
      pointerId,
      startY: y,
      pointerY: lastY,
      startIds: null,
      raf: 0,
    };
    drag.startIds = visibleIds(list, card);
    moveDrag();
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function moveDrag() {
    const { card, list, placeholder, rect } = drag;
    const listRect = list.getBoundingClientRect();
    // Naka-lock yung X: pataas/pababa lang sa sariling column.
    let top = rect.top + (drag.pointerY - drag.startY);
    top = Math.max(
      listRect.top - 12,
      Math.min(listRect.bottom - rect.height + 12, top),
    );
    card.style.transform = `translateY(${top - rect.top}px)`;

    const centre = top + rect.height / 2;
    const siblings = [...list.children].filter(
      (el) => el.classList.contains("qcard") && el !== card,
    );
    const before = siblings.find((el) => centre < layoutMid(el)) || null;

    let current = placeholder.nextElementSibling;
    if (current === card) current = current.nextElementSibling;
    if (current === before) return;

    const first = new Map(
      siblings.map((el) => [el, el.getBoundingClientRect()]),
    );
    list.insertBefore(placeholder, before);
    if (reduceMotion.matches) return;
    siblings.forEach((el) => {
      const dy = first.get(el).top - el.getBoundingClientRect().top;
      if (dy)
        el.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
          { duration: 180, easing: "ease-out" },
        );
    });
  }

  // Gaano kabilis mag-scroll pag malapit na sa gilid yung pointer.
  function edgeStep(y, top, bottom, zone) {
    if (y < top + zone) return -Math.min(18, Math.ceil((top + zone - y) / 5));
    if (y > bottom - zone)
      return Math.min(18, Math.ceil((y - (bottom - zone)) / 5));
    return 0;
  }

  // Tuloy-tuloy na scroll habang nasa gilid yung pointer:
  // yung list ng column muna, tapos yung buong page.
  function autoScroll() {
    if (!drag) return;
    const { list } = drag;
    let moved = false;

    if (list.scrollHeight > list.clientHeight) {
      const r = list.getBoundingClientRect();
      const step = edgeStep(drag.pointerY, r.top, r.bottom, 48);
      const was = list.scrollTop;
      if (step) list.scrollTop += step;
      moved = list.scrollTop !== was;
    }

    const pageStep = edgeStep(drag.pointerY, 30, window.innerHeight, 60);
    if (pageStep) {
      // "instant" kasi naka-smooth scroll yung page; magla-lag kung hindi.
      window.scrollBy({ top: pageStep, behavior: "instant" });
      moved = true;
    }

    if (moved) {
      updateFade(list);
      moveDrag();
    }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  document.addEventListener("pointermove", (e) => {
    if (pending && e.pointerId === pending.pointerId) {
      pending.lastY = e.clientY;
      const moved = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
      if (pending.touch) {
        if (moved > 10) cancelPending();
      } else if (moved > DRAG_THRESHOLD) {
        beginDrag();
      }
      return;
    }
    if (drag && e.pointerId === drag.pointerId) {
      drag.pointerY = e.clientY;
      moveDrag();
    }
  });

  // Pag nagsimula na yung touch drag, huwag nang i-scroll yung page.
  document.addEventListener(
    "touchmove",
    (e) => {
      if (drag) e.preventDefault();
    },
    { passive: false },
  );

  board.addEventListener("contextmenu", (e) => {
    if (drag || (pending && pending.touch)) e.preventDefault();
  });

  function endDrag(cancelled) {
    cancelPending();
    if (!drag) return;
    cancelAnimationFrame(drag.raf);
    const { q, card, list, placeholder, startIds } = drag;
    const ids = visibleIds(list, card);
    const first = snapshot();

    card.removeAttribute("style");
    card.classList.remove("is-dragging");
    placeholder.remove();
    document.body.classList.remove("is-sorting");
    drag = null;
    justDragged = true;
    setTimeout(() => {
      justDragged = false;
    }, 0);

    const moved = !cancelled && ids.join() !== startIds.join();
    if (moved) placeManually(q, ids);
    render({ first });
    if (moved) {
      const pos = ids.indexOf(q.id) + 1;
      announce(
        `Moved "${q.title}" to position ${pos} of ${ids.length} in ${STATUS_LABEL[q.status]}. Sort switched to Manual.`,
      );
    }
  }

  document.addEventListener("pointerup", () => endDrag(false));
  document.addEventListener("pointercancel", () => endDrag(true));

  function nudgeCard(q, delta) {
    const ids = [...lists[q.status].querySelectorAll(".qcard")].map(
      (el) => el.dataset.id,
    );
    const from = ids.indexOf(q.id);
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, q.id);
    placeManually(q, ids);
    render();
    focusCard(q.id, "title");
    announce(
      `"${q.title}" is now ${to + 1} of ${ids.length} in ${STATUS_LABEL[q.status]}.`,
    );
  }

  // ---------- sort control (dropdown + arrow ng direction) ----------

  function setSort(key) {
    state.sort = key;
    if (SORTS[key].dir) state.dir = SORTS[key].dir;
    syncSort();
  }

  function syncSort() {
    sortValue.textContent = SORTS[state.sort].label;
    sortItems.forEach((item) =>
      item.setAttribute(
        "aria-checked",
        String(item.dataset.sort === state.sort),
      ),
    );
    const manual = state.sort === "manual";
    const asc = state.dir === "asc";
    sortDir.disabled = manual;
    sortDir.classList.toggle("desc", !asc);
    const label = manual
      ? "Sort direction does not apply to manual order"
      : asc
        ? "Ascending. Switch to descending"
        : "Descending. Switch to ascending";
    sortDir.setAttribute("aria-label", label);
    sortDir.title = manual
      ? "Not used in manual order"
      : asc
        ? "Ascending"
        : "Descending";
  }

  function openSortPanel() {
    sortPanel.hidden = false;
    sortBtn.setAttribute("aria-expanded", "true");
    (
      sortItems.find((i) => i.getAttribute("aria-checked") === "true") ||
      sortItems[0]
    ).focus();
  }

  function closeSortPanel(returnFocus = false) {
    if (sortPanel.hidden) return;
    sortPanel.hidden = true;
    sortBtn.setAttribute("aria-expanded", "false");
    if (returnFocus) sortBtn.focus();
  }

  sortBtn.addEventListener("click", () => {
    if (sortPanel.hidden) openSortPanel();
    else closeSortPanel();
  });

  sortPanel.addEventListener("click", (e) => {
    const item = e.target.closest("[data-sort]");
    if (!item) return;
    setSort(item.dataset.sort);
    closeSortPanel(true);
    render();
    announce(`Sorted by ${SORTS[state.sort].label}.`);
  });

  sortPanel.addEventListener("keydown", (e) => {
    const i = sortItems.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      closeSortPanel(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      sortItems[(i + 1) % sortItems.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      sortItems[(i - 1 + sortItems.length) % sortItems.length].focus();
    } else if (e.key === "Tab") {
      closeSortPanel();
    }
  });

  sortDir.addEventListener("click", () => {
    state.dir = state.dir === "asc" ? "desc" : "asc";
    syncSort();
    render();
    announce(
      `${SORTS[state.sort].label}, ${state.dir === "asc" ? "ascending" : "descending"}.`,
    );
  });

  const rankupModal = $("rankupModal");
const rankupName = $("rankupName");
const rankupSub = $("rankupSub");
let rankupTimer = null;

function showRankup(level, total) {
  rankupName.textContent = "Level " + level;
  rankupSub.textContent = xpLabel(total) + " total";
  rankupModal.classList.add("show");
  rankupModal.setAttribute("aria-hidden", "false");
  clearTimeout(rankupTimer);
  rankupTimer = setTimeout(hideRankup, 2200);
}

function hideRankup() {
  rankupModal.classList.remove("show");
  rankupModal.setAttribute("aria-hidden", "true");
  clearTimeout(rankupTimer);
}

rankupModal.addEventListener("click", hideRankup);

  // ---------- dialogs (popups: Add/Edit, Details, Delete) ----------

  let activeModal = null;
  let returnFocusTo = null;

  function openModal(modal, focusEl, returnEl) {
    activeModal = modal;
    returnFocusTo = returnEl;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    focusEl.focus();
  }

  function closeModal({ restoreFocus = true } = {}) {
    if (!activeModal) return;
    activeModal.hidden = true;
    activeModal = null;
    document.body.classList.remove("modal-open");
    if (restoreFocus) {
      const target =
        returnFocusTo && returnFocusTo.isConnected && returnFocusTo.offsetParent
          ? returnFocusTo
          : addBtn;
      target.focus();
    }
  }

  [questModal, detailModal, confirmModal].forEach((modal) => {
    let pressedBackdrop = false;
    modal.addEventListener("mousedown", (e) => {
      pressedBackdrop = e.target === modal;
    });
    modal.addEventListener("click", (e) => {
      if (
        e.target.closest("[data-close]") ||
        (pressedBackdrop && e.target === modal)
      )
        closeModal();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (!activeModal) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = [
      ...activeModal.querySelectorAll("button, input, select, textarea"),
    ].filter((el) => !el.disabled && el.offsetParent !== null);
    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  });

  // Details (basa lang, walang edit)

  function openDetail(q, returnEl) {
    const overdue = isOverdue(q);
    const status = $("dStatus");
    status.textContent = STATUS_LABEL[q.status] + (overdue ? " · Overdue" : "");
    status.className = `detail-status status-${q.status}${overdue ? " is-overdue" : ""}`;
    $("dTitle").textContent = q.title;

    const desc = $("dDesc");
    desc.textContent = q.desc || "No description.";
    desc.classList.toggle("muted", !q.desc);

    $("dCat").innerHTML =
      `<span class="chip chip-${q.cat}">${CATEGORY_LABEL[q.cat]}</span>`;
    $("dPriority").textContent = PRIORITY_LABEL[q.priority];
    $("dXp").textContent =
      `+${shownXp(q)} XP` + (q.status === "done" ? " earned" : "");

    const due = $("dDue");
    due.textContent = q.due
      ? longDate(parseIso(q.due)) + (overdue ? " (overdue)" : "")
      : "No due date";
    due.classList.toggle("overdue", overdue);
    $("dAdded").textContent = longDate(new Date(q.added));

    $("dCompletedRow").hidden = !q.completed;
    if (q.completed)
      $("dCompleted").textContent = longDate(new Date(q.completed));

    openModal(detailModal, detailClose, returnEl);
  }

  // Add / Edit quest (To do at Doing lang; yung Done may XP na kaya hindi na ine-edit)

  let editing = null;

  function showTitleError(on) {
    qTitleErr.classList.toggle("show", on);
    qTitle.setAttribute("aria-invalid", on ? "true" : "false");
  }

  function updateXpReadout(bump) {
    qXp.textContent = "+" + XP_BY_PRIORITY[getChoice("qPriority") || "medium"] + " XP";
    if (bump && !reduceMotion.matches) restartAnimation(qXp, "bump");
  }

  // Bilang ng letra (hal. "13 / 60") at paglaki ng description box habang nagta-type
  function updateCounts() {
    qTitleCount.textContent = `${qTitle.value.length} / ${qTitle.maxLength}`;
    qDescCount.textContent = `${qDesc.value.length} / ${qDesc.maxLength}`;
  }
  function growDesc() {
    qDesc.style.height = "auto";
    qDesc.style.height = Math.min(qDesc.scrollHeight + 2, 200) + "px";
  }
  // Naka-highlight yung "Today / Tomorrow / Next week" kung yun ang petsa
  function syncQuickDue() {
    quickDue.forEach((b) => {
      const on = qDue.value === isoOffset(Number(b.dataset.due));
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function openQuestModal(q, returnEl) {
    editing = q;
    questModalTitle.textContent = q ? "Edit quest" : "Add quest";
    qSubmit.textContent = q ? "Save changes" : "Add quest";
    qTitle.value = q ? q.title : "";
    qDesc.value = q ? q.desc : "";
    setChoice("qCat", q ? q.cat : state.filter !== "all" ? state.filter : "work");
    setChoice("qPriority", q ? q.priority : "medium");
    qDue.value = q ? q.due : todayIso();
    // Bawal pumili ng lumang petsa. Pero kung luma na ang due date ng ine-edit,
    // puwede pa rin itong iwan (yun lang, hindi ibang lumang petsa).
    qDue.min = q && q.due && q.due < todayIso() ? q.due : todayIso();
    qDue.max = MAX_DUE;
    showDueError(null);
    showTitleError(false);
    updateXpReadout(false);
    updateCounts();
    syncQuickDue();
    openModal(questModal, qTitle, returnEl);
    growDesc(); // pagkatapos lumabas, para tama ang sukat
  }

  function showDueError(msg) {
    qDueErr.textContent = msg || "";
    qDueErr.classList.toggle("show", !!msg);
    qDue.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  // null = okay ang petsa; kung hindi, yung error message
  function dueProblem(due) {
    if (!due) return null; // puwedeng walang due date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due > MAX_DUE)
      return "Pick a date before 2100.";
    const keepingOld = editing && due === editing.due;
    if (due < todayIso() && !keepingOld)
      return "Pick today or a later date.";
    return null;
  }

  questForm.querySelectorAll('input[name="qPriority"]').forEach((r) =>
    r.addEventListener("change", () => updateXpReadout(true)),
  );
  qTitle.addEventListener("input", () => {
    if (qTitle.value.trim()) showTitleError(false);
    updateCounts();
  });
  qDesc.addEventListener("input", () => {
    updateCounts();
    growDesc();
  });
  // Enter / Shift + Enter = bagong linya (normal sa textarea). Ctrl/Cmd + Enter = save.
  questForm.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      questForm.requestSubmit();
    }
  });
  qDue.addEventListener("input", () => {
    showDueError(null);
    syncQuickDue();
  });
  quickDue.forEach((b) =>
    b.addEventListener("click", () => {
      qDue.value = isoOffset(Number(b.dataset.due));
      showDueError(null);
      syncQuickDue();
    }),
  );

  questForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = qTitle.value.trim();
    const dueMsg = dueProblem(qDue.value);
    showTitleError(!title);
    showDueError(dueMsg);
    if (!title || dueMsg) {
      (!title ? qTitle : qDue).focus();
      return;
    }

    const data = {
      title,
      desc: qDesc.value.trim(),
      cat: CATEGORY_LABEL[getChoice("qCat")] ? getChoice("qCat") : "work",
      priority: XP_BY_PRIORITY[getChoice("qPriority")]
        ? getChoice("qPriority")
        : "medium",
      due: qDue.value,
    };

    const wasEditing = !!editing;
    let q = editing;
    if (q) {
      Object.assign(q, data);
    } else {
      q = {
        id: "q" + nextId++,
        status: "todo",
        earned: null,
        completed: null,
        added: Date.now(),
        rank: 0,
        ...data,
      };
      quests.push(q);
      moveToColumnTop(q, "todo");
    }
    editing = null;
    closeModal({ restoreFocus: false });

    // Siguraduhing kita yung kaka-save na quest kahit may search o filter.
    if (!matches(q)) {
      state.filter = "all";
      state.query = "";
      syncControls();
    }
    render({ highlight: q.id });
    focusCard(q.id, wasEditing ? "kebab" : "action");
    announce(
      wasEditing ? `Saved "${q.title}".` : `Added "${q.title}" to To do.`,
    );
    checkOverdue({ rerender: false });
  });

  // ---------- confirm popup (Mark done, Undo done, Delete) ----------
  // Isang popup, iba-iba lang ang laman. Pinapakita yung quest mismo at yung XP,
  // para malinaw kung ano ang mangyayari (hindi generic na "Are you sure?").

  const CONFIRM_ICON = {
    done: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    undo: MENU_ICON.undo,
    delete: MENU_ICON.delete,
  };
  let confirming = null;

  function openConfirm(kind, q, returnEl) {
    confirming = { kind, q };
    const xp = shownXp(q);
    const c = {
      done: {
        tone: "lime",
        title: "Mark this quest as done?",
        text: "It moves to Done and the XP is added to your total. You can undo it later from the quest's menu.",
        ok: "Mark done",
        okClass: "btn-lime",
        xp: `+${xp} XP`,
        xpClass: "",
      },
      undo: {
        tone: "teal",
        title: "Move this quest back to Doing?",
        text: "The XP you earned from it will be taken off your total.",
        ok: "Undo done",
        okClass: "btn-teal",
        xp: `−${xp} XP`,
        xpClass: "lost",
      },
      delete: {
        tone: "rose",
        title: "Delete this quest?",
        text:
          q.status === "done"
            ? "It will be removed from your board. This can't be undone, and its XP stays earned."
            : "It will be removed from your board. This can't be undone.",
        ok: "Delete quest",
        okClass: "btn-rose",
        xp: q.status === "done" ? `+${xp} XP earned` : `+${xp} XP`,
        xpClass: "muted",
      },
    }[kind];

    cmIco.className = "cm-ico " + c.tone;
    cmIco.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${CONFIRM_ICON[kind]}</svg>`;
    cmTitle.textContent = c.title;
    cmText.textContent = c.text;
    cmQuest.textContent = q.title;
    cmMeta.innerHTML =
      `<span class="chip chip-${q.cat}">${CATEGORY_LABEL[q.cat]}</span>` +
      esc(
        q.status === "done"
          ? doneLabel(q.completed)
          : PRIORITY_LABEL[q.priority] + " priority",
      );
    cmXp.textContent = c.xp;
    cmXp.className = "cm-xp " + c.xpClass;
    cmOk.textContent = c.ok;
    cmOk.className = c.okClass + " fx";
    // Delete = hindi na maibabalik, kaya sa Cancel ang focus. Yung iba, sa main button.
    openModal(confirmModal, kind === "delete" ? cmCancel : cmOk, returnEl);
  }

  cmOk.addEventListener("click", () => {
    if (!confirming) return;
    const { kind, q } = confirming;
    confirming = null;
    closeModal({ restoreFocus: false });
    if (!quests.includes(q)) return;
    if (kind === "done") completeQuest(q);
    else if (kind === "undo") undoDone(q);
    else {
      quests.splice(quests.indexOf(q), 1);
      knownOverdue.delete(q.id);
      render();
      addBtn.focus();
      announce(`Deleted "${q.title}".`);
    }
  });

  // ---------- toolbar (search, filter chips, Add quest) ----------

  function syncControls() {
    filterChips.forEach((chip) => {
      const on = chip.dataset.filter === state.filter;
      chip.classList.toggle("on", on);
      chip.setAttribute("aria-pressed", String(on));
    });
    if (searchInput.value.trim() !== state.query)
      searchInput.value = state.query;
    searchClear.hidden = !state.query;
  }

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.filter;
      syncControls();
      render();
    });
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim();
    syncControls();
    render();
  });

  searchClear.addEventListener("click", () => {
    state.query = "";
    syncControls();
    render();
    searchInput.focus();
  });

  emptyReset.addEventListener("click", () => {
    state.query = "";
    state.filter = "all";
    syncControls();
    render();
    searchInput.focus();
  });

  addBtn.addEventListener("click", () => openQuestModal(null, addBtn));
  emptyAdd.addEventListener("click", () => openQuestModal(null, emptyAdd));

  // ---------- start (unang takbo pagbukas ng page) ----------

  // Galing sa notification (bell): buksan ang details ng quest na 'yon
  function openFromNotification(id) {
    const q = findQuest(id);
    if (!q) {
      showToast({
        tone: "info",
        title: "This quest was deleted",
        text: "It's no longer on your board.",
        announce: true,
      });
      return;
    }
    openDetail(q, $("notifBtn") || addBtn);
  }
  document.addEventListener("questify:open-quest", (e) =>
    openFromNotification(e.detail.id),
  );

  paintLevel();
  syncControls();
  syncSort();
  render({ animate: false });

  // tasks.html?quest=q9 (click sa notification mula sa ibang page)
  const fromNotif = new URLSearchParams(location.search).get("quest");
  if (fromNotif) {
    history.replaceState(null, "", location.pathname + location.hash);
    openFromNotification(fromNotif);
  } else {
    nudge(quests.filter(isOverdue));
  }
  notifyOverdue(quests.filter(isOverdue));
});
