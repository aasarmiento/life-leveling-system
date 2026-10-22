const express = require("express");
const crypto = require("crypto");
// Feedback is saved in data/feedback.json, newest first (Checkpoint 6: back to
// the JSON file from Milestone 1, with a reference number made by the server)
const { data, save } = require("../lib/store");

const router = express.Router();

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

// FB-YYMMDD-XXXX: the date + 4 random letters/numbers
function makeRef(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const tail = [...crypto.randomBytes(4)]
    .map((b) => REF_CHARS[b % REF_CHARS.length])
    .join("");
  return `FB-${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${tail}`;
}

// A reference number no other feedback has (tries again in the rare case it's taken)
function newRef(date) {
  const taken = new Set(data.feedback.map((f) => f && f.ref));
  for (let i = 0; i < 5; i++) {
    const ref = makeRef(date);
    if (!taken.has(ref)) return ref;
  }
  throw new Error("Could not make a unique feedback reference.");
}

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
    return res.status(429).json({
      error:
        "You've sent a lot of feedback. Please wait a minute and try again.",
    });
  }

  // The server makes the reference number (the page's own number is ignored)
  const now = new Date();
  const entry = {
    ref: newRef(now),
    rating: stars,
    tags: cleanTags,
    message: text,
    receivedAt: now.toISOString(),
  };
  data.feedback.unshift(entry);
  save("feedback");
  res.status(201).json(entry);
});

// GET /api/feedback (public: feedback has no names or emails): the newest 100
router.get("/", (req, res) => {
  res.json(data.feedback.slice(0, LIST_LIMIT));
});

module.exports = router;
