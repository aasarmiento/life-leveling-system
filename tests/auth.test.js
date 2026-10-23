// Accounts: sign up, sign in, sessions, sign out, the wrong-try limit.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, newPlayer } = require("./helpers");

describe("accounts", () => {
  let server;
  before(async () => {
    server = await startServer({ env: { QUESTIFY_SIGNUP_MAX: "100" } });
  });
  after(() => server.stop());

  test("health check answers ok", async () => {
    const res = await server.request("GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.data.status, "ok");
  });

  test("the demo account can sign in", async () => {
    const res = await server.request("POST", "/api/signin", {
      body: { email: "alex@gmail.com", password: "12345678" },
    });
    assert.equal(res.status, 200);
    assert.match(res.data.token, /^[a-f0-9]{64}$/);
    assert.equal(res.data.player.name, "Alex Rivera");
  });

  test("the player sent back never has a password, salt or hash", async () => {
    const res = await server.request("POST", "/api/signin", {
      body: { email: "alex@gmail.com", password: "12345678" },
    });
    assert.deepEqual(Object.keys(res.data.player).sort(), ["avatar", "email", "name"]);
    assert.ok(!JSON.stringify(res.data).includes("12345678"));
  });

  test("a wrong password and an unknown email give the same answer", async () => {
    const wrongPassword = await server.request("POST", "/api/signin", {
      body: { email: "alex@gmail.com", password: "not-the-password" },
    });
    const unknownEmail = await server.request("POST", "/api/signin", {
      body: { email: "nobody-here@example.com", password: "not-the-password" },
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(wrongPassword.data, unknownEmail.data);
  });

  test("sign up makes an account and signs the player in", async () => {
    const res = await server.request("POST", "/api/signup", {
      body: { name: "  Mira  ", email: "Mira@Example.com", password: "mira-pass-1", avatar: "gold" },
    });
    assert.equal(res.status, 201);
    assert.match(res.data.token, /^[a-f0-9]{64}$/);
    assert.deepEqual(res.data.player, { name: "Mira", email: "mira@example.com", avatar: "gold" });
  });

  test("the password is saved only as a salted hash", async () => {
    await newPlayer(server, { password: "super-secret-pass" });
    const file = JSON.stringify(server.readData("users"));
    assert.ok(!file.includes("super-secret-pass"), "the real password must not be in users.json");
    const user = server.readData("users").find((u) => u.email.startsWith("player"));
    assert.match(user.salt, /^[a-f0-9]{32}$/);
    assert.match(user.hash, /^[a-f0-9]{128}$/);
  });

  test("two accounts with the same password get different hashes", async () => {
    const a = await newPlayer(server, { password: "same-password-1" });
    const b = await newPlayer(server, { password: "same-password-1" });
    const users = server.readData("users");
    const hashA = users.find((u) => u.email === a.email).hash;
    const hashB = users.find((u) => u.email === b.email).hash;
    assert.notEqual(hashA, hashB);
  });

  const badSignups = [
    ["a missing name", { name: "", email: "a@example.com", password: "long-enough-1" }, "name"],
    ["a name that is only spaces", { name: "   ", email: "a@example.com", password: "long-enough-1" }, "name"],
    ["a name over 40 characters", { name: "x".repeat(41), email: "a@example.com", password: "long-enough-1" }, "name"],
    ["a missing email", { name: "A", email: "", password: "long-enough-1" }, "email"],
    ["an email without a domain dot", { name: "A", email: "a@example", password: "long-enough-1" }, "email"],
    ["an email with a space", { name: "A", email: "a b@example.com", password: "long-enough-1" }, "email"],
    ["a password under 8 characters", { name: "A", email: "a@example.com", password: "short" }, "password"],
    ["a password over 200 characters", { name: "A", email: "a@example.com", password: "x".repeat(201) }, "password"],
    ["a password that is not text", { name: "A", email: "a@example.com", password: 12345678 }, "password"],
  ];
  for (const [label, body, field] of badSignups) {
    test(`sign up refuses ${label}`, async () => {
      const res = await server.request("POST", "/api/signup", { body });
      assert.equal(res.status, 400);
      assert.equal(res.data.field, field);
      assert.ok(res.data.error);
    });
  }

  test("an unknown avatar becomes lime", async () => {
    const p = await newPlayer(server, { avatar: "purple" });
    const me = await server.request("GET", "/api/me", { token: p.token });
    assert.equal(me.data.player.avatar, "lime");
  });

  test("one email = one account, whatever the letter case", async () => {
    const p = await newPlayer(server);
    const again = await server.request("POST", "/api/signup", {
      body: { name: "Copy", email: p.email.toUpperCase(), password: "another-pass-1" },
    });
    assert.equal(again.status, 409);
    assert.equal(again.data.field, "email");
  });

  test("two sign ups with the same email at the same moment: only one wins", async () => {
    const email = "race@example.com";
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        server.request("POST", "/api/signup", {
          body: { name: "Race", email, password: "race-pass-123" },
        }),
      ),
    );
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409, 409, 409]);
    assert.equal(server.readData("users").filter((u) => u.email === email).length, 1);
  });

  test("/api/me needs a valid token", async () => {
    const p = await newPlayer(server);
    const ok = await server.request("GET", "/api/me", { token: p.token });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.player.email, p.email);

    for (const token of [undefined, "", "nope", "a".repeat(64), "../etc/passwd", "__proto__"]) {
      const res = await server.request("GET", "/api/me", { token });
      assert.equal(res.status, 401, `token ${JSON.stringify(token)} must be refused`);
    }
  });

  test("sign out ends the session, even if done twice", async () => {
    const p = await newPlayer(server);
    const out = await server.request("POST", "/api/signout", { token: p.token });
    assert.equal(out.status, 200);
    const me = await server.request("GET", "/api/me", { token: p.token });
    assert.equal(me.status, 401);
    const again = await server.request("POST", "/api/signout", { token: p.token });
    assert.equal(again.status, 200);
  });

  test("two devices can be signed in at once", async () => {
    const p = await newPlayer(server);
    const second = await server.request("POST", "/api/signin", {
      body: { email: p.email, password: p.password },
    });
    assert.notEqual(second.data.token, p.token);
    const a = await server.request("GET", "/api/me", { token: p.token });
    const b = await server.request("GET", "/api/me", { token: second.data.token });
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
  });

  test("5 wrong tries block the email, even for the right password", async () => {
    const p = await newPlayer(server);
    let last;
    for (let i = 0; i < 5; i++)
      last = await server.request("POST", "/api/signin", {
        body: { email: p.email, password: "wrong-wrong-1" },
      });
    assert.equal(last.status, 429);
    assert.match(last.data.error, /Too many tries/);
    const right = await server.request("POST", "/api/signin", {
      body: { email: p.email, password: p.password },
    });
    assert.equal(right.status, 429, "still blocked with the right password");
  });

  test("a correct sign in starts the wrong-try count again", async () => {
    const p = await newPlayer(server);
    for (let i = 0; i < 4; i++)
      await server.request("POST", "/api/signin", { body: { email: p.email, password: "wrong-wrong-1" } });
    const good = await server.request("POST", "/api/signin", { body: { email: p.email, password: p.password } });
    assert.equal(good.status, 200);
    for (let i = 0; i < 4; i++)
      await server.request("POST", "/api/signin", { body: { email: p.email, password: "wrong-wrong-1" } });
    const stillOk = await server.request("POST", "/api/signin", { body: { email: p.email, password: p.password } });
    assert.equal(stillOk.status, 200, "4 + 4 wrong tries with a good sign in between is not a block");
  });

  test("broken JSON gets a JSON error, not an HTML page", async () => {
    const res = await server.request("POST", "/api/signin", { raw: "{not json" });
    assert.equal(res.status, 400);
    assert.match(res.type, /application\/json/);
    assert.ok(res.data.error);
  });

  test("an unknown /api address answers 404 in JSON", async () => {
    const res = await server.request("GET", "/api/does-not-exist");
    assert.equal(res.status, 404);
    assert.match(res.type, /application\/json/);
  });
});

describe("accounts survive a restart", () => {
  test("account, session and password still work; an expired session does not", async () => {
    let server = await startServer({ env: { QUESTIFY_SIGNUP_MAX: "100" } });
    try {
      const p = await newPlayer(server);
      const dir = server.dir;
      await server.stop({ keepData: true });

      server = await startServer({ dataDir: dir, env: { QUESTIFY_SIGNUP_MAX: "100" } });
      const me = await server.request("GET", "/api/me", { token: p.token });
      assert.equal(me.status, 200, "the session is still valid after a restart");
      const signin = await server.request("POST", "/api/signin", { body: { email: p.email, password: p.password } });
      assert.equal(signin.status, 200);

      // Make every session old, restart: nobody is signed in anymore
      await server.stop({ keepData: true });
      const sessions = JSON.parse(require("node:fs").readFileSync(`${dir}/sessions.json`, "utf8"));
      for (const s of Object.values(sessions)) s.expiresAt = Date.now() - 1000;
      require("node:fs").writeFileSync(`${dir}/sessions.json`, JSON.stringify(sessions));
      server = await startServer({ dataDir: dir, env: { QUESTIFY_SIGNUP_MAX: "100" } });
      const expired = await server.request("GET", "/api/me", { token: p.token });
      assert.equal(expired.status, 401, "an expired session is refused");
    } finally {
      await server.stop();
    }
  });

  test("a damaged data file stops the server with a clear message", async () => {
    const fs = require("node:fs");
    const os = require("node:os");
    const path = require("node:path");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "questify-bad-"));
    fs.writeFileSync(path.join(dir, "users.json"), "{ this is not json");
    await assert.rejects(startServer({ dataDir: dir }), /users\.json is damaged/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
