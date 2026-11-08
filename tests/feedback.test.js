// Feedback from the Home page: validation, the server-made reference number,
// newest first, and the spam limit.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("./helpers");

describe("feedback", () => {
  let server;
  before(async () => {
    server = await startServer();
  });
  after(() => server.stop());

  const send = (body) => server.request("POST", "/api/feedback", { body });
  const REF = /^FB-\d{6}-[A-HJ-NP-Z2-9]{4}$/;

  test("good feedback is saved with a reference number made by the server", async () => {
    const res = await send({ rating: 5, tags: ["Design", "Music"], message: "Love it", ref: "FB-FAKE" });
    assert.equal(res.status, 201);
    assert.match(res.data.ref, REF);
    assert.notEqual(res.data.ref, "FB-FAKE", "the page's own number is ignored");
    assert.equal(res.data.rating, 5);
    assert.deepEqual(res.data.tags, ["Design", "Music"]);
    assert.equal(res.data.message, "Love it");
    assert.ok(!Number.isNaN(Date.parse(res.data.receivedAt)));
  });

  test("it is really saved in data/feedback.json", async () => {
    const res = await send({ rating: 4, message: "Saved to disk?" });
    const saved = server.readData("feedback");
    assert.ok(saved.some((f) => f.ref === res.data.ref && f.message === "Saved to disk?"));
  });

  for (const rating of [0, 6, 3.5, "x", null, undefined, -1]) {
    test(`a rating of ${JSON.stringify(rating)} is refused`, async () => {
      const res = await send({ rating, message: "x" });
      assert.equal(res.status, 400);
      assert.match(res.data.error, /Rating/);
    });
  }

  test("a message over 500 characters is refused, 500 is fine", async () => {
    assert.equal((await send({ rating: 3, message: "x".repeat(501) })).status, 400);
    assert.equal((await send({ rating: 3, message: "x".repeat(500) })).status, 201);
  });

  test("unknown tags are dropped and repeated tags are counted once", async () => {
    const res = await send({ rating: 3, tags: ["Design", "Design", "Hacking", 7, "Music"] });
    assert.deepEqual(res.data.tags, ["Design", "Music"]);
  });

  test("feedback without a message or tags is fine", async () => {
    const res = await send({ rating: 2 });
    assert.equal(res.status, 201);
    assert.equal(res.data.message, "");
    assert.deepEqual(res.data.tags, []);
  });

  test("GET shows the newest first and needs no sign in", async () => {
    await send({ rating: 1, message: "older" });
    await send({ rating: 1, message: "newest of all" });
    const res = await server.request("GET", "/api/feedback");
    assert.equal(res.status, 200);
    assert.equal(res.data[0].message, "newest of all");
    assert.ok(res.data.every((f) => !("email" in f) && !("name" in f)), "no names or emails in feedback");
  });

  test("the 11th feedback in a minute is refused", async () => {
    // A new server: the ones above already used part of this minute's allowance
    const fresh = await startServer();
    try {
      let last;
      for (let i = 1; i <= 10; i++) {
        last = await fresh.request("POST", "/api/feedback", { body: { rating: 4, message: `n${i}` } });
        assert.equal(last.status, 201, `feedback ${i} should be accepted`);
      }
      const eleventh = await fresh.request("POST", "/api/feedback", { body: { rating: 4, message: "n11" } });
      assert.equal(eleventh.status, 429);
      assert.match(eleventh.data.error, /wait a minute/);
      assert.equal(fresh.readData("feedback").length, 10, "the refused one is not saved");
    } finally {
      await fresh.stop();
    }
  });
});

describe("feedback after a restart", () => {
  test("feedback is still there and the new reference numbers stay unique", async () => {
    let server = await startServer();
    try {
      const first = await server.request("POST", "/api/feedback", { body: { rating: 5, message: "before" } });
      const dir = server.dir;
      await server.stop({ keepData: true });
      server = await startServer({ dataDir: dir });
      const list = await server.request("GET", "/api/feedback");
      assert.equal(list.data[0].ref, first.data.ref);
      const second = await server.request("POST", "/api/feedback", { body: { rating: 5, message: "after" } });
      assert.notEqual(second.data.ref, first.data.ref);
    } finally {
      await server.stop();
    }
  });
});
