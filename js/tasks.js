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
(function () {
  const XP_BY_PRIORITY = { low: 10, medium: 20, high: 30 };
  const PRIORITY_VALUE = { low: 1, medium: 2, high: 3 };
  const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
  const CATEGORY_LABEL = { work: 'Work', growth: 'Learning', health: 'Health' };
  const STATUSES = ['todo', 'doing', 'done'];
  const STATUS_LABEL = { todo: 'To do', doing: 'Doing', done: 'Done' };
  const COLUMN_EMPTY = {
    todo: 'Nothing queued.',
    doing: 'Nothing in progress.',
    done: 'Nothing finished yet.'
  };
  // Bawat sort may sariling default na direction (hal. Due date = pinakamalapit muna).
  // Sa To do at Doing lang gumagana yung sort; ang Done ay laging pinakabago sa taas.
  const SORTS = {
    due: { label: 'Due date', dir: 'asc' },
    xp: { label: 'XP value', dir: 'desc' },
    priority: { label: 'Priority', dir: 'desc' },
    added: { label: 'Date added', dir: 'desc' },
    manual: { label: 'Manual', dir: null }
  };
  const DRAG_THRESHOLD = 6;
  const LONG_PRESS_MS = 350;
  const UNDO_MS = 6000;
  // Ilang card lang ang pinapakita per column bago lumabas yung "Show all".
  const COLUMN_LIMIT = 10;
  // Pangalan ng save sa localStorage. Binabasa rin 'to ng js/nav.js para sa Level
  // pill ng Dashboard / Profile / About.
  const STORE_KEY = 'questify.board.v1';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Panimulang XP (pareho sa Dashboard): 1,450 XP ÷ 125 per level = Level 12.
  const STARTING_XP = 1450;
  const XP_PER_LEVEL = 125;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- dates (pang-format ng petsa, hal. "Sep 27", "Done yesterday") ----------

  const pad = n => String(n).padStart(2, '0');
  const isoFor = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayIso = () => isoFor(new Date());

  function isoOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return isoFor(d);
  }

  function parseIso(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function shortDate(iso) {
    const d = parseIso(iso);
    return MONTHS[d.getMonth()] + ' ' + pad(d.getDate());
  }

  function longDate(date) {
    return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  function doneLabel(ms) {
    const iso = isoFor(new Date(ms));
    if (iso === todayIso()) return 'Done today';
    if (iso === isoOffset(-1)) return 'Done yesterday';
    return 'Done ' + shortDate(iso);
  }

  const isOverdue = q => q.status !== 'done' && !!q.due && q.due < todayIso();

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
      const done = status === 'done';
      return {
        id: 'q' + n,
        title, desc, cat, priority, status, due,
        earned: done ? XP_BY_PRIORITY[priority] : null,
        completed: done ? parseIso(due).getTime() + 18 * 3600000 : null,
        added: seedStart + n * 3 * 3600000,
        rank: n
      };
    };
    return [
      seed('Send client proposal', 'Attach the PDF and hit send before noon.', 'work', 'high', 2, 'todo'),
      seed('Inbox zero', 'Leave the work inbox at zero before you log off.', 'work', 'low', -1, 'todo'),
      seed('Draft weekly report', 'One page. What moved. What is next.', 'work', 'medium', 3, 'todo'),
      seed('Outline lecture notes', 'Headings only — the full write-up can wait.', 'growth', 'medium', 4, 'todo'),
      seed('Pack gym bag', 'Shoes, bottle, headphones. Night-before so morning is easy.', 'health', 'low', 0, 'todo'),
      seed('Call the supplier', 'Confirm the Friday delivery window.', 'work', 'high', 5, 'todo'),
      seed('Read 20 pages', 'Stay in the same book. Twenty real pages.', 'growth', 'medium', -2, 'doing'),
      seed('Refactor login form', 'Labels, errors, and the gold / lime buttons.', 'work', 'high', 1, 'doing'),
      seed('30-min walk', 'Outside. Phone stays in a pocket.', 'health', 'medium', 0, 'doing'),
      seed('Watch one course module', 'One module, notes in the same sitting.', 'growth', 'medium', 2, 'doing'),
      seed('45-min run', 'Easy pace. It counted.', 'health', 'medium', -1, 'done'),
      seed('Morning stretch', 'Ten minutes before the first meeting.', 'health', 'low', -2, 'done'),
      seed('Ship slide deck', 'Sent. Not perfect. Sent.', 'work', 'high', -3, 'done'),
      seed('Journal half a page', 'What actually happened today.', 'growth', 'low', -3, 'done'),
      seed('Water plants / walk', 'Two minutes. Then a loop around the block.', 'health', 'low', -4, 'done'),
      seed('Plan next week', 'Pick the top three quests.', 'work', 'medium', -5, 'done')
    ];
  }

  // XP ledger = listahan ng lahat ng nakuhang XP. Pag nag-delete ng quest, hindi
  // nababawas yung XP. Yung Undo lang pagkatapos ng "Mark done" ang nagbabawas.
  const startingXp = () => [{ id: null, xp: STARTING_XP }];

  // ---------- saving (localStorage = maliit na storage ng browser) ----------

  const isQuest = q => !!q &&
    typeof q.id === 'string' && typeof q.title === 'string' && typeof q.desc === 'string' &&
    STATUSES.includes(q.status) && !!CATEGORY_LABEL[q.cat] && !!XP_BY_PRIORITY[q.priority] &&
    typeof q.due === 'string' && typeof q.added === 'number' && typeof q.rank === 'number' &&
    (q.status !== 'done' || (typeof q.earned === 'number' && typeof q.completed === 'number'));

  // Babasahin yung naka-save. Kung wala, sira, o naka-block yung storage
  // (hal. private mode), null ang babalik at sample quests ang lalabas.
  function loadBoard() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!data || !Array.isArray(data.quests) || !data.quests.every(isQuest)) return null;
      if (!Array.isArray(data.xp) || !data.xp.every(entry => entry && Number.isFinite(entry.xp))) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function saveBoard() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        quests, xp: bankedXp, nextId, sort: state.sort, dir: state.dir
      }));
    } catch (err) {
      // Naka-block o puno yung storage: gagana pa rin yung board, hindi lang ma-sa-save.
    }
  }

  // Pagbukas ng page: kunin yung naka-save. Kung wala, sample quests.
  const saved = loadBoard();
  let quests = saved ? saved.quests : sampleQuests();
  let bankedXp = saved ? saved.xp : startingXp();
  if (saved) {
    const highest = Math.max(0, ...quests.map(q => parseInt(q.id.slice(1), 10) || 0));
    nextId = Math.max(Number(saved.nextId) || 0, highest + 1);
  }

  // Tinatandaan yung Sort. Hindi tinatandaan yung search at category filter.
  const state = { filter: 'all', query: '', sort: 'due', dir: 'asc' };
  if (saved && SORTS[saved.sort]) {
    state.sort = saved.sort;
    if (saved.dir === 'asc' || saved.dir === 'desc') state.dir = saved.dir;
  }

  const $ = id => document.getElementById(id);
  const board = $('board');
  const lists = {};
  const counts = {};
  const moreBtns = {};
  const expanded = {};
  STATUSES.forEach(s => {
    lists[s] = board.querySelector(`[data-list="${s}"]`);
    counts[s] = board.querySelector(`[data-count="${s}"]`);
    moreBtns[s] = board.querySelector(`[data-more="${s}"]`);
    expanded[s] = false;
  });

  const searchInput = $('questSearch');
  const searchClear = $('searchClear');
  const filterChips = document.querySelectorAll('.filters .chip');
  const addBtn = $('addQuestBtn');
  const emptyBox = $('boardEmpty');
  const emptyTitle = $('emptyTitle');
  const emptyText = $('emptyText');
  const emptyReset = $('emptyReset');
  const emptyAdd = $('emptyAdd');
  const announcer = $('announcer');
  const toast = $('toast');
  const toastText = $('toastText');
  const toastAction = $('toastAction');

  const sortBtn = $('sortBtn');
  const sortValue = $('sortValue');
  const sortPanel = $('sortPanel');
  const sortItems = [...sortPanel.querySelectorAll('[data-sort]')];
  const sortDir = $('sortDir');

  const levelPill = $('levelPill');
  const levelNum = $('levelNum');
  const levelXp = $('levelXp');
  const levelFill = $('levelFill');

  const questModal = $('questModal');
  const questForm = $('questForm');
  const questModalTitle = $('questModalTitle');
  const qTitle = $('qTitle');
  const qTitleErr = $('qTitleErr');
  const qDesc = $('qDesc');
  const qCat = $('qCat');
  const qPriority = $('qPriority');
  const qDue = $('qDue');
  const qXp = $('qXp');
  const qSubmit = $('qSubmit');

  const detailModal = $('detailModal');
  const detailClose = $('detailClose');

  const deleteModal = $('deleteModal');
  const delText = $('delText');
  const delCancel = $('delCancel');
  const delConfirm = $('delConfirm');

  // ---------- helpers (maliliit na tools na paulit-ulit gamitin) ----------

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ESCAPES[c]);
  const findQuest = id => quests.find(q => q.id === id);
  const shownXp = q => (q.status === 'done' ? q.earned : XP_BY_PRIORITY[q.priority]);

  function restartAnimation(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function announce(message) {
    announcer.textContent = message;
  }

  // ---------- toast (yung maliit na message sa baba, may Undo minsan) ----------

  let toastTimer = null;
  let toastRun = null;

  function showToast(message, { tone = 'alert', action = null } = {}) {
    toast.dataset.tone = tone;
    toastText.textContent = message;
    toastRun = action ? action.run : null;
    toastAction.hidden = !action;
    if (action) toastAction.textContent = action.label;
    toast.hidden = false;
    if (!reduceMotion.matches) restartAnimation(toast, 'toast');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? UNDO_MS : 5000);
  }

  function hideToast() {
    toast.hidden = true;
    toastRun = null;
  }

  toast.addEventListener('click', e => {
    const run = e.target.closest('#toastAction') ? toastRun : null;
    hideToast();
    if (run) run();
  });

  // Ctrl+Z = Undo, basta hindi ka nagta-type sa isang input.
  document.addEventListener('keydown', e => {
    if (!toastRun || e.key.toLowerCase() !== 'z' || !(e.ctrlKey || e.metaKey) || e.shiftKey) return;
    if (e.target.closest('input, textarea, select')) return;
    e.preventDefault();
    const run = toastRun;
    hideToast();
    run();
  });

  // ---------- filtering + sorting (search, category chips, Sort) ----------

  function matches(q) {
    if (state.filter !== 'all' && q.cat !== state.filter) return false;
    if (!state.query) return true;
    return (q.title + ' ' + q.desc).toLowerCase().includes(state.query.toLowerCase());
  }

  function compare(a, b) {
    if (state.sort === 'manual') return a.rank - b.rank;
    const dir = state.dir === 'asc' ? 1 : -1;
    const byTitle = a.title.localeCompare(b.title);
    const byDue = (a.due || '9999').localeCompare(b.due || '9999');

    if (state.sort === 'due') {
      // Overdue laging nasa taas kahit anong direction, pinaka-late muna.
      const ao = isOverdue(a);
      const bo = isOverdue(b);
      if (ao !== bo) return ao ? -1 : 1;
      if (ao) return byDue || byTitle;
      if (!a.due !== !b.due) return a.due ? -1 : 1;
      return dir * byDue || PRIORITY_VALUE[b.priority] - PRIORITY_VALUE[a.priority] || byTitle;
    }
    if (state.sort === 'xp') return dir * (shownXp(a) - shownXp(b)) || byDue || byTitle;
    if (state.sort === 'priority') return dir * (PRIORITY_VALUE[a.priority] - PRIORITY_VALUE[b.priority]) || byDue || byTitle;
    return dir * (a.added - b.added) || byTitle;
  }

  // Yung manual order (drag) ay naka-save sa `rank`. Bago yung unang drag,
  // kinokopya muna yung order na nakikita mo para walang tatalon na card.
  function freezeOrder() {
    if (state.sort === 'manual') return;
    quests.slice().sort(compare).forEach((q, i) => { q.rank = i; });
  }

  function normalizeRanks() {
    quests.slice().sort((a, b) => a.rank - b.rank).forEach((q, i) => { q.rank = i; });
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
    setSort('manual');
  }

  function moveToColumnTop(q, status) {
    const ranks = quests.filter(x => x.status === status && x !== q).map(x => x.rank);
    q.status = status;
    if (ranks.length) q.rank = Math.min(...ranks) - 1;
  }

  // ---------- rendering (pag-drawing ng cards sa screen) ----------

  function dueText(q) {
    if (!q.due) return 'No date';
    return isOverdue(q) ? 'Was due ' + shortDate(q.due) : shortDate(q.due);
  }

  function menuHtml(q, title) {
    const edit = q.status === 'done' ? '' : '<button type="button" role="menuitem" data-action="edit">Edit</button>';
    return `
      <div class="qcard-menu">
        <button type="button" class="kebab" data-action="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Options for ${title}"></button>
        <div class="qmenu" role="menu" hidden>
          ${edit}
          <button type="button" role="menuitem" class="danger" data-action="delete">Delete</button>
        </div>
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
        ${q.desc ? `<p class="cap">${esc(q.desc)}</p>` : ''}
        <div class="meta">
          <span class="chip chip-${q.cat}">${CATEGORY_LABEL[q.cat]}</span>
          <span class="xp earned">+${q.earned} XP earned</span>
          <span class="due">${doneLabel(q.completed)}</span>
        </div>
        <div class="qactions"><span class="done-label">Completed</span></div>
      </article>`;
  }

  function cardHtml(q) {
    if (q.status === 'done') return doneCardHtml(q);
    const overdue = isOverdue(q);
    const title = esc(q.title);
    const action = q.status === 'todo'
      ? '<button type="button" class="btn-gold fx" data-action="start">Start</button>'
      : '<button type="button" class="btn-lime fx" data-action="done">Mark done</button>';
    return `
      <article class="qcard can-drag${overdue ? ' is-overdue' : ''}" data-id="${q.id}">
        <div class="qcard-head">
          <h3 class="qcard-title"><button type="button" class="qcard-open" data-action="open" aria-haspopup="dialog" aria-describedby="dragHelp">${title}</button></h3>
          <div class="qcard-tools">${menuHtml(q, title)}</div>
        </div>
        ${q.desc ? `<p class="cap">${esc(q.desc)}</p>` : ''}
        <div class="meta">
          <span class="chip chip-${q.cat}">${CATEGORY_LABEL[q.cat]}</span>
          <span class="xp" title="${PRIORITY_LABEL[q.priority]} priority">+${shownXp(q)} XP</span>
          ${overdue ? '<span class="badge-overdue">Overdue</span>' : ''}
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
    STATUSES.forEach(status => {
      let items = visible.filter(q => q.status === status);
      items = status === 'done'
        ? items.sort((a, b) => b.completed - a.completed)
        : items.sort(compare);

      // Kung yung kakagalaw na quest ay lampas card 10, bubuksan na yung column (Show all).
      if (highlight && items.findIndex(q => q.id === highlight) >= COLUMN_LIMIT) expanded[status] = true;
      const long = items.length > COLUMN_LIMIT;
      const shown = long && !expanded[status] ? items.slice(0, COLUMN_LIMIT) : items;

      counts[status].textContent = items.length;
      lists[status].innerHTML = shown.length
        ? shown.map(cardHtml).join('')
        : `<p class="col-empty">${COLUMN_EMPTY[status]}</p>`;

      const more = moreBtns[status];
      more.parentElement.hidden = !long;
      more.textContent = expanded[status] ? 'Show less' : `Show all (${items.length})`;
      more.setAttribute('aria-expanded', String(expanded[status]));
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
    else if (er.bottom > lr.bottom) list.scrollTop += er.bottom - lr.bottom + 16;
  }

  // Yung fade sa baba ng column, lalabas lang kung may cards pa sa ilalim.
  function updateFade(list) {
    const more = list.scrollHeight - list.scrollTop - list.clientHeight > 4;
    list.parentElement.classList.toggle('has-more', more);
  }

  function updateFades() {
    STATUSES.forEach(s => updateFade(lists[s]));
  }

  STATUSES.forEach(s => {
    lists[s].addEventListener('scroll', () => updateFade(lists[s]), { passive: true });
    moreBtns[s].addEventListener('click', () => {
      expanded[s] = !expanded[s];
      render();
      announce(expanded[s]
        ? `Showing all ${STATUS_LABEL[s]} quests.`
        : `Showing the first ${COLUMN_LIMIT} ${STATUS_LABEL[s]} quests.`);
    });
  });
  window.addEventListener('resize', updateFades);

  function fillEmptyState() {
    emptyReset.hidden = false;
    if (state.query) {
      emptyTitle.textContent = `No quests match "${state.query}"`;
      emptyText.textContent = 'Check the spelling, clear the search, or add a new quest.';
      emptyReset.textContent = 'Clear search';
    } else if (state.filter !== 'all') {
      emptyTitle.textContent = `No ${CATEGORY_LABEL[state.filter]} quests yet`;
      emptyText.textContent = 'Add one, or go back to all quests.';
      emptyReset.textContent = 'Show all quests';
    } else {
      emptyTitle.textContent = 'Your board is empty';
      emptyText.textContent = 'Add a quest to get started.';
      emptyReset.hidden = true;
    }
  }

  // FLIP animation: tandaan kung nasaan bawat card, i-render ulit, tapos
  // i-animate bawat card mula sa dati niyang pwesto papunta sa bago.
  function snapshot() {
    const rects = new Map();
    board.querySelectorAll('.qcard').forEach(el => rects.set(el.dataset.id, {
      rect: el.getBoundingClientRect(),
      list: el.parentElement.dataset.list
    }));
    return rects;
  }

  function play(first, highlight) {
    board.querySelectorAll('.qcard').forEach(el => {
      const id = el.dataset.id;
      const before = first.get(id);
      if (!before) {
        el.animate(
          [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }],
          { duration: 240, easing: 'ease-out' }
        );
        return;
      }
      const after = el.getBoundingClientRect();
      const dx = before.rect.left - after.left;
      const dy = before.rect.top - after.top;
      if (!dx && !dy) return;

      const travelling = id === highlight;
      const keyframes = [
        { transform: `translate(${dx}px, ${dy}px)${travelling ? ' scale(1.03)' : ''}` },
        { transform: 'none' }
      ];
      const timing = { duration: travelling ? 560 : 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };

      // May sariling scroll bawat column, kaya pag lumipat ng column yung card,
      // mapuputol yung animation. Kaya kopya ng card yung "lumilipad" papunta doon.
      if (before.list !== el.parentElement.dataset.list) {
        flyCopy(el, after, keyframes, timing, travelling);
        return;
      }

      el.classList.add('is-moving');
      const anim = el.animate(keyframes, timing);
      const done = () => el.classList.remove('is-moving');
      anim.onfinish = done;
      anim.oncancel = done;
    });

    if (highlight) {
      const el = board.querySelector(`[data-id="${highlight}"]`);
      if (el) {
        el.classList.add('arrived');
        el.addEventListener('animationend', () => el.classList.remove('arrived'), { once: true });
      }
    }
  }

  function flyCopy(el, rect, keyframes, timing, arrived) {
    const copy = el.cloneNode(true);
    copy.removeAttribute('data-id');
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    copy.classList.add('qcard-flying');
    if (arrived) copy.classList.add('arrived');
    Object.assign(copy.style, {
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px'
    });
    document.body.appendChild(copy);
    // Opacity (hindi visibility) para ma-focus pa rin yung totoong card habang lumilipad yung kopya.
    el.style.opacity = '0';

    const anim = copy.animate(keyframes, timing);
    const done = () => {
      copy.remove();
      el.style.opacity = '';
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  function focusCard(id, target = 'action') {
    const el = board.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    const pick = {
      action: el.querySelector('.qactions button') || el.querySelector('.kebab'),
      kebab: el.querySelector('.kebab'),
      title: el.querySelector('.qcard-open')
    };
    pick[target].focus();
  }

  // ---------- level pill (Level at XP sa header) ----------

  const totalXp = () => bankedXp.reduce((sum, entry) => sum + entry.xp, 0);
  const xpLabel = n => n.toLocaleString('en-US') + ' XP';
  let levelTimer = null;
  let glowTimer = null;
  let countFrame = 0;
  let pillXp = 0; // what the pill's XP text says right now

  function setFill(pct, animate = true) {
    if (!animate) levelFill.style.transition = 'none';
    levelFill.style.width = pct + '%';
    if (!animate) {
      void levelFill.offsetWidth;
      levelFill.style.transition = '';
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

    levelNum.textContent = 'Level ' + level;
    levelPill.dataset.level = level;
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
      restartAnimation(levelNum, 'pop');
    } else if (level < prevLevel) {
      // Undo na nagpababa ng level: ubusin yung bar, tapos ipakita ulit yung laman ng dating level.
      setFill(0);
      levelTimer = setTimeout(() => {
        setFill(100, false);
        setFill(pct);
      }, 600);
      restartAnimation(levelNum, 'pop');
    } else {
      setFill(pct);
    }

    restartAnimation(levelPill, 'bump');
    levelFill.classList.add('glow');
    clearTimeout(glowTimer);
    glowTimer = setTimeout(() => levelFill.classList.remove('glow'), 700);

    // Yung "+20 XP" / "−20 XP" na lumalabas sa dulo ng bar tapos bumababa
    // (pababa kasi kung pataas, lalabas na sa screen). Isa lang ang pinapakita.
    levelPill.querySelectorAll('.level-float').forEach(el => el.remove());
    const float = document.createElement('span');
    float.className = 'level-float' + (change < 0 ? ' neg' : '');
    float.textContent = (change < 0 ? '−' : '+') + Math.abs(change) + ' XP';
    const track = levelFill.parentElement;
    float.style.left = track.offsetLeft + (track.offsetWidth * pct) / 100 + 'px';
    levelPill.appendChild(float);
    float.addEventListener('animationend', () => float.remove());
  }

  // ---------- quest actions (Start, Mark done, Undo) ----------

  // "Start": ililipat sa Doing, sa pinakataas.
  function startQuest(q) {
    moveToColumnTop(q, 'doing');
    render({ highlight: q.id });
    focusCard(q.id);
    announce(`Started "${q.title}". It moved to Doing.`);
  }

  // "Mark done": lipat sa Done + dagdag XP sa ledger + toast na may Undo.
  // `rankBefore` = tinatandaan yung dating pwesto para maibalik kung mag-Undo.
  function completeQuest(q) {
    const levelBefore = Number(levelPill.dataset.level);
    const rankBefore = q.rank;
    q.status = 'done';
    q.completed = Date.now();
    q.earned = XP_BY_PRIORITY[q.priority];
    bankedXp.push({ id: q.id, xp: q.earned });
    knownOverdue.delete(q.id);
    render({ highlight: q.id });
    paintLevel(q.earned);
    focusCard(q.id, 'kebab');

    const levelNow = Number(levelPill.dataset.level);
    const levelUp = levelNow > levelBefore ? ` Level ${levelNow}!` : '';
    showToast(`Marked "${q.title}" done. +${q.earned} XP.${levelUp}`, {
      tone: 'success',
      action: { label: 'Undo', run: () => undoComplete(q, rankBefore) }
    });
    announce(`Completed "${q.title}". Plus ${q.earned} XP.${levelUp} Undo is available for a few seconds, or press Control Z.`);
  }

  // Undo: ibabalik sa Doing (sa dating pwesto) at babawiin yung XP.
  function undoComplete(q, rankBefore) {
    if (q.status !== 'done' || !quests.includes(q)) return;
    const i = bankedXp.findLastIndex(entry => entry.id === q.id);
    const lost = i > -1 ? bankedXp.splice(i, 1)[0].xp : 0;
    q.status = 'doing';
    q.earned = null;
    q.completed = null;
    q.rank = rankBefore;
    render({ highlight: q.id });
    paintLevel(-lost);
    focusCard(q.id);
    announce(`Undone. "${q.title}" is back in Doing.`);
  }

  // ---------- overdue nudge (paalala pag late na yung quest) ----------

  let knownOverdue = new Set(quests.filter(isOverdue).map(q => q.id));

  function nudge(list) {
    if (!list.length) return;
    showToast(list.length === 1
      ? `"${list[0].title}" is overdue.`
      : `${list.length} quests are overdue. They're marked in red.`);
  }

  // Chine-check kada minuto: hal. pag lumampas ng hatinggabi, o nag-save ka ng lumang petsa.
  function checkOverdue({ rerender = true } = {}) {
    const now = quests.filter(isOverdue);
    const fresh = now.filter(q => !knownOverdue.has(q.id));
    knownOverdue = new Set(now.map(q => q.id));
    if (fresh.length) {
      if (rerender) render();
      nudge(fresh);
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
    kebab.setAttribute('aria-expanded', 'true');
    kebab.closest('.qcard').classList.add('menu-open');
    openMenu = { kebab, menu };
    menu.querySelector('[role="menuitem"]').focus();
  }

  function closeMenu({ returnFocus = false } = {}) {
    if (!openMenu) return;
    const { kebab, menu } = openMenu;
    openMenu = null;
    menu.hidden = true;
    kebab.setAttribute('aria-expanded', 'false');
    const card = kebab.closest('.qcard');
    if (card) card.classList.remove('menu-open');
    if (returnFocus) kebab.focus();
  }

  // Isang listener lang para sa lahat ng button sa cards. Bawat button may
  // data-action (hal. data-action="done") kaya alam natin kung anong function.
  board.addEventListener('click', e => {
    if (justDragged) return;
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('.qcard');
    const q = card && findQuest(card.dataset.id);
    if (!q) return;
    const kebab = card.querySelector('.kebab');

    switch (btn.dataset.action) {
      case 'open': openDetail(q, card.querySelector('.qcard-open')); break;
      case 'start': startQuest(q); break;
      case 'done': completeQuest(q); break;
      case 'menu': toggleMenu(btn); break;
      case 'edit': closeMenu(); openQuestModal(q, kebab); break;
      case 'delete': closeMenu(); openDeleteModal(q, kebab); break;
    }
  });

  board.addEventListener('keydown', e => {
    if (openMenu) {
      const items = [...openMenu.menu.querySelectorAll('[role="menuitem"]')];
      const i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu({ returnFocus: true });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Tab') {
        closeMenu();
      }
      return;
    }

    // Alt + arrow up/down: ilipat yung naka-focus na card (para sa keyboard users).
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const card = e.target.closest('.qcard.can-drag');
      if (!card) return;
      e.preventDefault();
      nudgeCard(findQuest(card.dataset.id), e.key === 'ArrowUp' ? -1 : 1);
    }
  });

  document.addEventListener('click', e => {
    if (openMenu && !e.target.closest('.qcard-menu')) closeMenu();
    if (!sortPanel.hidden && !e.target.closest('.sort-wrap')) closeSortPanel();
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
      .filter(el => el.classList.contains('drag-placeholder') || (el.classList.contains('qcard') && el !== skip))
      .map(el => (el.classList.contains('drag-placeholder') ? drag.q.id : el.dataset.id));
  }

  // Gitna ng card (hindi kasama yung animation na tumatakbo pa).
  function layoutMid(el) {
    const r = el.getBoundingClientRect();
    const t = getComputedStyle(el).transform;
    const ty = t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
    return r.top - ty + r.height / 2;
  }

  board.addEventListener('pointerdown', e => {
    if (drag || pending || e.button !== 0) return;
    const card = e.target.closest('.qcard.can-drag');
    if (!card || e.target.closest('.qactions button, .qcard-menu')) return;
    pending = {
      card,
      pointerId: e.pointerId,
      touch: e.pointerType === 'touch',
      x: e.clientX,
      y: e.clientY,
      lastY: e.clientY,
      timer: 0
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
    const placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = rect.height + 'px';
    list.insertBefore(placeholder, card);

    Object.assign(card.style, {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      margin: '0'
    });
    card.classList.add('is-dragging');
    document.body.classList.add('is-sorting');
    try { card.setPointerCapture(pointerId); } catch (err) { /* bitaw na yung pointer */ }
    if (navigator.vibrate) navigator.vibrate(8);

    drag = {
      q: findQuest(card.dataset.id),
      card, list, placeholder, rect, pointerId,
      startY: y,
      pointerY: lastY,
      startIds: null,
      raf: 0
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
    top = Math.max(listRect.top - 12, Math.min(listRect.bottom - rect.height + 12, top));
    card.style.transform = `translateY(${top - rect.top}px)`;

    const centre = top + rect.height / 2;
    const siblings = [...list.children].filter(el => el.classList.contains('qcard') && el !== card);
    const before = siblings.find(el => centre < layoutMid(el)) || null;

    let current = placeholder.nextElementSibling;
    if (current === card) current = current.nextElementSibling;
    if (current === before) return;

    const first = new Map(siblings.map(el => [el, el.getBoundingClientRect()]));
    list.insertBefore(placeholder, before);
    if (reduceMotion.matches) return;
    siblings.forEach(el => {
      const dy = first.get(el).top - el.getBoundingClientRect().top;
      if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
    });
  }

  // Gaano kabilis mag-scroll pag malapit na sa gilid yung pointer.
  function edgeStep(y, top, bottom, zone) {
    if (y < top + zone) return -Math.min(18, Math.ceil((top + zone - y) / 5));
    if (y > bottom - zone) return Math.min(18, Math.ceil((y - (bottom - zone)) / 5));
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
      window.scrollBy({ top: pageStep, behavior: 'instant' });
      moved = true;
    }

    if (moved) {
      updateFade(list);
      moveDrag();
    }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  document.addEventListener('pointermove', e => {
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
  document.addEventListener('touchmove', e => {
    if (drag) e.preventDefault();
  }, { passive: false });

  board.addEventListener('contextmenu', e => {
    if (drag || (pending && pending.touch)) e.preventDefault();
  });

  function endDrag(cancelled) {
    cancelPending();
    if (!drag) return;
    cancelAnimationFrame(drag.raf);
    const { q, card, list, placeholder, startIds } = drag;
    const ids = visibleIds(list, card);
    const first = snapshot();

    card.removeAttribute('style');
    card.classList.remove('is-dragging');
    placeholder.remove();
    document.body.classList.remove('is-sorting');
    drag = null;
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 0);

    const moved = !cancelled && ids.join() !== startIds.join();
    if (moved) placeManually(q, ids);
    render({ first });
    if (moved) {
      const pos = ids.indexOf(q.id) + 1;
      announce(`Moved "${q.title}" to position ${pos} of ${ids.length} in ${STATUS_LABEL[q.status]}. Sort switched to Manual.`);
    }
  }

  document.addEventListener('pointerup', () => endDrag(false));
  document.addEventListener('pointercancel', () => endDrag(true));

  function nudgeCard(q, delta) {
    const ids = [...lists[q.status].querySelectorAll('.qcard')].map(el => el.dataset.id);
    const from = ids.indexOf(q.id);
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, q.id);
    placeManually(q, ids);
    render();
    focusCard(q.id, 'title');
    announce(`"${q.title}" is now ${to + 1} of ${ids.length} in ${STATUS_LABEL[q.status]}.`);
  }

  // ---------- sort control (dropdown + arrow ng direction) ----------

  function setSort(key) {
    state.sort = key;
    if (SORTS[key].dir) state.dir = SORTS[key].dir;
    syncSort();
  }

  function syncSort() {
    sortValue.textContent = SORTS[state.sort].label;
    sortItems.forEach(item => item.setAttribute('aria-checked', String(item.dataset.sort === state.sort)));
    const manual = state.sort === 'manual';
    const asc = state.dir === 'asc';
    sortDir.disabled = manual;
    sortDir.classList.toggle('desc', !asc);
    const label = manual
      ? 'Sort direction does not apply to manual order'
      : asc ? 'Ascending. Switch to descending' : 'Descending. Switch to ascending';
    sortDir.setAttribute('aria-label', label);
    sortDir.title = manual ? 'Not used in manual order' : asc ? 'Ascending' : 'Descending';
  }

  function openSortPanel() {
    sortPanel.hidden = false;
    sortBtn.setAttribute('aria-expanded', 'true');
    (sortItems.find(i => i.getAttribute('aria-checked') === 'true') || sortItems[0]).focus();
  }

  function closeSortPanel(returnFocus = false) {
    if (sortPanel.hidden) return;
    sortPanel.hidden = true;
    sortBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) sortBtn.focus();
  }

  sortBtn.addEventListener('click', () => {
    if (sortPanel.hidden) openSortPanel();
    else closeSortPanel();
  });

  sortPanel.addEventListener('click', e => {
    const item = e.target.closest('[data-sort]');
    if (!item) return;
    setSort(item.dataset.sort);
    closeSortPanel(true);
    render();
    announce(`Sorted by ${SORTS[state.sort].label}.`);
  });

  sortPanel.addEventListener('keydown', e => {
    const i = sortItems.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSortPanel(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      sortItems[(i + 1) % sortItems.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      sortItems[(i - 1 + sortItems.length) % sortItems.length].focus();
    } else if (e.key === 'Tab') {
      closeSortPanel();
    }
  });

  sortDir.addEventListener('click', () => {
    state.dir = state.dir === 'asc' ? 'desc' : 'asc';
    syncSort();
    render();
    announce(`${SORTS[state.sort].label}, ${state.dir === 'asc' ? 'ascending' : 'descending'}.`);
  });

  // ---------- dialogs (popups: Add/Edit, Details, Delete) ----------

  let activeModal = null;
  let returnFocusTo = null;

  function openModal(modal, focusEl, returnEl) {
    activeModal = modal;
    returnFocusTo = returnEl;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    focusEl.focus();
  }

  function closeModal({ restoreFocus = true } = {}) {
    if (!activeModal) return;
    activeModal.hidden = true;
    activeModal = null;
    document.body.classList.remove('modal-open');
    if (restoreFocus) {
      const target = returnFocusTo && returnFocusTo.isConnected && returnFocusTo.offsetParent ? returnFocusTo : addBtn;
      target.focus();
    }
  }

  [questModal, detailModal, deleteModal].forEach(modal => {
    let pressedBackdrop = false;
    modal.addEventListener('mousedown', e => { pressedBackdrop = e.target === modal; });
    modal.addEventListener('click', e => {
      if (e.target.closest('[data-close]') || (pressedBackdrop && e.target === modal)) closeModal();
    });
  });

  document.addEventListener('keydown', e => {
    if (!activeModal) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = [...activeModal.querySelectorAll('button, input, select')]
      .filter(el => !el.disabled && el.offsetParent !== null);
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
    const status = $('dStatus');
    status.textContent = STATUS_LABEL[q.status] + (overdue ? ' · Overdue' : '');
    status.className = `detail-status status-${q.status}${overdue ? ' is-overdue' : ''}`;
    $('dTitle').textContent = q.title;

    const desc = $('dDesc');
    desc.textContent = q.desc || 'No description.';
    desc.classList.toggle('muted', !q.desc);

    $('dCat').innerHTML = `<span class="chip chip-${q.cat}">${CATEGORY_LABEL[q.cat]}</span>`;
    $('dPriority').textContent = PRIORITY_LABEL[q.priority];
    $('dXp').textContent = `+${shownXp(q)} XP` + (q.status === 'done' ? ' earned' : '');

    const due = $('dDue');
    due.textContent = q.due ? longDate(parseIso(q.due)) + (overdue ? ' (overdue)' : '') : 'No due date';
    due.classList.toggle('overdue', overdue);
    $('dAdded').textContent = longDate(new Date(q.added));

    $('dCompletedRow').hidden = !q.completed;
    if (q.completed) $('dCompleted').textContent = longDate(new Date(q.completed));

    openModal(detailModal, detailClose, returnEl);
  }

  // Add / Edit quest (To do at Doing lang; yung Done may XP na kaya hindi na ine-edit)

  let editing = null;

  function showTitleError(on) {
    qTitleErr.classList.toggle('show', on);
    qTitle.setAttribute('aria-invalid', on ? 'true' : 'false');
  }

  function updateXpReadout(bump) {
    qXp.textContent = '+' + XP_BY_PRIORITY[qPriority.value] + ' XP';
    if (bump && !reduceMotion.matches) restartAnimation(qXp, 'bump');
  }

  function openQuestModal(q, returnEl) {
    editing = q;
    questModalTitle.textContent = q ? 'Edit quest' : 'Add quest';
    qSubmit.textContent = q ? 'Save changes' : 'Add quest';
    qTitle.value = q ? q.title : '';
    qDesc.value = q ? q.desc : '';
    qCat.value = q ? q.cat : (state.filter !== 'all' ? state.filter : 'work');
    qPriority.value = q ? q.priority : 'medium';
    qDue.value = q ? q.due : todayIso();
    showTitleError(false);
    updateXpReadout(false);
    openModal(questModal, qTitle, returnEl);
  }

  qPriority.addEventListener('change', () => updateXpReadout(true));
  qTitle.addEventListener('input', () => {
    if (qTitle.value.trim()) showTitleError(false);
  });

  questForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = qTitle.value.trim();
    if (!title) {
      showTitleError(true);
      qTitle.focus();
      return;
    }

    const data = {
      title,
      desc: qDesc.value.trim(),
      cat: CATEGORY_LABEL[qCat.value] ? qCat.value : 'work',
      priority: XP_BY_PRIORITY[qPriority.value] ? qPriority.value : 'medium',
      due: qDue.value
    };

    const wasEditing = !!editing;
    let q = editing;
    if (q) {
      Object.assign(q, data);
    } else {
      q = { id: 'q' + nextId++, status: 'todo', earned: null, completed: null, added: Date.now(), rank: 0, ...data };
      quests.push(q);
      moveToColumnTop(q, 'todo');
    }
    editing = null;
    closeModal({ restoreFocus: false });

    // Siguraduhing kita yung kaka-save na quest kahit may search o filter.
    if (!matches(q)) {
      state.filter = 'all';
      state.query = '';
      syncControls();
    }
    render({ highlight: q.id });
    focusCard(q.id, wasEditing ? 'kebab' : 'action');
    announce(wasEditing ? `Saved "${q.title}".` : `Added "${q.title}" to To do.`);
    checkOverdue({ rerender: false });
  });

  // Delete

  let deleting = null;

  function openDeleteModal(q, returnEl) {
    deleting = q;
    delText.textContent = `"${q.title}" will be removed from your board. ` +
      (q.status === 'done' ? "This can't be undone, and its XP stays earned." : "This can't be undone.");
    openModal(deleteModal, delCancel, returnEl);
  }

  delConfirm.addEventListener('click', () => {
    if (!deleting) return;
    const title = deleting.title;
    quests.splice(quests.indexOf(deleting), 1);
    knownOverdue.delete(deleting.id);
    deleting = null;
    closeModal({ restoreFocus: false });
    render();
    addBtn.focus();
    announce(`Deleted "${title}".`);
  });

  // ---------- toolbar (search, filter chips, Add quest) ----------

  function syncControls() {
    filterChips.forEach(chip => {
      const on = chip.dataset.filter === state.filter;
      chip.classList.toggle('on', on);
      chip.setAttribute('aria-pressed', String(on));
    });
    if (searchInput.value.trim() !== state.query) searchInput.value = state.query;
    searchClear.hidden = !state.query;
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      state.filter = chip.dataset.filter;
      syncControls();
      render();
    });
  });

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value.trim();
    syncControls();
    render();
  });

  searchClear.addEventListener('click', () => {
    state.query = '';
    syncControls();
    render();
    searchInput.focus();
  });

  emptyReset.addEventListener('click', () => {
    state.query = '';
    state.filter = 'all';
    syncControls();
    render();
    searchInput.focus();
  });

  addBtn.addEventListener('click', () => openQuestModal(null, addBtn));
  emptyAdd.addEventListener('click', () => openQuestModal(null, emptyAdd));

  // ---------- start (unang takbo pagbukas ng page) ----------

  paintLevel();
  syncControls();
  syncSort();
  render({ animate: false });
  nudge(quests.filter(isOverdue));
})();
