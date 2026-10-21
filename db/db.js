// Opens the Questify SQLite database (data/questify.db), creates the tables
// from schema.sql, and adds the demo account the first time.
// Uses Node's built-in SQLite (node:sqlite, Node 22 or newer): nothing to install.
const fs = require("fs");
const path = require("path");
const { newSalt, hashPassword } = require("../lib/passwords");

// Stop the server with one clear line instead of a long error.
function stop(message) {
  console.error(`\nQuestify can't start: ${message}\n`);
  process.exit(1);
}

let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  stop(`the database needs Node.js 22.13 or newer (you have ${process.version}). Update Node from nodejs.org.`);
}

const DATA_DIR = path.join(__dirname, "../data");
// Tests can point to their own database file with QUESTIFY_DB.
const DB_FILE = process.env.QUESTIFY_DB || path.join(DATA_DIR, "questify.db");
const SHOWN = path.relative(process.cwd(), DB_FILE) || DB_FILE;

let schema;
try {
  schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
} catch {
  stop("db/schema.sql is missing. Pull the project again.");
}

let db;
try {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  db = new DatabaseSync(DB_FILE);
  // Foreign keys are off by default in SQLite, and must be turned on for every connection.
  db.exec("PRAGMA foreign_keys = ON;");
  // Wait up to 3 s instead of failing if another program (e.g. a DB viewer) is writing.
  db.exec("PRAGMA busy_timeout = 3000;");
  db.exec(schema);
} catch (err) {
  stop(`${SHOWN} can't be opened (${err.message}). If it is damaged, move it out of the data folder (keep it as a backup) and start again: a new one is made with the demo account.`);
}

// Demo account for the mentor and testers (same as the Sign in page shows).
const DEMO = { email: "alex@gmail.com", password: "12345678", name: "Alex Rivera", avatar: "lime" };

const demoExists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(DEMO.email);
if (!demoExists) {
  const salt = newSalt();
  db.prepare(
    "INSERT INTO users (email, name, avatar, salt, hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(DEMO.email, DEMO.name, DEMO.avatar, salt, hashPassword(DEMO.password, salt), Date.now());
}

console.log(`Database ready: ${SHOWN}`);

module.exports = { db, DEMO };
