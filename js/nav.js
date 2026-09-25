// =====================================================================
// SHARED HEADER (nav.js) — GUIDE PARA SA TEAM
// ---------------------------------------------------------------------
// Dalawa lang ginagawa nito:
//   1. Level pill sa Dashboard / Profile / About: binabasa yung XP na
//      sine-save ng Tasks page (tasks.js), para pareho lahat ng page.
//   2. About page: kung hindi pa naka-sign in, Home / About / Sign In lang
//      ang makikita. Pag naka-sign in na, buong header na.
//
// Nilalagay 'to sa <head> (hindi sa baba ng <body>) para tapos na siya bago
// lumabas yung page. Kaya hindi "kumikislap" yung maling header sa About.
//
// Walang totoong login dito (walang backend pa). "Signed in" = may naka-save
// na flag sa localStorage pagka-submit ng Sign in / Create account form.
// =====================================================================
(function () {
  const BOARD_KEY = 'questify.board.v1'; // dito nagsa-save yung Tasks page (tasks.js)
  const SIGNED_IN_KEY = 'questify.signedIn';
  const STARTING_XP = 1450; // dapat pareho sa tasks.js
  const XP_PER_LEVEL = 125;

  // Pwedeng naka-block yung storage (hal. private mode). Kung ganun, walang natatandaan
  // pero hindi rin mag-e-error.
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
      // wala tayong magagawa, okay lang
    }
  }

  // Kung naka-sign in: lagyan ng class na "is-member" yung <html>.
  // Sa CSS, .member-only = lalabas lang pag naka-sign in; .guest-only = pag hindi pa.
  if (read(SIGNED_IN_KEY) === '1') document.documentElement.classList.add('is-member');

  // Total XP = pinagsama-sama lahat ng XP sa ledger. Kung wala pang save, 1,450.
  function savedXp() {
    try {
      const total = JSON.parse(read(BOARD_KEY)).xp.reduce((sum, entry) => sum + entry.xp, 0);
      return Number.isFinite(total) ? total : STARTING_XP;
    } catch (err) {
      return STARTING_XP;
    }
  }

  // Sa Tasks page lang nagbabago yung XP. Dito, pinapakita lang (walang animation).
  function paintPill() {
    const pill = document.getElementById('levelPill');
    if (!pill) return;
    const total = savedXp();
    const level = Math.floor(total / XP_PER_LEVEL) + 1;
    const fill = document.getElementById('levelFill');
    document.getElementById('levelNum').textContent = 'Level ' + level;
    document.getElementById('levelXp').textContent = total.toLocaleString('en-US') + ' XP';
    fill.style.transition = 'none';
    fill.style.width = ((total % XP_PER_LEVEL) / XP_PER_LEVEL) * 100 + '%';
    pill.title = `${XP_PER_LEVEL - (total % XP_PER_LEVEL)} XP to Level ${level + 1}`;
  }

  // Sign in / Create account: pagbukas ng page = sign out,
  // pag-submit ng form = sign in.
  function watchAuthForm() {
    const form = document.querySelector('form.auth-card');
    if (!form) return;
    write(SIGNED_IN_KEY, null);
    form.addEventListener('submit', () => write(SIGNED_IN_KEY, '1'));
  }

  // Hintayin munang ma-load yung HTML bago galawin yung pill at form.
  document.addEventListener('DOMContentLoaded', () => {
    paintPill();
    watchAuthForm();
  });
})();
