// Accounts and sign in on the server (Checkpoint 2).
//   POST /api/signup   create an account, then sign in      → 201 { token, player }
//   POST /api/signin   check email + password               → 200 { token, player }
//                      (5 wrong tries for one email → 429 for 15 minutes)
//   GET  /api/me       who is signed in (needs the token)   → 200 { player }
//   PUT  /api/me       Settings: change name, avatar and/or password (needs the token)
//                      → 200 { player, passwordChanged }
//   POST /api/signout  end this sign in                     → 200 { ok: true }
// Errors always come back as { error, field }, so the page can show the
// message under the right box.
// Accounts are saved in data/users.json (Checkpoint 6).
const express = require("express");
const { data, save } = require("../lib/store");
const { newSalt, hashPassword, checkPassword } = require("../lib/passwords");
const {
  createSession,
  deleteSession,
  deleteOtherSessions,
  tokenFrom,
  requireAuth,
} = require("../lib/sessions");
const {
  checkSignup,
  checkSignin,
  checkSettings,
} = require("../lib/validate");
const {
  minutesLocked,
  recordFail,
  clearFails,
  lockedMessage,
  signupWait,
  recordSignup,
  signupMessage,
} = require("../lib/limit");

const router = express.Router();

// Only these fields ever go back to the page (never the salt or hash)
const publicPlayer = (u) => ({
  name: u.name,
  email: u.email,
  avatar: u.avatar,
});

// Used when the email doesn't exist, so a wrong email takes as long as a
// wrong password (the page can't use the timing to guess which emails exist)
const DUMMY_SALT = newSalt();
const DUMMY_HASH = hashPassword("not-a-real-password", DUMMY_SALT);

// Emails are saved in lowercase, so Alex@Gmail.com and alex@gmail.com are the same account
const findUser = (email) =>
  data.users.find((u) => String(u.email).toLowerCase() === email) || null;

router.post("/signup", (req, res) => {
  const check = checkSignup(req.body);
  if (check.error) return res.status(400).json(check);
  const { name, email, password, avatar } = check.value;

  // One email = one account. The check and the save run in one go, so two
  // sign ups with the same email at the same moment can't both get through.
  if (findUser(email)) {
    return res.status(409).json({
      error: "An account with this email already exists.",
      field: "email",
    });
  }

  // Making accounts is slow on purpose (scrypt), so one connection can only make a few
  const wait = signupWait(req.ip);
  if (wait)
    return res.status(429).json({ error: signupMessage(wait), field: null });

  const salt = newSalt();
  const userId = Math.max(0, ...data.users.map((u) => u.id)) + 1;
  data.users.push({
    id: userId,
    email,
    name,
    avatar,
    salt,
    hash: hashPassword(password, salt),
    createdAt: Date.now(),
  });
  save("users");
  recordSignup(req.ip);

  res.status(201).json({
    token: createSession(userId),
    player: { name, email, avatar },
  });
});

router.post("/signin", (req, res) => {
  const check = checkSignin(req.body);
  if (check.error) return res.status(400).json(check);
  const { email, password } = check.value;

  // 5 wrong tries for this email: blocked for 15 minutes (even with the right password)
  const locked = minutesLocked(email);
  if (locked)
    return res.status(429).json({ error: lockedMessage(locked), field: null });

  const user = findUser(email);
  let ok = false;
  if (user) ok = checkPassword(password, user.salt, user.hash);
  else checkPassword(password, DUMMY_SALT, DUMMY_HASH); // same work as a real check, then fail
  if (!ok) {
    recordFail(email); // unknown emails count too, so they look the same as real ones
    const nowLocked = minutesLocked(email);
    if (nowLocked)
      return res
        .status(429)
        .json({ error: lockedMessage(nowLocked), field: null });
    // Same message for a wrong email and a wrong password, on purpose
    return res
      .status(401)
      .json({ error: "Email or password is incorrect.", field: null });
  }

  clearFails(email);
  res.json({ token: createSession(user.id), player: publicPlayer(user) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ player: publicPlayer(req.user) });
});

// Settings: change the display name, the avatar and/or the password.
// Changing the password needs the current one. It uses the same wrong-try
// limit as sign in, so Settings can't be used to guess a password. After a
// password change every other device is signed out; this one stays signed in.
router.put("/me", requireAuth, (req, res) => {
  const check = checkSettings(req.body);
  if (check.error) return res.status(400).json(check);
  const { name, avatar, currentPassword, newPassword } = check.value;

  const user = data.users.find((u) => u.id === req.user.id);
  if (!user)
    return res
      .status(401)
      .json({ error: "Your session ended. Please sign in again." });

  if (newPassword !== undefined) {
    const locked = minutesLocked(user.email);
    if (locked)
      return res
        .status(429)
        .json({ error: lockedMessage(locked), field: "currentPassword" });
    if (!checkPassword(currentPassword, user.salt, user.hash)) {
      recordFail(user.email);
      const nowLocked = minutesLocked(user.email);
      return res.status(nowLocked ? 429 : 400).json({
        error: nowLocked
          ? lockedMessage(nowLocked)
          : "Your current password is incorrect.",
        field: "currentPassword",
      });
    }
    clearFails(user.email);
    if (newPassword === currentPassword)
      return res.status(400).json({
        error: "Choose a password that is different from the current one.",
        field: "newPassword",
      });
  }

  // The checks are done: change everything at once, then save once
  if (name !== undefined) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  if (newPassword !== undefined) {
    user.salt = newSalt();
    user.hash = hashPassword(newPassword, user.salt);
  }
  save("users");
  if (newPassword !== undefined) deleteOtherSessions(user.id, req.token);

  res.json({ player: publicPlayer(user), passwordChanged: newPassword !== undefined });
});

// Signing out always succeeds, even if the token was already gone
router.post("/signout", (req, res) => {
  const token = tokenFrom(req);
  if (token) deleteSession(token);
  res.json({ ok: true });
});

module.exports = router;
