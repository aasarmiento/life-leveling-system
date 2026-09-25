// Shared header: the Level pill on Dashboard / Profile / About, and which
// header About shows (visitor or signed in). Loaded in <head>, before the
// page paints, so About never flashes the wrong header.
(function () {
  const BOARD_KEY = 'questify.board.v1'; // saved by the Quest Board (tasks.js)
  const SIGNED_IN_KEY = 'questify.signedIn';
  const STARTING_XP = 1450; // same numbers as tasks.js
  const XP_PER_LEVEL = 125;

  // Storage can be blocked (private mode); then nothing is remembered.
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
      // nothing to do
    }
  }

  if (read(SIGNED_IN_KEY) === '1') document.documentElement.classList.add('is-member');

  function savedXp() {
    try {
      const total = JSON.parse(read(BOARD_KEY)).xp.reduce((sum, entry) => sum + entry.xp, 0);
      return Number.isFinite(total) ? total : STARTING_XP;
    } catch (err) {
      return STARTING_XP;
    }
  }

  // XP only changes on the Tasks page; here the pill just shows it.
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

  // Sign in / Create account: opening the page signs you out,
  // submitting the form signs you in.
  function watchAuthForm() {
    const form = document.querySelector('form.auth-card');
    if (!form) return;
    write(SIGNED_IN_KEY, null);
    form.addEventListener('submit', () => write(SIGNED_IN_KEY, '1'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    paintPill();
    watchAuthForm();
  });
})();
