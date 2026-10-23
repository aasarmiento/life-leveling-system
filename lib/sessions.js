// Sign-in sessions. After a correct sign in, the server makes a long random
// token (like a wristband at an event). The page sends it back with every
// request that needs a signed-in player: "Authorization: Bearer <token>".
// Sessions are saved in data/sessions.json (token hash → player id + end time).
//
// Only a SHA-256 hash of the token is saved, never the token itself. The
// token is already long and random, so a fast hash is enough: if someone reads
// data/sessions.json, they can't use what they find to sign in as a player.
const crypto = require("crypto");
const { data, save } = require("./store");

const SESSION_MS = 24 * 60 * 60 * 1000; // a sign in lasts 1 day
const TOKEN_RE = /^[a-f0-9]{64}$/;
const FORMAT = 2; // sessions saved with a hashed token (older ones kept the token itself)

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// Sessions from before this change were saved with the real token. Remove them
// now (those players sign in again), so no real token stays in the file.
{
  let removed = false;
  for (const [key, s] of Object.entries(data.sessions))
    if (!s || s.v !== FORMAT) {
      delete data.sessions[key];
      removed = true;
    }
  if (removed) save("sessions");
}

function createSession(userId) {
  const now = Date.now();
  // Tidy up: old, expired sessions are no longer needed
  for (const [key, s] of Object.entries(data.sessions))
    if (s.expiresAt <= now) delete data.sessions[key];
  const token = crypto.randomBytes(32).toString("hex");
  data.sessions[hashToken(token)] = {
    v: FORMAT,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_MS,
  };
  save("sessions");
  return token;
}

// The player that owns this token, or null if the token is unknown or expired
function findSessionUser(token) {
  if (!TOKEN_RE.test(String(token))) return null;
  const key = hashToken(token);
  const s = Object.hasOwn(data.sessions, key) ? data.sessions[key] : null;
  if (!s || s.expiresAt <= Date.now()) return null;
  const u = data.users.find((user) => user.id === s.userId);
  return u
    ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar }
    : null;
}

function deleteSession(token) {
  if (!TOKEN_RE.test(String(token))) return;
  const key = hashToken(token);
  if (Object.hasOwn(data.sessions, key)) {
    delete data.sessions[key];
    save("sessions");
  }
}

// Sign this player out everywhere except on the device that is changing the
// password (used after a password change, so a stolen sign in stops working).
function deleteOtherSessions(userId, keepToken) {
  const keep = TOKEN_RE.test(String(keepToken)) ? hashToken(keepToken) : null;
  let removed = 0;
  for (const [key, s] of Object.entries(data.sessions))
    if (s.userId === userId && key !== keep) {
      delete data.sessions[key];
      removed++;
    }
  if (removed) save("sessions");
  return removed;
}

function tokenFrom(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.get("Authorization") || "");
  return m ? m[1] : null;
}

// Put this in front of any route that needs a signed-in player.
// It sets req.user (id, name, email, avatar), or answers 401.
function requireAuth(req, res, next) {
  const token = tokenFrom(req);
  const user = token && findSessionUser(token);
  if (!user)
    return res
      .status(401)
      .json({ error: "Your session ended. Please sign in again." });
  req.user = user;
  req.token = token;
  next();
}

module.exports = {
  createSession,
  findSessionUser,
  deleteSession,
  deleteOtherSessions,
  tokenFrom,
  requireAuth,
  SESSION_MS,
};
