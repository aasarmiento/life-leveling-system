// The small building blocks in lib/, tested on their own (no server needed).
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

describe("passwords.js", () => {
  const { newSalt, hashPassword, checkPassword } = require("../lib/passwords");

  test("a salt is 32 random hex characters, different every time", () => {
    const a = newSalt();
    assert.match(a, /^[a-f0-9]{32}$/);
    assert.notEqual(a, newSalt());
  });

  test("the right password matches, a wrong one does not", () => {
    const salt = newSalt();
    const hash = hashPassword("my-password", salt);
    assert.equal(checkPassword("my-password", salt, hash), true);
    assert.equal(checkPassword("My-password", salt, hash), false);
    assert.equal(checkPassword("", salt, hash), false);
    assert.equal(checkPassword("my-password", newSalt(), hash), false, "another salt gives another hash");
  });

  test("the same password with the same salt always gives the same hash", () => {
    const salt = newSalt();
    assert.equal(hashPassword("abc12345", salt), hashPassword("abc12345", salt));
  });

  test("a damaged hash never matches (and never throws)", () => {
    const salt = newSalt();
    assert.equal(checkPassword("x", salt, "abcd"), false);
    assert.equal(checkPassword("x", salt, ""), false);
  });
});

describe("limit.js (wrong-try limit)", () => {
  const limit = require("../lib/limit");

  test("blocks on the 5th wrong try and frees after 15 minutes", () => {
    const email = "unit-limit@example.com";
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) limit.recordFail(email, t0);
    assert.equal(limit.minutesLocked(email, t0), 0, "4 wrong tries: not blocked yet");
    limit.recordFail(email, t0);
    assert.equal(limit.minutesLocked(email, t0), 15);
    assert.equal(limit.minutesLocked(email, t0 + 5 * 60_000), 10);
    assert.equal(limit.minutesLocked(email, t0 + 15 * 60_000), 0, "free after 15 minutes");
  });

  test("a correct sign in clears the count", () => {
    const email = "unit-clear@example.com";
    for (let i = 0; i < 4; i++) limit.recordFail(email);
    limit.clearFails(email);
    limit.recordFail(email);
    assert.equal(limit.minutesLocked(email), 0);
  });

  test("the message says how long to wait (singular and plural)", () => {
    assert.match(limit.lockedMessage(1), /1 minute and/);
    assert.match(limit.lockedMessage(7), /7 minutes and/);
  });

  test("the sign up limit counts accounts and frees after 15 minutes", () => {
    const visitor = "unit-signup-visitor";
    const t0 = 5_000_000;
    for (let i = 0; i < limit.SIGNUP_MAX; i++) {
      assert.equal(limit.signupWait(visitor, t0 + i), 0);
      limit.recordSignup(visitor, t0 + i);
    }
    assert.ok(limit.signupWait(visitor, t0 + 1000) > 0, "blocked after the maximum");
    assert.equal(limit.signupWait("someone-else", t0 + 1000), 0, "other visitors are not affected");
    assert.equal(limit.signupWait(visitor, t0 + 15 * 60_000 + limit.SIGNUP_MAX), 0, "free after 15 minutes");
  });
});

describe("validate.js", () => {
  const v = require("../lib/validate");

  test("emails: accepts normal ones and lowercases them", () => {
    for (const ok of ["a@b.co", "first.last@sub.example.com", "x+tag@example.ph"]) {
      const res = v.checkSignin({ email: ok.toUpperCase(), password: "x" });
      assert.equal(res.value.email, ok.toLowerCase(), ok);
    }
  });

  test("emails: refuses the usual mistakes", () => {
    for (const bad of ["", "plain", "a@b", "a@@b.com", "a b@c.com", "@b.com", "a@.com", "a@b..com", "a@b.c", `${"x".repeat(250)}@b.com`])
      assert.ok(v.checkSignin({ email: bad, password: "x" }).error, `"${bad}" should be refused`);
  });

  test("sign in cuts a huge password short instead of hashing all of it", () => {
    const res = v.checkSignin({ email: "a@b.co", password: "x".repeat(5000) });
    assert.equal(res.value.password.length, 201);
  });

  test("anything that is not an object is treated as empty", () => {
    for (const body of [null, undefined, "text", 5, []]) {
      assert.ok(v.checkSignup(body).error);
      assert.ok(v.checkSignin(body).error);
      assert.ok(v.checkSettings(body).error);
    }
  });

  test("settings: each part is optional, but one is needed", () => {
    assert.deepEqual(v.checkSettings({ name: " Ann " }).value, { name: "Ann" });
    assert.deepEqual(v.checkSettings({ avatar: "gold" }).value, { avatar: "gold" });
    assert.ok(v.checkSettings({}).error);
    assert.ok(v.checkSettings({ unrelated: 1 }).error);
  });

  test("settings: the password part needs both passwords", () => {
    assert.equal(v.checkSettings({ newPassword: "long-enough-1" }).field, "currentPassword");
    assert.equal(v.checkSettings({ currentPassword: "x", newPassword: "short" }).field, "newPassword");
    const ok = v.checkSettings({ currentPassword: "old", newPassword: "long-enough-1" });
    assert.deepEqual(ok.value, { currentPassword: "old", newPassword: "long-enough-1" });
  });

  test("the board check returns a clean copy with only known fields", () => {
    const res = v.checkBoard({
      quests: [{
        id: "q1", title: "T", desc: "", cat: "work", priority: "low", status: "todo",
        due: "", added: 1, rank: 1, earned: 99, completed: 99, extra: "x",
      }],
      xp: [{ id: null, xp: 5, extra: 1 }],
      nextId: 1,
      sort: "nonsense",
      dir: "sideways",
      other: true,
    });
    assert.ok(!res.error, res.error);
    assert.equal(res.value.quests[0].extra, undefined);
    assert.equal(res.value.quests[0].earned, null, "an unfinished quest has no XP");
    assert.equal(res.value.nextId, 2, "the next id is always after the highest quest id");
    assert.equal(res.value.sort, "due", "an unknown sort becomes the default");
    assert.equal(res.value.dir, "asc");
    assert.equal(res.value.other, undefined);
  });
});
