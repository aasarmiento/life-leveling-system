// Shared helpers for the tests: start a real Questify server on a free port
// with its own empty data folder, and talk to it like the pages do.
//
// Nothing here touches the real data/ folder: every server gets a temporary
// folder (QUESTIFY_DATA) that is deleted when the test file ends.
const { spawn } = require("node:child_process");
const net = require("node:net");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.join(__dirname, "..");

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Start server.js. Pass dataDir to reuse a folder (to test a restart).
// env adds environment variables (e.g. QUESTIFY_SIGNUP_MAX).
async function startServer({ dataDir, env = {} } = {}) {
  const dir = dataDir || fs.mkdtempSync(path.join(os.tmpdir(), "questify-test-"));
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), QUESTIFY_DATA: dir, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  let exited = false;
  const exitPromise = new Promise((resolve) =>
    child.on("exit", () => {
      exited = true;
      resolve();
    }),
  );
  const collect = (d) => (output += d);
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  await new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (output.includes("Questify running")) {
        clearInterval(timer);
        resolve();
      } else if (exited || Date.now() - started > 15000) {
        clearInterval(timer);
        reject(new Error(`The server did not start:\n${output}`));
      }
    }, 25);
  });

  const url = `http://localhost:${port}`;

  // JSON in, JSON out (or text when the answer isn't JSON)
  async function request(method, urlPath, { body, token, raw, headers = {} } = {}) {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    let payload;
    if (raw !== undefined) {
      payload = raw;
      h["Content-Type"] = "application/json";
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      h["Content-Type"] = "application/json";
    }
    const res = await fetch(url + urlPath, { method, headers: h, body: payload });
    const type = res.headers.get("content-type") || "";
    const text = await res.text();
    let data = text;
    if (type.includes("application/json")) data = JSON.parse(text);
    return { status: res.status, headers: res.headers, type, data };
  }

  // The exact path, with no cleaning up (for "../" tricks that fetch() would fix)
  function rawGet(rawPath) {
    return new Promise((resolve, reject) => {
      const req = http.request({ host: "localhost", port, path: rawPath, method: "GET" }, (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, type: res.headers["content-type"] || "", data: text }),
        );
      });
      req.on("error", reject);
      req.end();
    });
  }

  // Stop the server. keepData = leave the folder (to start again on it).
  async function stop({ keepData = false } = {}) {
    child.kill();
    await exitPromise;
    if (!keepData) fs.rmSync(dir, { recursive: true, force: true });
  }

  const readData = (name) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
  const writeData = (name, value) =>
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(value, null, 2));

  return { url, port, dir, request, rawGet, stop, readData, writeData, output: () => output };
}

let counter = 0;
// A fresh account (own email, so tests never touch each other's data)
async function newPlayer(server, overrides = {}) {
  counter += 1;
  const body = {
    name: `Player ${counter}`,
    email: `player${counter}-${crypto.randomBytes(3).toString("hex")}@example.com`,
    password: "correct-horse-1",
    avatar: "lime",
    ...overrides,
  };
  const res = await server.request("POST", "/api/signup", { body });
  if (res.status !== 201) throw new Error(`Sign up failed: ${res.status} ${JSON.stringify(res.data)}`);
  return { ...body, token: res.data.token };
}

// A small valid board (the same shape the Tasks page saves)
function sampleBoard(extra = {}) {
  return {
    quests: [
      {
        id: "q1",
        title: "Gym",
        desc: "Leg day",
        cat: "health",
        priority: "medium",
        status: "todo",
        due: "2026-12-01",
        added: 1760000000000,
        rank: 1,
        earned: null,
        completed: null,
      },
    ],
    xp: [],
    nextId: 2,
    sort: "due",
    dir: "asc",
    ...extra,
  };
}

const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

module.exports = { startServer, newPlayer, sampleBoard, sha256, ROOT };
