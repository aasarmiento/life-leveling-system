const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
// Checkpoint 4: feedback is saved in the SQLite database (feedback table)
const { db } = require("../db/db");

const router = express.Router();

//Absolute path to the root /data directory
const DATA_DIR = path.join(__dirname, "../data");
// Before Checkpoint 4 feedback was saved here. It is now only read once, to move it into the database.
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");
const BACKUP_FILE = path.join(DATA_DIR, "feedback-before-database.json");
const ALLOWED_TAGS = [
  "Quest board",
  "XP and levels",
  "Design",
  "Music",
  "Easy to use",
];
// Same letters as the Home page: no look-alikes like 0/O or 1/I
const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LIST_LIMIT = 100; // GET shows the newest 100
const PER_MINUTE = 10; // max feedback from one visitor per minute

const insertFeedback = db.prepare(
  "INSERT INTO feedback (ref, rating, tags, message, created_at) VALUES (?, ?, ?, ?, ?)",
);
const newestFeedback = db.prepare(
  "SELECT ref, rating, tags, message, created_at FROM feedback ORDER BY id DESC LIMIT ?",
);

// FB-YYMMDD-XXXX: the date + 4 random letters/numbers
function makeRef(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const tail = [...crypto.randomBytes(4)]
    .map((b) => REF_CHARS[b % REF_CHARS.length])
    .join("");
  return `FB-${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${tail}`;
}

// Same shape Sire's API always answered with
const toEntry = (row) => ({
  ref: row.ref,
  rating: row.rating,
  tags: JSON.parse(row.tags),
  message: row.message,
  receivedAt: new Date(row.created_at).toISOString(),
});

// Save one feedback with a new reference number (tries again in the rare case the number is taken)
function saveFeedback(rating, tags, message, createdAt) {
  for (let i = 0; i < 5; i++) {
    const ref = makeRef(new Date(createdAt));
    try {
      insertFeedback.run(ref, rating, JSON.stringify(tags), message, createdAt);
      return ref;
    } catch (err) {
      if (!String(err.message).includes("UNIQUE")) throw err;
    }
  }
  throw new Error("Could not make a unique feedback reference.");
}

// One time only: move the feedback from data/feedback.json into the database,
// then rename the file so it's kept as a backup and never moved twice.
(function moveOldFeedback() {
  if (!fs.existsSync(FEEDBACK_FILE)) return;
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf8"));
  } catch (err) {
    list = [];
  }
  db.exec("BEGIN");
  try {
    // Oldest first (by the date received), so the newest stays on top and,
    // if two old feedback share a number, the one received first keeps it
    const when = (f) => Date.parse(f && f.receivedAt) || Date.now();
    const oldestFirst = (Array.isArray(list) ? list : [])
      .slice()
      .sort((a, b) => when(a) - when(b));
    for (const f of oldestFirst) {
      const stars = Number(f && f.rating);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) continue;
      const tags = Array.isArray(f.tags)
        ? f.tags.filter((t) => ALLOWED_TAGS.includes(t))
        : [];
      const text =
        typeof f.message === "string" ? f.message.trim().slice(0, 500) : "";
      const at = when(f);
      const ref =
        typeof f.ref === "string" && /^FB-\d{6}-[A-Z0-9]{4}$/.test(f.ref)
          ? f.ref
          : null;
      try {
        if (ref) insertFeedback.run(ref, stars, JSON.stringify(tags), text, at);
        else saveFeedback(stars, tags, text, at);
      } catch (err) {
        if (!String(err.message).includes("UNIQUE")) throw err;
        saveFeedback(stars, tags, text, at); // same number twice: the later one gets a new number
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  fs.renameSync(FEEDBACK_FILE, BACKUP_FILE);
  console.log(
    `Moved ${list.length} feedback from data/feedback.json into the database`,
  );
})();

// Spam limit: at most 10 feedback per minute from one visitor (kept in memory)
const recent = new Map(); // visitor → times of their last feedback
function tooMany(visitor, now = Date.now()) {
  const times = (recent.get(visitor) || []).filter((t) => now - t < 60000);
  if (recent.size > 1000)
    for (const [k, v] of recent)
      if (!v.some((t) => now - t < 60000)) recent.delete(k);
  if (times.length >= PER_MINUTE) {
    recent.set(visitor, times);
    return true;
  }
  times.push(now);
  recent.set(visitor, times);
  return false;
}

// POST /api/feedback
router.post("/", (req, res) => {
  const { rating, tags, message } = req.body || {};
  const stars = Number(rating);

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res
      .status(400)
      .json({ error: "Rating must be a whole number from 1 to 5." });
  }

  const text = typeof message === "string" ? message.trim() : "";
  if (text.length > 500) {
    return res
      .status(400)
      .json({ error: "Message must be 500 characters or less." });
  }

  const cleanTags = Array.isArray(tags)
    ? [...new Set(tags.filter((t) => ALLOWED_TAGS.includes(t)))]
    : [];

  if (tooMany(req.ip)) {
    return res
      .status(429)
      .json({
        error:
          "You've sent a lot of feedback. Please wait a minute and try again.",
      });
  }

  // The server makes the reference number (the page's own number is ignored)
  const now = Date.now();
  const ref = saveFeedback(stars, cleanTags, text, now);
  res
    .status(201)
    .json(
      toEntry({
        ref,
        rating: stars,
        tags: JSON.stringify(cleanTags),
        message: text,
        created_at: now,
      }),
    );
});

// GET /api/feedback (public: feedback has no names or emails): the newest 100
router.get("/", (req, res) => {
  res.json(newestFeedback.all(LIST_LIMIT).map(toEntry));
});

module.exports = router;
