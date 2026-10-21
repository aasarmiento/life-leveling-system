// Opens the Questify SQLite database (data/questify.db), creates the tables
// from schema.sql, and adds the demo account the first time.
// Uses Node's built-in SQLite (node:sqlite, Node 22 or newer): nothing to install.
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { newSalt, hashPassword } = require("../lib/passwords");

const DATA_DIR = path.join(__dirname, "../data");
// Tests can point to their own database file with QUESTIFY_DB.
const DB_FILE = process.env.QUESTIFY_DB || path.join(DATA_DIR, "questify.db");

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);

// Foreign keys are off by default in SQLite, and must be turned on for every connection.
db.exec("PRAGMA foreign_keys = ON;");
// Wait up to 3 s instead of failing if another program (e.g. a DB viewer) is writing.
db.exec("PRAGMA busy_timeout = 3000;");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

// Demo account for the mentor and testers (same as the Sign in page shows).
const DEMO = { email: "alex@gmail.com", password: "12345678", name: "Alex Rivera", avatar: "lime" };

const demoExists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(DEMO.email);
if (!demoExists) {
  const salt = newSalt();
  db.prepare(
    "INSERT INTO users (email, name, avatar, salt, hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(DEMO.email, DEMO.name, DEMO.avatar, salt, hashPassword(DEMO.password, salt), Date.now());
}

console.log(`Database ready: ${path.relative(process.cwd(), DB_FILE) || DB_FILE}`);

module.exports = { db, DEMO };
