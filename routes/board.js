// The Quest Board on the server (Checkpoint 3). Every route needs a signed-in player.
//   GET /api/board   → 200 { board, version }   (board is null before the first save)
//   PUT /api/board   { board, base, force? } → 200 { version }
//                    → 409 { error, board, version } if another device saved first
// "version" is the time of the last save. The page sends back the version it
// started from (base); if the server has a newer one, the save is refused so
// one device can't silently erase what another device just saved.
const express = require("express");
const { db } = require("../db/db");
const { requireAuth } = require("../lib/sessions");
const { checkBoard } = require("../lib/validate");

const router = express.Router();
router.use(requireAuth);

const getBoardRow = db.prepare("SELECT next_id, sort, dir, updated_at FROM boards WHERE user_id = ?");
const getQuests = db.prepare(
  `SELECT id, title, description, cat, priority, status, due, added, position, earned, completed
     FROM quests WHERE user_id = ? ORDER BY rowid`,
);
const getXp = db.prepare("SELECT quest_id, xp FROM xp_log WHERE user_id = ? ORDER BY id");
const deleteQuests = db.prepare("DELETE FROM quests WHERE user_id = ?");
const deleteXp = db.prepare("DELETE FROM xp_log WHERE user_id = ?");
const insertQuest = db.prepare(
  `INSERT INTO quests (user_id, id, title, description, cat, priority, status, due, added, position, earned, completed)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertXp = db.prepare("INSERT INTO xp_log (user_id, quest_id, xp) VALUES (?, ?, ?)");
const saveBoardRow = db.prepare(
  `INSERT INTO boards (user_id, next_id, sort, dir, updated_at) VALUES (?, ?, ?, ?, ?)
   ON CONFLICT (user_id) DO UPDATE SET next_id = excluded.next_id, sort = excluded.sort,
     dir = excluded.dir, updated_at = excluded.updated_at`,
);

// Read one player's board in the same shape the Tasks page uses
// (description → desc, position → rank)
function readBoard(userId) {
  const row = getBoardRow.get(userId);
  if (!row) return { board: null, version: null };
  const quests = getQuests.all(userId).map((q) => ({
    id: q.id, title: q.title, desc: q.description, cat: q.cat, priority: q.priority, status: q.status,
    due: q.due, added: q.added, rank: q.position, earned: q.earned, completed: q.completed,
  }));
  const xp = getXp.all(userId).map((e) => ({ id: e.quest_id, xp: e.xp }));
  return { board: { quests, xp, nextId: row.next_id, sort: row.sort, dir: row.dir }, version: row.updated_at };
}

router.get("/", (req, res) => {
  res.json(readBoard(req.user.id));
});

router.put("/", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const check = checkBoard(body.board);
  if (check.error) return res.status(400).json({ error: check.error });
  const base = body.base === undefined ? null : body.base;
  if (base !== null && !Number.isInteger(base)) return res.status(400).json({ error: "The board version is not valid." });
  const { quests, xp, nextId, sort, dir } = check.value;
  const userId = req.user.id;

  // One transaction: the whole board is saved, or nothing is (never half a board)
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = getBoardRow.get(userId);
    const current = row ? row.updated_at : null;
    if (current !== base && body.force !== true) {
      db.exec("ROLLBACK");
      return res.status(409).json({ error: "Your board changed on another device.", ...readBoard(userId) });
    }
    deleteQuests.run(userId);
    for (const q of quests) {
      insertQuest.run(userId, q.id, q.title, q.desc, q.cat, q.priority, q.status, q.due, q.added, q.rank, q.earned, q.completed);
    }
    deleteXp.run(userId);
    for (const e of xp) insertXp.run(userId, e.id, e.xp);
    // Always newer than the last version, even if two saves land in the same millisecond
    const version = Math.max(Date.now(), (current || 0) + 1);
    saveBoardRow.run(userId, nextId, sort, dir, version);
    db.exec("COMMIT");
    res.json({ version });
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
});

module.exports = router;
