const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

//Absolute path to the root /data directory
const DATA_DIR = path.join(__dirname, "../data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");
const ALLOWED_TAGS = ["Quest board", "XP and levels", "Design", "Music", "Easy to use"];

function readFeedback() {
  try {
    return JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf8"));
  } catch (err) {
    return [];
  }
}

function writeFeedback(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(list, null, 2));
}

// POST /api/feedback
router.post("/", (req, res) => {
  const { ref, rating, tags, message } = req.body || {};
  const stars = Number(rating);

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "Rating must be a whole number from 1 to 5." });
  }

  const text = typeof message === "string" ? message.trim() : "";
  if (text.length > 500) {
    return res.status(400).json({ error: "Message must be 500 characters or less." });
  }

  const cleanTags = Array.isArray(tags)
    ? tags.filter((t) => ALLOWED_TAGS.includes(t))
    : [];

  const entry = {
    ref: typeof ref === "string" ? ref.slice(0, 30) : null,
    rating: stars,
    tags: cleanTags,
    message: text,
    receivedAt: new Date().toISOString(),
  };

  const all = readFeedback();
  all.unshift(entry);
  writeFeedback(all);
  res.status(201).json(entry);
});

// GET /api/feedback
router.get("/", (req, res) => {
  res.json(readFeedback());
});

module.exports = router;