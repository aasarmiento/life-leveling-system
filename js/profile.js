// =====================================================================
// PROFILE (pages/profile.html) — GUIDE PARA SA TEAM
// ---------------------------------------------------------------------
// Pinupuno ang design ni Abigail gamit ang TOTOONG data ng naka-sign in:
// yung board na sine-save ng Tasks page (tasks.js). Walang ginagalaw sa
// layout; papalitan lang ang mga sample na numero at text.
//   - Level, rank, XP bar, "XP to Level N"
//   - Quests done, completion %, day streak, quests this week
//   - Quests by category, recent activity
//   - XP chart (7 days / 30 days / All time)
//   - Current rank, badges
//   - Your data: Export (download backup) at Import (ibalik mula sa backup)
// =====================================================================
document.addEventListener("DOMContentLoaded", function () {
  const XP_PER_LEVEL = 125; // pareho sa tasks.js at nav.js
  const DEMO_XP = 1450;
  const RANKS = [
    { name: "Novice", xp: 0 },
    { name: "Apprentice", xp: 100 },
    { name: "Adventurer", xp: 300 },
    { name: "Veteran", xp: 700 },
    { name: "Master", xp: 1500 },
  ];
  const CATS = [
    { key: "work", label: "Work", cls: "work" },
    { key: "growth", label: "Learning", cls: "learning" },
    { key: "health", label: "Health", cls: "health" },
  ];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DAY_MS = 86400000;

  const ACCOUNT = window.questifyAccount || { boardKey: "questify.board.v1", isDemo: true };
  const $ = (s) => document.querySelector(s);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => n.toLocaleString("en-US");
  const pad = (n) => String(n).padStart(2, "0");
  const dayStart = (ms) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  // ---------- data (yung naka-save ng Tasks page) ----------
  function loadBoard() {
    try {
      const b = JSON.parse(localStorage.getItem(ACCOUNT.boardKey));
      if (b && Array.isArray(b.quests) && Array.isArray(b.xp)) return b;
    } catch (err) {
      /* sira o naka-block: parang bagong board */
    }
    // Demo na hindi pa nabubuksan ang Tasks: gawin na ang parehong sample board
    // (at i-save), para tugma ang Level 12 sa quests, streak at charts
    if (ACCOUNT.isDemo && window.questifyDemoBoard) {
      const demo = window.questifyDemoBoard();
      try {
        localStorage.setItem(ACCOUNT.boardKey, JSON.stringify(demo));
      } catch (err) {
        /* naka-block: ipakita pa rin */
      }
      return demo;
    }
    return null;
  }
  function loadPlayer() {
    try {
      return JSON.parse(localStorage.getItem("questify.player")) || {};
    } catch (err) {
      return {};
    }
  }

  const board = loadBoard();
  const quests = board ? board.quests : [];
  const total = board
    ? board.xp.reduce((sum, e) => sum + (Number(e.xp) || 0), 0)
    : ACCOUNT.isDemo
      ? DEMO_XP
      : 0;
  const done = quests
    .filter((q) => q.status === "done" && typeof q.completed === "number")
    .sort((a, b) => b.completed - a.completed);
  const level = Math.floor(total / XP_PER_LEVEL) + 1;
  const rank = RANKS.filter((r) => total >= r.xp).pop().name;
  const into = total % XP_PER_LEVEL;
  const toNext = XP_PER_LEVEL - into;
  const player = loadPlayer();

  // ---------- header ----------
  const h1 = $(".p-head h1");
  if (h1 && player.name) h1.textContent = player.name;
  const lvl = $(".p-head .lvl");
  if (lvl) lvl.textContent = `Level ${level} · ${rank}`;
  const avatarBox = $(".p-head .avatar-box");
  if (avatarBox) {
    const which = player.avatar === "gold" ? "gold" : "lime";
    avatarBox.innerHTML = `<img src="../assets/avatars/avatar-${which}-slime-256.png" alt="">`;
    avatarBox.classList.add("has-avatar");
  }

  // ---------- XP bar ----------
  const xpCard = $(".xp-card");
  if (xpCard) {
    xpCard.querySelector("h2").textContent = `XP into Level ${level + 1}`;
    const track = xpCard.querySelector(".xp-track");
    track.setAttribute("aria-valuemax", String(XP_PER_LEVEL));
    track.setAttribute("aria-valuenow", String(into));
    track.setAttribute("aria-label", `XP into Level ${level + 1}`);
    xpCard.querySelector(".xp-fill").style.width = (into / XP_PER_LEVEL) * 100 + "%";
    const facts = xpCard.querySelectorAll(".xp-facts span");
    if (facts[0]) facts[0].textContent = `${fmt(total)} XP`;
    if (facts[1]) facts[1].textContent = `${done.length} quest${done.length === 1 ? "" : "s"} done`;
    if (facts[2]) facts[2].textContent = `${toNext} XP to Level ${level + 1}`;
  }

  // ---------- stat cards ----------
  // Streak = ilang sunod-sunod na araw (hanggang ngayon o kahapon) na may natapos na quest
  function streakDays() {
    const days = new Set(done.map((q) => dayStart(q.completed)));
    let day = dayStart(Date.now());
    if (!days.has(day)) day -= DAY_MS; // hindi pa putol kung kahapon ang huli
    let n = 0;
    while (days.has(day)) {
      n++;
      day = dayStart(day - DAY_MS / 2); // ligtas kahit may daylight saving
    }
    return n;
  }
  const streak = streakDays();
  const weekAgo = dayStart(Date.now()) - 6 * DAY_MS;
  const thisWeek = done.filter((q) => q.completed >= weekAgo);
  const completion = quests.length ? Math.round((done.length / quests.length) * 100) : 0;
  const stats = document.querySelectorAll(".stat-card .val");
  const statVals = [
    fmt(done.length),
    completion + "%",
    `${streak} day${streak === 1 ? "" : "s"}`,
    fmt(thisWeek.length),
  ];
  stats.forEach((el, i) => {
    if (statVals[i] !== undefined) el.textContent = statVals[i];
  });

  // ---------- quests by category (Month / Year, parang GitHub) ----------
  // Isang row bawat category, isang square bawat araw (Month) o bawat buwan (Year).
  // Mas maliwanag = mas maraming quest. Laging batay sa petsa ngayon, kaya kusang
  // napupuno habang lumilipas ang araw, at bagong grid pagpasok ng bagong buwan.
  const catCard = $(".extra-grid .card");
  if (catCard) {
    const CAT_RGB = { work: "216, 178, 74", growth: "143, 169, 192", health: "176, 80, 95" };
    const LEVEL_ALPHA = [0, 0.45, 0.75, 1];
    const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let catView = "month";

    catCard.classList.add("cat-card");
    catCard.innerHTML = `
      <div class="week-head">
        <div>
          <h2>Quests by category</h2>
          <p class="page-kicker cg-kicker"></p>
        </div>
        <div class="chips" role="group" aria-label="Category range">
          <button type="button" class="chip active" data-view="month" aria-pressed="true">Month</button>
          <button type="button" class="chip" data-view="year" aria-pressed="false">Year</button>
        </div>
      </div>
      <div class="cg-rows"></div>
      <div class="cg-legend">
        ${CATS.map((c) => `<span class="cg-key"><i style="background:rgb(${CAT_RGB[c.key]})"></i>${c.label}</span>`).join("")}
        <span class="cg-scale" aria-hidden="true"><span>Less</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>More</span></span>
      </div>
      <p class="bar-sum bar-total"><span class="cg-total-label"></span><span class="cg-total"></span></p>`;

    function paintCategories() {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const isMonth = catView === "month";
      const slots = isMonth ? new Date(y, m + 1, 0).getDate() : 12;
      const nowSlot = isMonth ? now.getDate() - 1 : m;
      const counts = CATS.map(() => Array(slots).fill(0));
      done.forEach((q) => {
        const d = new Date(q.completed);
        if (d.getFullYear() !== y || (isMonth && d.getMonth() !== m)) return;
        const ci = CATS.findIndex((c) => c.key === q.cat);
        if (ci >= 0) counts[ci][isMonth ? d.getDate() - 1 : d.getMonth()]++;
      });
      // Liwanag: Month = 1, 2, 3+ quests sa isang araw; Year = 1-5, 6-12, 13+ sa isang buwan
      const level = (v) => (!v ? 0 : isMonth ? Math.min(v, 3) : v <= 5 ? 1 : v <= 12 ? 2 : 3);
      const slotName = (i) => (isMonth ? `${MONTHS[m]} ${i + 1}` : `${MONTHS_LONG[i]}`);

      let total = 0;
      const rows = CATS.map((c, ci) => {
        const row = counts[ci];
        const n = row.reduce((a, b) => a + b, 0);
        total += n;
        const cells = row
          .map((v, i) => {
            const cls = i > nowSlot ? "cg-cell future" : "cg-cell";
            const bg = v ? ` style="background:rgba(${CAT_RGB[c.key]}, ${LEVEL_ALPHA[level(v)]})"` : "";
            return `<i class="${cls}"${bg} title="${slotName(i)}: ${v} ${c.label} quest${v === 1 ? "" : "s"}"></i>`;
          })
          .join("");
        return `<div class="cg-row">
          <span class="cg-name">${c.label}</span>
          <div class="cg-cells${isMonth ? "" : " year"}" style="grid-template-columns:repeat(${slots},1fr)" role="img" aria-label="${c.label}: ${n} quest${n === 1 ? "" : "s"} ${isMonth ? "this month" : "this year"}">${cells}</div>
          <span class="cg-count">${fmt(n)}</span>
        </div>`;
      }).join("");

      const axis = isMonth
        ? `<div class="cg-axis-days"><span>${MONTHS[m]} 1</span><span>8</span><span>15</span><span>22</span><span>${slots}</span></div>`
        : `<div class="cg-axis-months" style="grid-template-columns:repeat(12,1fr)">${MONTHS.map((mn) => `<span>${mn[0]}</span>`).join("")}</div>`;

      catCard.querySelector(".cg-rows").innerHTML =
        rows + `<div class="cg-row cg-axis"><span></span>${axis}<span></span></div>`;
      catCard.querySelector(".cg-kicker").textContent = isMonth
        ? `${MONTHS_LONG[m]} ${y}, one square per day.`
        : `${y}, one square per month.`;
      catCard.querySelector(".cg-total-label").textContent = `Completed in ${isMonth ? MONTHS_LONG[m] : y}`;
      catCard.querySelector(".cg-total").textContent = fmt(total);
    }

    catCard.querySelector(".chips").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn || btn.dataset.view === catView) return;
      catView = btn.dataset.view;
      catCard.querySelectorAll("[data-view]").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      paintCategories();
    });
    paintCategories();
  }

  // ---------- recent activity ----------
  const list = $(".activity-list");
  if (list) {
    const shortDate = (ms) => {
      const d = new Date(ms);
      return MONTHS[d.getMonth()] + " " + pad(d.getDate());
    };
    // Hanggang 20 pinakabago; kita ang mga 5, scroll para sa mas luma
    list.innerHTML = done.length
      ? done
          .slice(0, 20)
          .map(
            (q) =>
              `<div class="activity"><span class="when">${shortDate(q.completed)}</span><span class="what">${esc(q.title)}</span><span class="xp">+${q.earned} XP</span></div>`,
          )
          .join("")
      : '<div class="activity"><span class="what">No finished quests yet. Mark a quest done on your board.</span></div>';
  }

  // ---------- XP chart (7 days / 30 days / All time) ----------
  const weekCard = $(".week-card");
  function buckets(range) {
    const today = dayStart(Date.now());
    if (range === 7) {
      return Array.from({ length: 7 }, (_, i) => {
        const start = today - (6 - i) * DAY_MS;
        const d = new Date(start);
        return { start, end: start + DAY_MS, label: DAYS[d.getDay()], long: DAYS_LONG[d.getDay()] };
      });
    }
    if (range === 30) {
      // 5 bars, 6 araw bawat isa, hanggang ngayon
      // label = "Sep 23–28" (o "Aug 30–Sep 4" kung tumawid ng buwan)
      return Array.from({ length: 5 }, (_, i) => {
        const start = today - (29 - i * 6) * DAY_MS;
        const a = new Date(start);
        const b = new Date(start + 5 * DAY_MS);
        const label =
          a.getMonth() === b.getMonth()
            ? `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}`
            : `${MONTHS[a.getMonth()]} ${a.getDate()}–${MONTHS[b.getMonth()]} ${b.getDate()}`;
        return { start, end: start + 6 * DAY_MS, label, long: label };
      });
    }
    // All time: bawat buwan, huling 6 na buwan
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const long = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      return { start: d.getTime(), end: e.getTime(), label: MONTHS[d.getMonth()], long };
    });
  }
  const RANGE_TITLE = { 7: "XP this week", 30: "XP in the last 30 days", all: "XP over time" };
  function paintChart(range) {
    if (!weekCard) return;
    const bs = buckets(range === "all" ? "all" : range).map((b) => ({
      ...b,
      xp: done.filter((q) => q.completed >= b.start && q.completed < b.end).reduce((s, q) => s + (q.earned || 0), 0),
    }));
    const sum = bs.reduce((s, b) => s + b.xp, 0);
    const max = Math.max(...bs.map((b) => b.xp));
    const peak = max > 0 ? bs.find((b) => b.xp === max) : null;
    weekCard.querySelector("h2").textContent = RANGE_TITLE[range];
    weekCard.querySelector(".week-head .page-kicker").textContent = sum
      ? `${fmt(sum)} XP earned. ${peak.long} was the peak.`
      : "No XP earned in this period yet.";
    const chart = weekCard.querySelector(".week-chart");
    chart.style.gridTemplateColumns = `repeat(${bs.length}, 1fr)`; // puno ang lapad
    chart.innerHTML = bs
      .map((b) => {
        const h = max ? Math.max(4, Math.round((b.xp / max) * 100)) : 4;
        return `<div class="col${peak === b ? " peak" : ""}" role="img" aria-label="${b.long}, ${b.xp} XP">
            <div class="bar" style="height: ${h}%"><span class="num">${b.xp}</span></div>
            <span class="day">${b.label}</span>
          </div>`;
      })
      .join("");
  }
  if (weekCard) {
    const chips = [...weekCard.querySelectorAll(".chips .chip")];
    const ranges = [7, 30, "all"];
    chips.forEach((chip, i) =>
      chip.addEventListener("click", () => {
        chips.forEach((c) => {
          c.classList.toggle("active", c === chip);
          c.setAttribute("aria-pressed", String(c === chip));
        });
        paintChart(ranges[i]);
      }),
    );
    paintChart(7);
  }

  // ---------- ranks ----------
  document.querySelectorAll(".rank-badge-grid .rank-list .rank").forEach((li) => {
    const on = li.querySelector("span").textContent.trim() === rank;
    li.classList.toggle("current", on);
    if (on) li.setAttribute("aria-current", "true");
    else li.removeAttribute("aria-current");
  });

  // ---------- badges (totoong progress) ----------
  const badgeBox = $(".badges");
  if (badgeBox) {
    const earlyBirds = done.filter((q) => new Date(q.completed).getHours() < 9).length;
    const BADGES = [
      { name: "Level 10", have: level, need: 10, unit: "levels" },
      { name: "7-day streak", have: streak, need: 7, unit: "days in a row" },
      { name: "Deep week", have: thisWeek.reduce((s, q) => s + (q.earned || 0), 0), need: 150, unit: "XP in 7 days" },
      { name: "Early bird", have: earlyBirds, need: 5, unit: "quests done before 9 AM" },
      { name: "Century", have: done.length, need: 100, unit: "quests" },
    ];
    badgeBox.innerHTML = BADGES.map((b) => {
      const have = Math.min(b.have, b.need);
      if (b.have >= b.need) {
        return `<div class="badge earned"><div class="badge-top"><span class="b-ico" aria-hidden="true">★</span><span class="b-name">${b.name}</span></div><span class="b-status">Earned</span></div>`;
      }
      return `<div class="badge locked"><div class="badge-top"><span class="b-ico" aria-hidden="true">🔒</span><span class="b-name">${b.name}</span></div>
        <div class="mini-track" role="progressbar" aria-valuemin="0" aria-valuemax="${b.need}" aria-valuenow="${have}" aria-label="${b.name} progress"><div class="mini-fill" style="width: ${(have / b.need) * 100}%"></div></div>
        <span class="b-progress">${fmt(have)} of ${fmt(b.need)} ${b.unit}</span></div>`;
    }).join("");
  }

  // ---------- empty state (bagong account) ----------
  const empty = $(".empty-state");
  if (empty) {
    const label = empty.querySelector(".empty-label");
    if (label) label.remove(); // note lang ito sa design, hindi para sa user
  }
  // Yung "Screen reader table: ..." sa ilalim ng chart ay note din sa design
  const chartNote = $(".chart-note");
  if (chartNote) chartNote.remove();
  if (empty) {
    empty.hidden = done.length > 0;
  }

  // ---------- your data: Export / Import ----------
  const dataCard = $(".data-card");
  if (dataCard) {
    const [exportBtn, importBtn] = dataCard.querySelectorAll(".data-actions button");
    const errMsg = dataCard.querySelector(".msg-error");
    const hint = dataCard.querySelector(".msg-hint");
    const say = (text, bad) => {
      errMsg.textContent = text;
      errMsg.hidden = !text;
      errMsg.classList.toggle("ok", !bad);
    };
    say("", false); // yung "Error example" sa design ay halimbawa lang

    exportBtn.addEventListener("click", () => {
      const data = {
        app: "questify",
        version: 1,
        exported: new Date().toISOString(),
        board: loadBoard() || { quests: [], xp: [], nextId: 1 },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      const d = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = `questify-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      say("Backup saved to your downloads.", false);
    });

    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "application/json,.json";
    picker.hidden = true;
    dataCard.appendChild(picker);
    importBtn.addEventListener("click", () => picker.click());

    const validQuest = (q) =>
      q && typeof q.id === "string" && typeof q.title === "string" && typeof q.desc === "string" &&
      ["todo", "doing", "done"].includes(q.status) && ["work", "growth", "health"].includes(q.cat) &&
      ["low", "medium", "high"].includes(q.priority) && typeof q.due === "string" &&
      typeof q.added === "number" && typeof q.rank === "number";
    picker.addEventListener("change", () => {
      const file = picker.files[0];
      picker.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let data = null;
        try {
          data = JSON.parse(reader.result);
        } catch (err) {
          data = null;
        }
        const b = data && data.app === "questify" && data.board;
        const ok =
          b && Array.isArray(b.quests) && b.quests.every(validQuest) &&
          Array.isArray(b.xp) && b.xp.every((e) => e && Number.isFinite(e.xp));
        if (!ok) {
          say("That file isn't a Questify backup. Nothing was changed.", true);
          return;
        }
        try {
          localStorage.setItem(ACCOUNT.boardKey, JSON.stringify(b));
        } catch (err) {
          say("Your browser blocked saving. Nothing was changed.", true);
          return;
        }
        say(`Imported ${b.quests.length} quest${b.quests.length === 1 ? "" : "s"}. Reloading…`, false);
        setTimeout(() => location.reload(), 900);
      };
      reader.readAsText(file);
    });
    if (hint) hint.textContent = "Import checks the file first. It replaces this account's board.";
  }
});
