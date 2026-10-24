// Security: headers, private files, hashed session tokens, the sign-up limit.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { startServer, newPlayer, sha256 } = require("./helpers");

describe("security headers", () => {
  let server;
  before(async () => {
    server = await startServer();
  });
  after(() => server.stop());

  for (const urlPath of ["/", "/pages/tasks.html", "/pages/settings.html", "/api/health", "/nothing-here"]) {
    test(`${urlPath} has the security headers`, async () => {
      const res = await server.request("GET", urlPath);
      const csp = res.headers.get("content-security-policy");
      assert.ok(csp, "Content-Security-Policy is set");
      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /object-src 'none'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /base-uri 'self'/);
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(res.headers.get("x-frame-options"), "DENY");
      assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
      assert.match(res.headers.get("permissions-policy"), /camera=\(\)/);
      assert.equal(res.headers.get("x-powered-by"), null, "the framework name is hidden");
    });
  }

  test("scripts may only come from this site and the cursor library", async () => {
    const csp = (await server.request("GET", "/")).headers.get("content-security-policy");
    const scripts = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith("script-src"));
    assert.equal(scripts, "script-src 'self' https://cdn.jsdelivr.net");
    assert.ok(!scripts.includes("unsafe-inline") && !scripts.includes("unsafe-eval"));
  });

  test("the Profile backup download still works (blob: allowed for downloads)", async () => {
    const csp = (await server.request("GET", "/")).headers.get("content-security-policy");
    const connect = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith("connect-src"));
    assert.equal(connect, "connect-src 'self' blob:");
  });

  test("every page only loads scripts the policy allows (no inline scripts or handlers)", () => {
    const root = path.join(__dirname, "..");
    const pages = [path.join(root, "index.html"), ...fs.readdirSync(path.join(root, "pages")).map((f) => path.join(root, "pages", f))];
    for (const file of pages.filter((f) => f.endsWith(".html"))) {
      const html = fs.readFileSync(file, "utf8");
      const name = path.relative(root, file);
      assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), `${name} has an inline <script>`);
      assert.ok(!/\son(click|load|error|change|submit|input|focus|blur|mouseover)\s*=/i.test(html), `${name} has an inline event handler`);
      for (const [, src] of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/gi))
        assert.ok(
          !/^https?:/i.test(src) || src.startsWith("https://cdn.jsdelivr.net/"),
          `${name} loads a script from somewhere the policy blocks: ${src}`,
        );
    }
  });

  test("API answers are never cached by the browser", async () => {
    const p = await newPlayer(server);
    for (const [method, urlPath] of [["GET", "/api/health"], ["GET", "/api/me"], ["GET", "/api/board"], ["GET", "/api/feedback"]]) {
      const res = await server.request(method, urlPath, { token: p.token });
      assert.equal(res.headers.get("cache-control"), "no-store", urlPath);
    }
  });
});

describe("private files", () => {
  let server;
  before(async () => {
    server = await startServer();
    await newPlayer(server); // makes sure data/*.json exist and hold something
  });
  after(() => server.stop());

  const privatePaths = [
    "/server.js", "/package.json", "/package-lock.json", "/.gitignore", "/README.md",
    "/lib/store.js", "/lib/sessions.js", "/routes/auth.js", "/tests/helpers.js",
    "/data/users.json", "/data/sessions.json", "/data/boards.json", "/data/feedback.json",
    "/node_modules/express/package.json", "/css/../server.js", "/pages/../server.js",
    "/js/../data/users.json", "/%2e%2e/server.js", "/css/%2e%2e/%2e%2e/server.js", "/assets/../server.js",
    "/..%2fserver.js", "/pages/%2e%2e%2fserver.js",
  ];
  for (const urlPath of privatePaths) {
    test(`${urlPath} is not served`, async () => {
      const res = await server.rawGet(urlPath);
      const leaked = /require\(|"passwordHash"|"hash"|"salt"|express/.test(res.data);
      assert.ok(!leaked, "the answer must not contain code or data");
      assert.ok(res.status === 404 || res.status === 400, `status ${res.status}`);
    });
  }

  test("a wrong address answers 404 with the Home page", async () => {
    const res = await server.request("GET", "/no/such/page");
    assert.equal(res.status, 404);
    assert.match(res.data, /<base href="\/">/);
  });
});

describe("sessions are saved as hashes", () => {
  test("the token is never in sessions.json, only its SHA-256 hash", async () => {
    const server = await startServer();
    try {
      const p = await newPlayer(server);
      const file = fs.readFileSync(path.join(server.dir, "sessions.json"), "utf8");
      assert.ok(!file.includes(p.token), "the real token must not be saved");
      const sessions = JSON.parse(file);
      assert.ok(Object.hasOwn(sessions, sha256(p.token)), "saved under the hash of the token");
      assert.equal(sessions[sha256(p.token)].v, 2);
    } finally {
      await server.stop();
    }
  });

  test("signing in again and signing out keep the file free of real tokens", async () => {
    const server = await startServer();
    try {
      const p = await newPlayer(server);
      const again = await server.request("POST", "/api/signin", { body: { email: p.email, password: p.password } });
      await server.request("POST", "/api/signout", { token: p.token });
      const file = fs.readFileSync(path.join(server.dir, "sessions.json"), "utf8");
      assert.ok(!file.includes(again.data.token));
      assert.ok(!file.includes(p.token));
      assert.ok(!Object.hasOwn(JSON.parse(file), sha256(p.token)), "sign out removes the session");
      assert.ok(Object.hasOwn(JSON.parse(file), sha256(again.data.token)), "the other session stays");
    } finally {
      await server.stop();
    }
  });

  test("someone who reads sessions.json can't sign in with what they find", async () => {
    const server = await startServer();
    try {
      const p = await newPlayer(server);
      for (const key of Object.keys(server.readData("sessions"))) {
        const res = await server.request("GET", "/api/me", { token: key });
        assert.equal(res.status, 401, "the saved hash is not a working token");
      }
      assert.equal((await server.request("GET", "/api/me", { token: p.token })).status, 200);
    } finally {
      await server.stop();
    }
  });

  test("sessions saved by the older version (with real tokens) are removed at start", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "questify-old-"));
    const oldToken = "ab".repeat(32);
    fs.writeFileSync(
      path.join(dir, "sessions.json"),
      JSON.stringify({ [oldToken]: { userId: 1, createdAt: Date.now(), expiresAt: Date.now() + 3600e3 } }),
    );
    const server = await startServer({ dataDir: dir });
    try {
      const res = await server.request("GET", "/api/me", { token: oldToken });
      assert.equal(res.status, 401, "an old token no longer works");
      const file = fs.readFileSync(path.join(dir, "sessions.json"), "utf8");
      assert.ok(!file.includes(oldToken), "and it is gone from the file");
    } finally {
      await server.stop();
    }
  });
});

describe("sign up limit", () => {
  test("a connection can only make a few accounts, then waits", async () => {
    const server = await startServer({ env: { QUESTIFY_SIGNUP_MAX: "3" } });
    try {
      const make = (n) =>
        server.request("POST", "/api/signup", {
          body: { name: `Limit ${n}`, email: `limit${n}@example.com`, password: "limit-pass-123" },
        });
      for (let n = 1; n <= 3; n++) assert.equal((await make(n)).status, 201, `account ${n}`);
      const fourth = await make(4);
      assert.equal(fourth.status, 429);
      assert.match(fourth.data.error, /Too many accounts/);
      assert.ok(!server.readData("users").some((u) => u.email === "limit4@example.com"), "the 4th was not made");
    } finally {
      await server.stop();
    }
  });

  test("the limit only counts accounts that were made, not mistakes", async () => {
    const server = await startServer({ env: { QUESTIFY_SIGNUP_MAX: "2" } });
    try {
      for (let i = 0; i < 5; i++) {
        const bad = await server.request("POST", "/api/signup", { body: { name: "", email: "x", password: "1" } });
        assert.equal(bad.status, 400);
      }
      const taken = await server.request("POST", "/api/signup", {
        body: { name: "Alex", email: "alex@gmail.com", password: "long-enough-1" },
      });
      assert.equal(taken.status, 409, "an email that is taken is not counted either");
      assert.equal(
        (await server.request("POST", "/api/signup", { body: { name: "A", email: "a1@example.com", password: "long-enough-1" } })).status,
        201,
      );
    } finally {
      await server.stop();
    }
  });

  test("the limit does not stop existing players from signing in", async () => {
    const server = await startServer({ env: { QUESTIFY_SIGNUP_MAX: "1" } });
    try {
      const p = await newPlayer(server);
      const blocked = await server.request("POST", "/api/signup", {
        body: { name: "Two", email: "two@example.com", password: "long-enough-1" },
      });
      assert.equal(blocked.status, 429);
      const signin = await server.request("POST", "/api/signin", { body: { email: p.email, password: p.password } });
      assert.equal(signin.status, 200);
    } finally {
      await server.stop();
    }
  });
});
