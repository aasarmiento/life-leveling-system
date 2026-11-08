// Wrong-password limit. After 5 wrong tries for the same email, sign in is
// blocked for 15 minutes, so nobody can keep guessing a password.
// Kept in the server's memory: restarting the server clears it.
const MAX_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;

const tries = new Map(); // email → { count, resetAt }

function current(email, now) {
  const entry = tries.get(email);
  if (entry && now >= entry.resetAt) {
    tries.delete(email);
    return null;
  }
  return entry || null;
}

// Minutes left if this email is blocked, or 0 if it may try
function minutesLocked(email, now = Date.now()) {
  const entry = current(email, now);
  return entry && entry.count >= MAX_TRIES
    ? Math.ceil((entry.resetAt - now) / 60000)
    : 0;
}

// Count one wrong try. The 5th one starts the 15-minute block.
function recordFail(email, now = Date.now()) {
  // Tidy up so the list can't grow forever
  if (tries.size > 1000) for (const key of [...tries.keys()]) current(key, now);
  const entry = current(email, now) || { count: 0, resetAt: now + LOCK_MS };
  entry.count += 1;
  if (entry.count === MAX_TRIES) entry.resetAt = now + LOCK_MS;
  tries.set(email, entry);
}

// A correct sign in starts the count again
function clearFails(email) {
  tries.delete(email);
}

const lockedMessage = (minutes) =>
  `Too many tries. Wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;

// ---------- Sign up limit ----------
// Making an account is the slowest thing the server does (scrypt on purpose),
// so one connection can only make a few accounts every 15 minutes. Tests can
// change the number with QUESTIFY_SIGNUP_MAX. Also kept in memory.
const SIGNUP_MAX = Number(process.env.QUESTIFY_SIGNUP_MAX) || 10;
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

const signups = new Map(); // visitor → times of the accounts they made

const recentSignups = (visitor, now) =>
  (signups.get(visitor) || []).filter((t) => now - t < SIGNUP_WINDOW_MS);

// Minutes to wait if this visitor already made the maximum, or 0 if they may sign up
function signupWait(visitor, now = Date.now()) {
  const times = recentSignups(visitor, now);
  if (times.length < SIGNUP_MAX) return 0;
  return Math.ceil((times[0] + SIGNUP_WINDOW_MS - now) / 60000);
}

// Count one account that was really made
function recordSignup(visitor, now = Date.now()) {
  // Tidy up so the list can't grow forever
  if (signups.size > 1000)
    for (const key of [...signups.keys()])
      if (!recentSignups(key, now).length) signups.delete(key);
  const times = recentSignups(visitor, now);
  times.push(now);
  signups.set(visitor, times);
}

const signupMessage = (minutes) =>
  `Too many accounts were made from this connection. Wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;

module.exports = {
  minutesLocked,
  recordFail,
  clearFails,
  lockedMessage,
  signupWait,
  recordSignup,
  signupMessage,
  MAX_TRIES,
  LOCK_MS,
  SIGNUP_MAX,
};
