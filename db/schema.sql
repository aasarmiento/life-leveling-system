-- Questify database schema (SQLite)
-- Runs every time the server starts. "IF NOT EXISTS" keeps existing data safe.
-- Times are milliseconds (like Date.now() in the frontend); due dates are 'YYYY-MM-DD'.

-- Player accounts. Only the salt + hash of the password are stored, never the password.
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  avatar      TEXT    NOT NULL DEFAULT 'lime' CHECK (avatar IN ('lime', 'gold')),
  salt        TEXT    NOT NULL,
  hash        TEXT    NOT NULL,
  created_at  INTEGER NOT NULL
);

-- Signed-in sessions: one row per token. Signing out deletes the row.
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

-- One row per quest. Quest ids ("q12") repeat between players, so the key is (user_id, id).
-- "description" and "position" are the frontend's desc and rank (desc is an SQL keyword).
CREATE TABLE IF NOT EXISTS quests (
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  id          TEXT    NOT NULL,
  title       TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 60),
  description TEXT    NOT NULL DEFAULT '' CHECK (length(description) <= 300),
  cat         TEXT    NOT NULL CHECK (cat IN ('work', 'growth', 'health')),
  priority    TEXT    NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status      TEXT    NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
  due         TEXT    NOT NULL,
  added       INTEGER NOT NULL,
  position    INTEGER NOT NULL,
  earned      INTEGER,
  completed   INTEGER,
  PRIMARY KEY (user_id, id),
  -- a finished quest must know its XP and when it was done
  CHECK (status <> 'done' OR (earned IS NOT NULL AND completed IS NOT NULL))
);

-- Board settings: exactly one row per player. updated_at decides which save is newer.
CREATE TABLE IF NOT EXISTS boards (
  user_id     INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  next_id     INTEGER NOT NULL DEFAULT 1,
  sort        TEXT    NOT NULL DEFAULT 'due' CHECK (sort IN ('due', 'added', 'priority', 'xp', 'manual')),
  dir         TEXT    NOT NULL DEFAULT 'asc' CHECK (dir IN ('asc', 'desc')),
  updated_at  INTEGER NOT NULL
);

-- XP history, in order. Total XP = SUM(xp). quest_id is NULL for the starting XP and for Undo.
CREATE TABLE IF NOT EXISTS xp_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  quest_id    TEXT,
  xp          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS xp_log_user ON xp_log (user_id);

-- Home page feedback. Visitors can send it too, so it isn't linked to a user.
CREATE TABLE IF NOT EXISTS feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ref         TEXT    NOT NULL UNIQUE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags        TEXT    NOT NULL DEFAULT '[]',
  message     TEXT    NOT NULL DEFAULT '' CHECK (length(message) <= 500),
  created_at  INTEGER NOT NULL
);
