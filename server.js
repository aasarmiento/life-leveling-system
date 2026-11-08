const express = require("express");
const path = require("path");
const fs = require("fs");

// load the JSON data files (creates them + the demo account on first start)
require("./lib/store");

const app = express();
const PORT = process.env.PORT || 3000;

// Don't tell visitors which server framework this is (no "X-Powered-By: Express")
app.disable("x-powered-by");

//feedback route module import
const feedbackRoutes = require("./routes/feedback");
// accounts + sign in routes (signup, signin, me, signout)
const authRoutes = require("./routes/auth");
// Quest Board routes (GET /api/board, PUT /api/board)
const boardRoutes = require("./routes/board");

// Security headers on every answer. They tell the browser what the pages are
// allowed to load, so a piece of injected code can't pull in scripts from
// other sites, and the app can't be shown inside someone else's page.
//   script-src   our own scripts + the Cursorly cursor library (jsDelivr)
//   style-src    our CSS + Google Fonts ('unsafe-inline': a few pages use style="")
//   font-src     Google Fonts files
//   img-src      our images + data: + the Cursorly default cursor images
//   media-src    our videos and music
//   connect-src  the pages only talk to this server (blob: lets Export data download its backup file)
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://img.icons8.com",
  "media-src 'self' blob:",
  "connect-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  next();
});

// Answers from the API hold private data (boards, sessions): never keep a copy in the browser cache
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Parse JSON request bodies (1 MB: room for a full board of 500 quests)
app.use(express.json({ limit: "1mb" }));

// Serve front-end assets with .html extension support for /pages
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use(
  "/pages",
  express.static(path.join(__dirname, "pages"), { extensions: ["html"] }),
);
app.use("/assets", express.static(path.join(__dirname, "assets")));

//silencing the request for favico - 204
app.get("/favicon.ico", (req, res) => res.status(204).end());

//mounting the feedback route
app.use("/api/feedback", feedbackRoutes);
//mounting the account routes: /api/signup, /api/signin, /api/me, /api/signout
app.use("/api", authRoutes);
//mounting the Quest Board routes: /api/board
app.use("/api/board", boardRoutes);

// Home page
app.get(["/", "/index.html"], (req, res) => {
  res.sendFile("index.html", { root: __dirname });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "questify" });
});

// Unknown /api addresses answer with JSON (the pages read JSON, not the Home page)
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// 404 Fallback: the Home page. <base href="/"> makes its css/js/images load
// from the main folder, even for a wrong address like /data/anything.
app.use((req, res) => {
  const home = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  res
    .status(404)
    .type("html")
    .send(home.replace(/<head>/i, '<head>\n  <base href="/">'));
});

// Errors (e.g. broken JSON in a request): answer with JSON instead of an HTML error page
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  const error =
    status === 413
      ? "The request is too large."
      : status === 400
        ? "The request isn't valid JSON."
        : "Something went wrong on the server.";
  res.status(status).json({ error });
});

// Feedback API

app.listen(PORT, () => {
  console.log(`Questify running at http://localhost:${PORT}`);
});
