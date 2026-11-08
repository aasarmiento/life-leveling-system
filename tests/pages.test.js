// The pages are served, and the browser code and the server agree on the rules.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startServer, ROOT } = require("./helpers");

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("pages", () => {
  let server;
  before(async () => {
    server = await startServer();
  });
  after(() => server.stop());

  const pages = ["/", "/index.html", ...fs.readdirSync(path.join(ROOT, "pages")).filter((f) => f.endsWith(".html")).map((f) => `/pages/${f}`)];
  for (const urlPath of pages) {
    test(`${urlPath} loads as a page`, async () => {
      const res = await server.request("GET", urlPath);
      assert.equal(res.status, 200);
      assert.match(res.type, /text\/html/);
      assert.match(res.data, /<title>.+<\/title>/);
    });
  }

  test("pages also open without .html", async () => {
    for (const name of ["tasks", "profile", "settings", "signin"]) {
      const res = await server.request("GET", `/pages/${name}`);
      assert.equal(res.status, 200, name);
    }
  });

  test("the css and js files are served with the right type", async () => {
    const css = await server.request("GET", "/css/style.css");
    const js = await server.request("GET", "/js/nav.js");
    const settings = await server.request("GET", "/js/settings.js");
    assert.match(css.type, /text\/css/);
    assert.match(js.type, /javascript/);
    assert.match(settings.type, /javascript/);
  });

  test("every local script and stylesheet a page asks for really exists", () => {
    const roots = { "": ROOT, pages: path.join(ROOT, "pages") };
    const files = [["index.html", ROOT], ...fs.readdirSync(path.join(ROOT, "pages")).filter((f) => f.endsWith(".html")).map((f) => [`pages/${f}`, path.join(ROOT, "pages")])];
    for (const [file, base] of files) {
      const html = read(file);
      for (const [, ref] of html.matchAll(/<(?:script[^>]*\bsrc|link[^>]*\bhref)="([^"#?]+)"/gi)) {
        if (/^(https?:)?\/\//.test(ref)) continue;
        assert.ok(fs.existsSync(path.resolve(base, ref)), `${file} points to ${ref}, which doesn't exist`);
      }
    }
    assert.ok(roots);
  });
});

describe("the pages and the server use the same rules", () => {
  test("the email rule in nav.js is the same as in lib/validate.js", () => {
    const literal = /const EMAIL_RE = (\/.*\/[a-z]*);/.exec(read("js/nav.js"));
    assert.ok(literal, "found EMAIL_RE in nav.js");
    const inBrowser = new Function(`return ${literal[1]}`)();
    const onServer = require("../lib/validate").EMAIL_RE;
    assert.equal(inBrowser.source, onServer.source);
    assert.equal(inBrowser.flags, onServer.flags);
  });

  test("XP per level is 125 in nav.js, tasks.js and profile.js", () => {
    for (const file of ["js/nav.js", "js/tasks.js", "js/profile.js"])
      assert.match(read(file), /const XP_PER_LEVEL = 125;/, file);
  });

  test("XP per priority is 10 / 20 / 30 in tasks.js", () => {
    assert.match(read("js/tasks.js"), /const XP_BY_PRIORITY = \{ low: 10, medium: 20, high: 30 \};/);
  });

  test("the settings page uses the same name and password limits as the server", () => {
    const js = read("js/settings.js");
    assert.match(js, /const NAME_MAX = 40;/);
    assert.match(js, /const PASSWORD_MIN = 8;/);
    assert.match(js, /const PASSWORD_MAX = 200;/);
  });

  test("the Settings link in the player card and the phone menu goes to settings.html", () => {
    const nav = read("js/nav.js");
    assert.equal((nav.match(/pages\/settings\.html/g) || []).length, 2);
    assert.ok(!/Coming soon/.test(nav), "no more 'Coming soon' for Settings");
    assert.match(nav, /settings: "settings\.html"/, "Settings is a guarded page");
  });
});
