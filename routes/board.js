// The Quest Board on the server (Checkpoint 3). Every route needs a signed-in player.
//   GET /api/board   → 200 { board, version }   (board is null before the first save)
//   PUT /api/board   { board, base, force? } → 200 { version }
//                    → 409 { error, board, version } if another device saved first
// "version" is the time of the last save. The page sends back the version it
// started from (base); if the server has a newer one, the save is refused so
// one device can't silently erase what another device just saved.
// Boards are saved in data/boards.json, in the same shape the Tasks page uses (Checkpoint 6).
const express = require("express");
const { data, save } = require("../lib/store");
const { requireAuth } = require("../lib/sessions");
const { checkBoard } = require("../lib/validate");

const router = express.Router();
router.use(requireAuth);

// One player's board, or null before their first save
function readBoard(userId) {
  const saved = Object.hasOwn(data.boards, userId) ? data.boards[userId] : null;
  if (!saved) return { board: null, version: null };
  return { board: saved.board, version: saved.version };
}

router.get("/", (req, res) => {
  res.json(readBoard(req.user.id));
});

router.put("/", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const check = checkBoard(body.board);
  if (check.error) return res.status(400).json({ error: check.error });
  const base = body.base === undefined ? null : body.base;
  if (base !== null && !Number.isInteger(base))
    return res.status(400).json({ error: "The board version is not valid." });
  const userId = req.user.id;

  // The check and the save run in one go, so two devices saving at the same
  // moment can't both get through: the second one gets the 409.
  const current = readBoard(userId).version;
  if (current !== base && body.force !== true) {
    return res.status(409).json({
      error: "Your board changed on another device.",
      ...readBoard(userId),
    });
  }
  // Always newer than the last version, even if two saves land in the same millisecond
  const version = Math.max(Date.now(), (current || 0) + 1);
  // The whole board is replaced at once (never half a board)
  data.boards[userId] = { version, board: check.value };
  save("boards");
  res.json({ version });
});

module.exports = router;
