// Sign-in sessions. After a correct sign in, the server makes a long random
// token (like a wristband at an event). The page sends it back with every
// request that needs a signed-in player: "Authorization: Bearer <token>".
const crypto = require("crypto");
const { db } = require("../db/db");

const SESSION_MS = 24 * 60 * 60 * 1000; // a sign in lasts 1 day
const TOKEN_RE = /^[a-f0-9]{64}$/;

function createSession(userId) {
  const now = Date.now();
  // Tidy up: old, expired sessions are no longer needed
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(token, userId, now, now + SESSION_MS);
  return token;
}

// The player that owns this token, or null if the token is unknown or expired
function findSessionUser(token) {
  if (!TOKEN_RE.test(String(token))) return null;
  return (
    db
      .prepare(
        `SELECT users.id, users.name, users.email, users.avatar
       FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = ? AND sessions.expires_at > ?`,
      )
      .get(token, Date.now()) || null
  );
}

function deleteSession(token) {
  if (TOKEN_RE.test(String(token)))
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
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
