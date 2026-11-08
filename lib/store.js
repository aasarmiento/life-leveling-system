// Saves Questify's data as JSON files in the data folder (Checkpoint 6).
// One file per area, so each one is easy to open and read:
//   users.json      accounts (name, email, avatar, salt + hash, never the password)
//   sessions.json   who is signed in (token → player, ends after 1 day)
//   boards.json     each player's Quest Board (player id → { version, board })
//   feedback.json   feedback from the Home page, newest first
// The files are read once when the server starts and kept in memory. Every
// change is written to the file straight away. Each route reads and saves in
// one go (no waiting in between), so two requests can never mix their changes.
const fs = require("fs");
const path = require("path");
const { newSalt, hashPassword } = require("./passwords");

// Tests can use their own folder with QUESTIFY_DATA.
const DATA_DIR = process.env.QUESTIFY_DATA || path.join(__dirname, "../data");
const SHOWN = path.relative(process.cwd(), DATA_DIR) || DATA_DIR;

// What each file holds when it doesn't exist yet
const EMPTY = { users: [], sessions: {}, boards: {}, feedback: [] };

// Stop the server with one clear line instead of a long error.
function stop(message) {
  console.error(`\nQuestify can't start: ${message}\n`);
  process.exit(1);
}

const fileOf = (name) => path.join(DATA_DIR, `${name}.json`);
const shownFile = (name) => path.join(SHOWN, `${name}.json`);

function load(name) {
  let text;
  try {
    text = fs.readFileSync(fileOf(name), "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return structuredClone(EMPTY[name]);
    stop(`${shownFile(name)} can't be read (${err.message}).`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    data = undefined;
  }
  // The file must hold the same kind of data as EMPTY (a list or an object)
  const want = Array.isArray(EMPTY[name]);
  const ok =
    data !== null && typeof data === "object" && Array.isArray(data) === want;
  if (!ok)
    stop(
      `${shownFile(name)} is damaged. Move it out of the data folder (keep it as a backup) and start again: a new one is made.`,
    );
  return data;
}

// Wait a little without blocking forever (used only when Windows has a file busy)
function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Write to a temporary file first, then swap it in. If the server stops in the
// middle of a save, the old file is still whole (never half a file).
function writeFile(name, data) {
  const file = fileOf(name);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  for (let i = 0; ; i++) {
    try {
      fs.renameSync(temp, file);
      return;
    } catch (err) {
      // Windows: an antivirus or a file viewer can hold the file for a moment
      if (i >= 5 || !["EPERM", "EBUSY", "EACCES"].includes(err.code)) throw err;
      pause(20 * (i + 1));
    }
  }
}

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (err) {
  stop(`the ${SHOWN} folder can't be made (${err.message}).`);
}

const data = {};
for (const name of Object.keys(EMPTY)) data[name] = load(name);

// Save one area to its file. If the save fails, go back to what the file
// still has, so the server never shows data that isn't really saved.
function save(name) {
  try {
    writeFile(name, data[name]);
  } catch (err) {
    data[name] = load(name);
    throw err;
  }
}

// Demo account for the mentor and testers (same as the Sign in page shows).
const DEMO = {
  email: "alex@gmail.com",
  password: "12345678",
  name: "Alex Rivera",
  avatar: "lime",
};

// Make the files that don't exist yet, and the demo account the first time
for (const name of Object.keys(EMPTY))
  if (!fs.existsSync(fileOf(name))) save(name);
if (!data.users.some((u) => u.email === DEMO.email)) {
  const salt = newSalt();
  data.users.push({
    id: Math.max(0, ...data.users.map((u) => u.id)) + 1,
    email: DEMO.email,
    name: DEMO.name,
    avatar: DEMO.avatar,
    salt,
    hash: hashPassword(DEMO.password, salt),
    createdAt: Date.now(),
  });
  save("users");
}

console.log(`Data ready: ${SHOWN} (users, sessions, boards, feedback)`);

// Files from the old SQLite version (Checkpoints 2–5) are not used anymore
const old = ["questify.db", "feedback-before-database.json"].filter((f) =>
  fs.existsSync(path.join(DATA_DIR, f)),
);
if (old.length)
  console.log(
    `Not used anymore, you can delete: ${old.map((f) => path.join(SHOWN, f)).join(", ")}`,
  );

module.exports = { data, save, DEMO };
