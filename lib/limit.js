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
  return entry && entry.count >= MAX_TRIES ? Math.ceil((entry.resetAt - now) / 60000) : 0;
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

module.exports = { minutesLocked, recordFail, clearFails, lockedMessage, MAX_TRIES, LOCK_MS };
