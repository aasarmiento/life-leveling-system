// Sign-in sessions. After a correct sign in, the server makes a long random
// token (like a wristband at an event). The page sends it back with every
// request that needs a signed-in player: "Authorization: Bearer <token>".
// Sessions are saved in data/sessions.json (token → player id + end time).
const crypto = require("crypto");
const { data, save } = require("./store");

const SESSION_MS = 24 * 60 * 60 * 1000; // a sign in lasts 1 day
const TOKEN_RE = /^[a-f0-9]{64}$/;

function createSession(userId) {
  const now = Date.now();
  // Tidy up: old, expired sessions are no longer needed
  for (const [token, s] of Object.entries(data.sessions))
    if (s.expiresAt <= now) delete data.sessions[token];
  const token = crypto.randomBytes(32).toString("hex");
  data.sessions[token] = {
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
  const s = Object.hasOwn(data.sessions, token) ? data.sessions[token] : null;
  if (!s || s.expiresAt <= Date.now()) return null;
  const u = data.users.find((user) => user.id === s.userId);
  return u
    ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar }
    : null;
}

function deleteSession(token) {
  if (TOKEN_RE.test(String(token)) && Object.hasOwn(data.sessions, token)) {
    delete data.sessions[token];
    save("sessions");
  }
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
  tokenFrom,
  requireAuth,
  SESSION_MS,
};
