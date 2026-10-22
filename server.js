const express = require("express");
const path = require("path");

// open the SQLite database (creates the tables + demo account on first start)
require("./db/db");


const app = express();
const PORT = process.env.PORT || 3000;

//feedback route module import
const feedbackRoutes = require("./routes/feedback");
// accounts + sign in routes (signup, signin, me, signout)
const authRoutes = require("./routes/auth");
// Quest Board routes (GET /api/board, PUT /api/board)
const boardRoutes = require("./routes/board");

// Parse JSON request bodies (1 MB: room for a full board of 500 quests)
app.use(express.json({ limit: "1mb" }));

// Serve front-end assets with .html extension support for /pages
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/pages", express.static(path.join(__dirname, "pages"), { extensions: ["html"] }));
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
  res.sendFile("index.html", {root: __dirname });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "questify" });
});

// Unknown /api addresses answer with JSON (the pages read JSON, not the Home page)
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// 404 Fallback
app.use((req, res) => {
  res.status(404).sendFile("index.html", { root: __dirname });
});

// Errors (e.g. broken JSON in a request): answer with JSON instead of an HTML error page
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  const error =
    status === 413 ? "The request is too large."
    : status === 400 ? "The request isn't valid JSON."
    : "Something went wrong on the server.";
  res.status(status).json({ error });
});

// Feedback API


app.listen(PORT, () => {
  console.log(`Questify running at http://localhost:${PORT}`);
});