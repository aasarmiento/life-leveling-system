// The Quest Board on the server: saving, the version check (409), validation,
// one board per player, and the board still being there after a restart.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, newPlayer, sampleBoard } = require("./helpers");

describe("quest board", () => {
  let server;
  before(async () => {
    server = await startServer({ env: { QUESTIFY_SIGNUP_MAX: "100" } });
  });
  after(() => server.stop());

  const put = (token, board, base = null, extra = {}) =>
    server.request("PUT", "/api/board", { token, body: { board, base, ...extra } });

  test("both board routes need a signed-in player", async () => {
    assert.equal((await server.request("GET", "/api/board")).status, 401);
    assert.equal((await server.request("PUT", "/api/board", { body: { board: sampleBoard() } })).status, 401);
    assert.equal((await server.request("GET", "/api/board", { token: "a".repeat(64) })).status, 401);
  });

  test("a new player has no board yet", async () => {
    const p = await newPlayer(server);
    const res = await server.request("GET", "/api/board", { token: p.token });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { board: null, version: null });
  });

  test("the first save works and comes back the same", async () => {
    const p = await newPlayer(server);
    const saved = await put(p.token, sampleBoard());
    assert.equal(saved.status, 200);
    assert.ok(Number.isInteger(saved.data.version));
    const got = await server.request("GET", "/api/board", { token: p.token });
    assert.equal(got.data.version, saved.data.version);
    assert.deepEqual(got.data.board, sampleBoard());
  });

  test("only the known fields are saved (extra ones are dropped)", async () => {
    const p = await newPlayer(server);
    const board = sampleBoard();
    board.quests[0].hacked = "<script>alert(1)</script>";
    board.evil = true;
    await put(p.token, board);
    const got = await server.request("GET", "/api/board", { token: p.token });
    assert.equal(got.data.board.evil, undefined);
    assert.equal(got.data.board.quests[0].hacked, undefined);
  });

  test("the version goes up on every save, even two in a row", async () => {
    const p = await newPlayer(server);
    const a = await put(p.token, sampleBoard());
    const b = await put(p.token, sampleBoard({ sort: "xp" }), a.data.version);
    const c = await put(p.token, sampleBoard({ sort: "added" }), b.data.version);
    assert.ok(b.data.version > a.data.version);
    assert.ok(c.data.version > b.data.version);
  });

  test("saving from an old version gets 409 and the newest board", async () => {
    const p = await newPlayer(server);
    const first = await put(p.token, sampleBoard());
    const second = await put(p.token, sampleBoard({ sort: "priority" }), first.data.version);
    const stale = await put(p.token, sampleBoard({ sort: "xp" }), first.data.version);
    assert.equal(stale.status, 409);
    assert.equal(stale.data.version, second.data.version);
    assert.equal(stale.data.board.sort, "priority", "the newest board is returned, nothing was overwritten");
  });

  test("a first save with a base when the server has none is refused", async () => {
    const p = await newPlayer(server);
    const res = await put(p.token, sampleBoard(), 12345);
    assert.equal(res.status, 409);
  });

  test("force: true replaces the board anyway", async () => {
    const p = await newPlayer(server);
    const first = await put(p.token, sampleBoard());
    await put(p.token, sampleBoard({ sort: "priority" }), first.data.version);
    const forced = await put(p.token, sampleBoard({ sort: "xp" }), first.data.version, { force: true });
    assert.equal(forced.status, 200);
    const got = await server.request("GET", "/api/board", { token: p.token });
    assert.equal(got.data.board.sort, "xp");
  });

  test("5 saves at the same moment from the same version: exactly 1 wins", async () => {
    const p = await newPlayer(server);
    const first = await put(p.token, sampleBoard());
    const results = await Promise.all(
      ["due", "added", "priority", "xp", "manual"].map((sort) =>
        put(p.token, sampleBoard({ sort }), first.data.version),
      ),
    );
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [200, 409, 409, 409, 409]);
  });

  test("a player only sees their own board", async () => {
    const a = await newPlayer(server);
    const b = await newPlayer(server);
    await put(a.token, sampleBoard({ sort: "xp" }));
    const seenByB = await server.request("GET", "/api/board", { token: b.token });
    assert.deepEqual(seenByB.data, { board: null, version: null });
    const seenByA = await server.request("GET", "/api/board", { token: a.token });
    assert.equal(seenByA.data.board.sort, "xp");
  });

  test("a bad base version is refused", async () => {
    const p = await newPlayer(server);
    for (const base of ["1", 1.5, {}, [], true]) {
      const res = await put(p.token, sampleBoard(), base);
      assert.equal(res.status, 400, `base ${JSON.stringify(base)}`);
    }
  });

  // Each of these is a board the Tasks page would never send. The server must refuse every one.
  const mutate = (fn) => {
    const b = sampleBoard();
    fn(b);
    return b;
  };
  const doneQuest = (q) => Object.assign(q, { status: "done", earned: 20, completed: 1760000100000 });
  const badBoards = [
    ["no quests list", { xp: [] }],
    ["no xp list", { quests: [] }],
    ["a board that is a list", []],
    ["more than 500 quests", mutate((b) => {
      b.quests = Array.from({ length: 501 }, (_, i) => ({ ...b.quests[0], id: `q${i + 1}` }));
    })],
    ["more than 10,000 XP entries", mutate((b) => { b.xp = Array.from({ length: 10001 }, () => ({ id: null, xp: 1 })); })],
    ["a quest id that is not q + digits", mutate((b) => { b.quests[0].id = "../x"; })],
    ["the same quest id twice", mutate((b) => { b.quests.push({ ...b.quests[0] }); })],
    ["an empty title", mutate((b) => { b.quests[0].title = "   "; })],
    ["a title over 60 characters", mutate((b) => { b.quests[0].title = "x".repeat(61); })],
    ["a description over 300 characters", mutate((b) => { b.quests[0].desc = "x".repeat(301); })],
    ["an unknown category", mutate((b) => { b.quests[0].cat = "gaming"; })],
    ["an unknown priority", mutate((b) => { b.quests[0].priority = "urgent"; })],
    ["an unknown status", mutate((b) => { b.quests[0].status = "paused"; })],
    ["a due date that does not exist (Feb 31)", mutate((b) => { b.quests[0].due = "2026-02-31"; })],
    ["a due date in the wrong format", mutate((b) => { b.quests[0].due = "12/01/2026"; })],
    ["a position that is not a number", mutate((b) => { b.quests[0].rank = "first"; })],
    ["a done quest without its XP", mutate((b) => { doneQuest(b.quests[0]); b.quests[0].earned = null; })],
    ["a done quest with more than 1000 XP", mutate((b) => { doneQuest(b.quests[0]); b.quests[0].earned = 5000; })],
    ["a done quest without a finish time", mutate((b) => { doneQuest(b.quests[0]); b.quests[0].completed = null; })],
    ["an XP entry that is not a whole number", mutate((b) => { b.xp = [{ id: null, xp: 1.5 }]; })],
    ["an XP entry that is huge", mutate((b) => { b.xp = [{ id: null, xp: 1e9 }]; })],
    ["an XP entry with a bad quest id", mutate((b) => { b.xp = [{ id: "nope", xp: 10 }]; })],
    ["a quest that is not an object", mutate((b) => { b.quests = ["hello"]; })],
  ];
  for (const [label, board] of badBoards) {
    test(`refuses ${label}`, async () => {
      const p = await newPlayer(server);
      const res = await put(p.token, board);
      assert.equal(res.status, 400);
      assert.ok(res.data.error);
      const after = await server.request("GET", "/api/board", { token: p.token });
      assert.equal(after.data.board, null, "a refused board must not be saved");
    });
  }

  test("a done quest with its XP is accepted, and the XP history too", async () => {
    const p = await newPlayer(server);
    const board = mutate((b) => {
      doneQuest(b.quests[0]);
      b.xp = [{ id: "q1", xp: 20 }, { id: null, xp: -5 }];
    });
    const res = await put(p.token, board);
    assert.equal(res.status, 200);
  });

  test("text typed into a quest is saved as plain text, exactly as typed", async () => {
    const p = await newPlayer(server);
    const board = mutate((b) => {
      b.quests[0].title = '<img src=x onerror="alert(1)">';
      b.quests[0].desc = "<script>alert(2)</script>";
    });
    await put(p.token, board);
    const got = await server.request("GET", "/api/board", { token: p.token });
    assert.equal(got.data.board.quests[0].title, '<img src=x onerror="alert(1)">');
    assert.match(got.type, /application\/json/, "sent as JSON, never as a page that could run it");
  });

  test("a request over 1 MB is refused in JSON", async () => {
    const p = await newPlayer(server);
    const res = await server.request("PUT", "/api/board", {
      token: p.token,
      raw: JSON.stringify({ board: sampleBoard(), pad: "x".repeat(1100 * 1024) }),
    });
    assert.equal(res.status, 413);
    assert.match(res.type, /application\/json/);
  });

  test("300 quick saves never leave a half-written file", async () => {
    const p = await newPlayer(server);
    let base = (await put(p.token, sampleBoard())).data.version;
    for (let i = 0; i < 300; i++) {
      const res = await put(p.token, sampleBoard({ nextId: i + 2 }), base);
      assert.equal(res.status, 200);
      base = res.data.version;
    }
    const file = server.readData("boards"); // JSON.parse throws if the file is half-written
    assert.ok(Object.keys(file).length > 0);
    const fs = require("node:fs");
    assert.ok(!fs.existsSync(`${server.dir}/boards.json.tmp`), "no leftover temporary file");
  });
});

describe("quest board after a restart", () => {
  test("the board and its version are still there", async () => {
    let server = await startServer();
    try {
      const p = await newPlayer(server);
      const saved = await server.request("PUT", "/api/board", {
        token: p.token,
        body: { board: sampleBoard({ sort: "xp" }), base: null },
      });
      const dir = server.dir;
      await server.stop({ keepData: true });

      server = await startServer({ dataDir: dir });
      const got = await server.request("GET", "/api/board", { token: p.token });
      assert.equal(got.status, 200);
      assert.equal(got.data.version, saved.data.version);
      assert.equal(got.data.board.sort, "xp");
    } finally {
      await server.stop();
    }
  });
});
