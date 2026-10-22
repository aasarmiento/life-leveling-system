// Checks for data sent by the pages, before anything is saved.
// Each check returns { value } when the data is fine, or { error, field } when it isn't.
// The messages match the ones the Sign in / Create account pages already show.

// name@site.com: an @, a dot in the domain, and 2+ letters at the end (same rule as nav.js)
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200; // stops someone from sending a huge "password"
const NAME_MAX = 40;
const AVATARS = ["lime", "gold"];

const text = (v) => (typeof v === "string" ? v.trim() : "");

function checkEmail(raw) {
  const email = text(raw).toLowerCase();
  if (!email) return { error: "Enter your email address.", field: "email" };
  if (email.length > 254 || !EMAIL_RE.test(email))
    return {
      error: "Enter a full email address, like name@example.com.",
      field: "email",
    };
  return { value: email };
}

function checkSignup(body) {
  const b = body && typeof body === "object" ? body : {};
  const name = text(b.name);
  if (!name) return { error: "Enter a display name.", field: "name" };
  if (name.length > NAME_MAX)
    return { error: `Use ${NAME_MAX} characters or fewer.`, field: "name" };
  const email = checkEmail(b.email);
  if (email.error) return email;
  const password = typeof b.password === "string" ? b.password : "";
  if (password.length < PASSWORD_MIN)
    return { error: "Use at least 8 characters.", field: "password" };
  if (password.length > PASSWORD_MAX)
    return {
      error: `Use ${PASSWORD_MAX} characters or fewer.`,
      field: "password",
    };
  const avatar = AVATARS.includes(b.avatar) ? b.avatar : "lime";
  return { value: { name, email: email.value, password, avatar } };
}

function checkSignin(body) {
  const b = body && typeof body === "object" ? body : {};
  const email = checkEmail(b.email);
  if (email.error) return email;
  const password = typeof b.password === "string" ? b.password : "";
  if (!password) return { error: "Enter your password.", field: "password" };
  return {
    value: {
      email: email.value,
      password: password.slice(0, PASSWORD_MAX + 1),
    },
  };
}

// ---------- Quest Board (Checkpoint 3) ----------
// The same rules as the Tasks page, so a bad board is refused here with a
// clear message and never saved in data/boards.json.
const MAX_QUESTS = 500;
const MAX_XP_ENTRIES = 10000;
const STATUSES = ["todo", "doing", "done"];
const CATS = ["work", "growth", "health"];
const PRIORITIES = ["low", "medium", "high"];
const SORTS = ["due", "added", "priority", "xp", "manual"];
const QUEST_ID_RE = /^q\d{1,9}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v) && Math.abs(v) <= 1e15;
const realDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
};

// Returns { value } (a clean copy with only the known fields) or { error }
function checkBoard(body) {
  const b =
    body && typeof body === "object" && !Array.isArray(body) ? body : null;
  if (!b || !Array.isArray(b.quests) || !Array.isArray(b.xp))
    return { error: "The board is missing its quests or XP." };
  if (b.quests.length > MAX_QUESTS)
    return { error: `A board can have up to ${MAX_QUESTS} quests.` };
  if (b.xp.length > MAX_XP_ENTRIES)
    return { error: "The XP history is too long." };

  const seen = new Set();
  const quests = [];
  for (const q of b.quests) {
    const bad = (why) => ({
      error: `Quest ${q && typeof q.id === "string" ? q.id : "?"}: ${why}`,
    });
    if (!q || typeof q !== "object") return { error: "A quest is not valid." };
    if (typeof q.id !== "string" || !QUEST_ID_RE.test(q.id))
      return bad("the id is not valid.");
    if (seen.has(q.id)) return bad("the id is used twice.");
    seen.add(q.id);
    if (typeof q.title !== "string" || !q.title.trim() || q.title.length > 60)
      return bad("the title must be 1 to 60 characters.");
    if (typeof q.desc !== "string" || q.desc.length > 300)
      return bad("the description must be 300 characters or fewer.");
    if (!CATS.includes(q.cat)) return bad("the category is not valid.");
    if (!PRIORITIES.includes(q.priority))
      return bad("the priority is not valid.");
    if (!STATUSES.includes(q.status)) return bad("the status is not valid.");
    if (
      typeof q.due !== "string" ||
      (q.due && !(DATE_RE.test(q.due) && realDate(q.due)))
    )
      return bad("the due date is not valid.");
    if (!isInt(q.added) || q.added < 0)
      return bad("the added time is not valid.");
    if (!isNum(q.rank)) return bad("the position is not valid.");
    const done = q.status === "done";
    if (done && !(isInt(q.earned) && q.earned >= 0 && q.earned <= 1000))
      return bad("a done quest needs its XP.");
    if (done && !(isInt(q.completed) && q.completed > 0))
      return bad("a done quest needs its finish time.");
    quests.push({
      id: q.id,
      title: q.title,
      desc: q.desc,
      cat: q.cat,
      priority: q.priority,
      status: q.status,
      due: q.due,
      added: q.added,
      rank: q.rank,
      earned: done ? q.earned : null,
      completed: done ? q.completed : null,
    });
  }

  const xp = [];
  for (const e of b.xp) {
    if (!e || typeof e !== "object" || !isInt(e.xp) || Math.abs(e.xp) > 100000)
      return { error: "An XP entry is not valid." };
    if (
      !(
        e.id === null ||
        e.id === undefined ||
        (typeof e.id === "string" && QUEST_ID_RE.test(e.id))
      )
    )
      return { error: "An XP entry is not valid." };
    xp.push({ id: e.id || null, xp: e.xp });
  }

  const highest = Math.max(0, ...quests.map((q) => Number(q.id.slice(1))));
  const nextId =
    isInt(b.nextId) && b.nextId > 0
      ? Math.max(b.nextId, highest + 1)
      : highest + 1;
  const sort = SORTS.includes(b.sort) ? b.sort : "due";
  const dir = b.dir === "desc" ? "desc" : "asc";
  return { value: { quests, xp, nextId, sort, dir } };
}

module.exports = { checkSignup, checkSignin, checkBoard, EMAIL_RE, MAX_QUESTS };
