// Settings: change the display name, the avatar and the password (PUT /api/me).
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, newPlayer } = require("./helpers");

describe("settings", () => {
  let server;
  before(async () => {
    server = await startServer({ env: { QUESTIFY_SIGNUP_MAX: "100" } });
  });
  after(() => server.stop());

  const update = (token, body) => server.request("PUT", "/api/me", { token, body });
  const signin = (email, password) => server.request("POST", "/api/signin", { body: { email, password } });

  test("needs a signed-in player", async () => {
    assert.equal((await update(undefined, { name: "X" })).status, 401);
    assert.equal((await update("a".repeat(64), { name: "X" })).status, 401);
  });

  test("changes the display name (trimmed) and /api/me shows it", async () => {
    const p = await newPlayer(server);
    const res = await update(p.token, { name: "  New Name  " });
    assert.equal(res.status, 200);
    assert.equal(res.data.player.name, "New Name");
    assert.equal(res.data.passwordChanged, false);
    const me = await server.request("GET", "/api/me", { token: p.token });
    assert.equal(me.data.player.name, "New Name");
  });

  test("changes the avatar", async () => {
    const p = await newPlayer(server, { avatar: "lime" });
    const res = await update(p.token, { avatar: "gold" });
    assert.equal(res.data.player.avatar, "gold");
  });

  test("changes name and avatar together", async () => {
    const p = await newPlayer(server);
    const res = await update(p.token, { name: "Both", avatar: "gold" });
    assert.deepEqual(res.data.player, { name: "Both", email: p.email, avatar: "gold" });
  });

  test("the email can't be changed", async () => {
    const p = await newPlayer(server);
    const res = await update(p.token, { name: "Same Email", email: "hacker@example.com" });
    assert.equal(res.data.player.email, p.email);
  });

  const badChanges = [
    ["an empty name", { name: "" }, "name"],
    ["a name of only spaces", { name: "    " }, "name"],
    ["a name over 40 characters", { name: "x".repeat(41) }, "name"],
    ["a name that is not text", { name: 42 }, "name"],
    ["an unknown avatar", { avatar: "purple" }, "avatar"],
    ["an avatar that is not text", { avatar: { a: 1 } }, "avatar"],
    ["nothing at all", {}, null],
    ["a new password without the current one", { newPassword: "brand-new-pass" }, "currentPassword"],
  ];
  for (const [label, body, field] of badChanges) {
    test(`refuses ${label}`, async () => {
      const p = await newPlayer(server);
      const res = await update(p.token, body);
      assert.equal(res.status, 400);
      assert.equal(res.data.field, field);
    });
  }

  test("a refused change changes nothing", async () => {
    const p = await newPlayer(server, { name: "Keep Me" });
    await update(p.token, { name: "Fine Name", avatar: "purple" });
    const me = await server.request("GET", "/api/me", { token: p.token });
    assert.equal(me.data.player.name, "Keep Me", "the good name is not saved when the avatar is bad");
  });

  test("a name change leaves the password exactly as it was", async () => {
    const p = await newPlayer(server);
    const before = server.readData("users").find((u) => u.email === p.email);
    await update(p.token, { name: "Renamed" });
    const after = server.readData("users").find((u) => u.email === p.email);
    assert.equal(after.hash, before.hash);
    assert.equal(after.salt, before.salt);
    assert.equal((await signin(p.email, p.password)).status, 200);
  });

  test("changes the password: old stops working, new works", async () => {
    const p = await newPlayer(server);
    const res = await update(p.token, { currentPassword: p.password, newPassword: "a-brand-new-pass" });
    assert.equal(res.status, 200);
    assert.equal(res.data.passwordChanged, true);
    assert.equal((await signin(p.email, p.password)).status, 401, "the old password is refused");
    assert.equal((await signin(p.email, "a-brand-new-pass")).status, 200);
  });

  test("the new password is saved with a new salt, never as text", async () => {
    const p = await newPlayer(server);
    const before = server.readData("users").find((u) => u.email === p.email);
    await update(p.token, { currentPassword: p.password, newPassword: "another-new-pass" });
    const after = server.readData("users").find((u) => u.email === p.email);
    assert.notEqual(after.salt, before.salt);
    assert.notEqual(after.hash, before.hash);
    assert.ok(!JSON.stringify(server.readData("users")).includes("another-new-pass"));
  });

  test("the wrong current password is refused and nothing changes", async () => {
    const p = await newPlayer(server);
    const res = await update(p.token, { currentPassword: "not-my-password", newPassword: "a-brand-new-pass" });
    assert.equal(res.status, 400);
    assert.equal(res.data.field, "currentPassword");
    assert.match(res.data.error, /incorrect/);
    assert.equal((await signin(p.email, p.password)).status, 200, "the old password still works");
  });

  test("a new password must be 8 to 200 characters and different from the old one", async () => {
    const p = await newPlayer(server);
    const short = await update(p.token, { currentPassword: p.password, newPassword: "short" });
    assert.equal(short.status, 400);
    assert.equal(short.data.field, "newPassword");
    const long = await update(p.token, { currentPassword: p.password, newPassword: "x".repeat(201) });
    assert.equal(long.status, 400);
    const same = await update(p.token, { currentPassword: p.password, newPassword: p.password });
    assert.equal(same.status, 400);
    assert.equal(same.data.field, "newPassword");
  });

  test("after a password change this device stays signed in, other devices are signed out", async () => {
    const p = await newPlayer(server);
    const other = (await signin(p.email, p.password)).data.token;
    assert.equal((await server.request("GET", "/api/me", { token: other })).status, 200);

    await update(p.token, { currentPassword: p.password, newPassword: "fresh-password-1" });
    assert.equal((await server.request("GET", "/api/me", { token: p.token })).status, 200, "this device");
    assert.equal((await server.request("GET", "/api/me", { token: other })).status, 401, "the other device");
  });

  test("a password change does not sign out other players", async () => {
    const a = await newPlayer(server);
    const b = await newPlayer(server);
    await update(a.token, { currentPassword: a.password, newPassword: "fresh-password-2" });
    assert.equal((await server.request("GET", "/api/me", { token: b.token })).status, 200);
  });

  test("guessing the current password in Settings is limited like sign in", async () => {
    const p = await newPlayer(server);
    let last;
    for (let i = 0; i < 5; i++)
      last = await update(p.token, { currentPassword: `wrong-guess-${i}`, newPassword: "a-brand-new-pass" });
    assert.equal(last.status, 429);
    const right = await update(p.token, { currentPassword: p.password, newPassword: "a-brand-new-pass" });
    assert.equal(right.status, 429, "blocked even with the right password");
    assert.equal((await signin(p.email, p.password)).status, 429, "sign in is blocked too");
  });
});

describe("settings after a restart", () => {
  test("the new name, avatar and password are still there", async () => {
    let server = await startServer();
    try {
      const p = await newPlayer(server);
      await server.request("PUT", "/api/me", {
        token: p.token,
        body: { name: "Saved Name", avatar: "gold", currentPassword: p.password, newPassword: "restart-pass-1" },
      });
      const dir = server.dir;
      await server.stop({ keepData: true });
      server = await startServer({ dataDir: dir });
      const res = await server.request("POST", "/api/signin", { body: { email: p.email, password: "restart-pass-1" } });
      assert.equal(res.status, 200);
      assert.equal(res.data.player.name, "Saved Name");
      assert.equal(res.data.player.avatar, "gold");
    } finally {
      await server.stop();
    }
  });
});
