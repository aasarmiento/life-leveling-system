// =====================================================================
// BACKGROUND MUSIC (Home at About)
// - Naka-OFF pagdating. Ikaw ang magbubukas gamit ang button sa kanan-taas.
// - Hover (o keyboard focus) sa button = lalabas ang volume slider sa kaliwa.
// - Tuloy-tuloy sa Home ↔ About: tinatandaan sa session na 'to kung naka-on
//   at kung nasaan na yung kanta. Ang volume, tinatandaan kahit bukas pa.
// - Sa About walang music HTML, kaya dito na ginagawa yung audio at button.
// =====================================================================
(function () {
  const VOLUME_KEY = "questify.music.volume"; // localStorage (0 hanggang 1)
  const STATE_KEY = "questify.music.state"; // sessionStorage: { on, time }
  const base = document.currentScript
    ? document.currentScript.src.replace(/js\/app\.js.*$/, "")
    : "";

  function load(storage, key) {
    try {
      return JSON.parse(window[storage].getItem(key));
    } catch (err) {
      return null;
    }
  }
  function save(storage, key, value) {
    try {
      window[storage].setItem(key, JSON.stringify(value));
    } catch (err) {
      /* naka-block ang storage: gagana pa rin, hindi lang matatandaan */
    }
  }

  let audio = document.getElementById("bg-music");
  let btn = document.getElementById("music-toggle");
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "bg-music";
    audio.loop = true;
    audio.preload = "auto";
    audio.src = base + "assets/audio/bg-music.mp3";
    document.body.appendChild(audio);
  }
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "music-toggle";
    btn.className = "music-btn";
    btn.innerHTML =
      '<svg class="icon-off" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>' +
      '<svg class="icon-on" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    document.body.appendChild(btn);
  }
  btn.setAttribute("aria-label", "Background music");

  // Button + volume slider sa iisang lalagyan (para hindi mawala ang hover sa pagitan)
  const ctl = document.createElement("div");
  ctl.className = "music-ctl";
  btn.before(ctl);
  ctl.appendChild(btn);
  ctl.insertAdjacentHTML(
    "afterbegin",
    `<div class="music-pop">
      <div class="music-pop-in">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>
        <input type="range" id="musicVolume" min="0" max="100" step="5" aria-label="Music volume">
        <span class="music-pct" aria-hidden="true"></span>
      </div>
    </div>`,
  );
  const slider = ctl.querySelector("#musicVolume");
  const pct = ctl.querySelector(".music-pct");

  const saved = load("localStorage", VOLUME_KEY);
  audio.volume = typeof saved === "number" && saved >= 0 && saved <= 1 ? saved : 0.6;

  function showVolume() {
    const p = Math.round(audio.volume * 100);
    slider.value = p;
    slider.style.setProperty("--v", p + "%");
    slider.setAttribute("aria-valuetext", p + " percent");
    pct.textContent = p + "%";
  }
  function showOn(on) {
    btn.setAttribute("aria-pressed", String(on));
    btn.title = on ? "Pause music" : "Play music";
  }
  // "wanted" = pinili ng user na naka-on (kahit na-block pa ng browser ang tunog)
  let wanted = false;
  function saveState() {
    save("sessionStorage", STATE_KEY, {
      on: wanted,
      time: audio.currentTime || 0,
    });
  }

  // Puwedeng i-block ng browser ang tunog hangga't wala pang click sa page.
  async function play() {
    wanted = true;
    if (audio.volume === 0) {
      audio.volume = 0.6;
      showVolume();
    }
    try {
      await audio.play();
      return true;
    } catch (err) {
      showOn(false);
      return false;
    }
  }

  audio.addEventListener("play", () => {
    showOn(true);
    saveState();
  });
  audio.addEventListener("pause", () => {
    showOn(false);
    saveState();
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (audio.paused) play();
    else {
      wanted = false;
      audio.pause();
    }
  });

  slider.addEventListener("input", () => {
    audio.volume = slider.value / 100;
    save("localStorage", VOLUME_KEY, audio.volume);
    showVolume();
    // Tinaas ang volume habang naka-off = gusto nang marinig. Sa 0 = patay.
    if (audio.volume > 0 && audio.paused) play();
    if (audio.volume === 0 && !audio.paused) {
      wanted = false;
      audio.pause();
    }
  });

  // Tandaan kung nasaan na yung kanta bago umalis sa page
  window.addEventListener("pagehide", saveState);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveState();
  });

  showVolume();
  showOn(false);

  // Galing sa kabilang page na naka-on ang music: ituloy.
  const state = load("sessionStorage", STATE_KEY);
  if (state && state.on) {
    const resume = () => {
      if (state.time) audio.currentTime = state.time;
      play().then((ok) => {
        if (ok) return;
        // Na-block ng browser: ituloy sa unang click o pindot sa page
        // (pero hindi sa music button mismo, siya na ang bahala doon).
        const onFirst = (e) => {
          if (ctl.contains(e.target)) return;
          document.removeEventListener("pointerdown", onFirst);
          document.removeEventListener("keydown", onFirst);
          play();
        };
        document.addEventListener("pointerdown", onFirst);
        document.addEventListener("keydown", onFirst);
      });
    };
    if (audio.readyState >= 1) resume();
    else audio.addEventListener("loadedmetadata", resume, { once: true });
  }
})();

// Level-up animation
(function () {
  const categories = [
    {
      name: "Work mastery",
      badgeImg: "assets/images/work.jpeg",
      badges: ["📝", "💻", "📊", "🎯"],
    },
    {
      name: "Learning mastery",
      badgeImg: "assets/images/learn.jpeg",
      badges: ["📖", "✍️", "🧠", "🎓"],
    },
    {
      name: "Health mastery",
      badgeImg: "assets/images/health.jpeg",
      badges: ["🏃", "🧘", "🍎", "😴"],
    },
  ];

  const iconBadge = document.getElementById("levelupIconBadge");
  const logoEl = document.getElementById("levelupLogo");
  const labelEl = document.getElementById("levelupLabel");
  const fillEl = document.getElementById("levelupFill");
  const percentEl = document.getElementById("levelupPercent");
  const leftBadges = document.querySelector(".left-badges");
  const rightBadges = document.querySelector(".right-badges");
  const logoWrap = document.querySelector(".levelup-logo-wrapper");

  // Stop if this section is missing on the page
  if (
    !logoEl ||
    !labelEl ||
    !fillEl ||
    !percentEl ||
    !leftBadges ||
    !rightBadges ||
    !logoWrap
  )
    return;

  let current = 0;
  let progress = 0;
  let animating = false;

  function renderBadges(icons) {
    leftBadges.innerHTML = "";
    rightBadges.innerHTML = "";

    icons.forEach((icon, i) => {
      const badge = document.createElement("div");
      badge.className = "levelup-badge";
      badge.textContent = icon;
      (i < 2 ? leftBadges : rightBadges).appendChild(badge);
    });
  }

  function setLogoImage(src) {
    // Put the JPEG inside the center circle
    logoEl.innerHTML = "";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.imageRendering = "pixelated";
    logoEl.appendChild(img);
  }

  function startCategory() {
    const cat = categories[current];

    progress = 0;
    fillEl.style.width = "0%";
    percentEl.textContent = "0%";
    labelEl.textContent = cat.name;

    // Floating badge above the card
    if (iconBadge) {
      iconBadge.classList.remove("show");
      iconBadge.src = cat.badgeImg;
      requestAnimationFrame(() => iconBadge.classList.add("show"));
    }

    // Center logo → JPEG
    logoEl.classList.remove("show");
    setLogoImage(cat.badgeImg);

    setTimeout(() => {
      logoEl.classList.add("show");
      logoWrap.classList.add("active");
    }, 150);

    renderBadges(cat.badges);
    document
      .querySelectorAll(".levelup-badge")
      .forEach((b) => b.classList.remove("visible"));

    animating = true;
    animate();
  }

  function animate() {
    if (!animating) return;

    progress += 0.7;

    if (progress >= 100) {
      animating = false;
      setTimeout(() => {
        logoWrap.classList.remove("active");
        if (iconBadge) iconBadge.classList.remove("show");
        current = (current + 1) % categories.length;
        startCategory(); // next category
      }, 700);
      return;
    }

    fillEl.style.width = progress + "%";
    percentEl.textContent = Math.floor(progress) + "%";

    // Reveal side badges at these % marks
    const thresholds = [18, 38, 58, 78];
    const badges = document.querySelectorAll(".levelup-badge");
    thresholds.forEach((t, i) => {
      if (progress >= t && badges[i]) badges[i].classList.add("visible");
    });

    requestAnimationFrame(animate);
  }

  // Start only when the section scrolls into view
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        startCategory();
        observer.disconnect();
      }
    },
    { threshold: 0.3 },
  );

  const section = document.querySelector(".progress-section");
  if (section) observer.observe(section);
})();
// Quest cards – select one and play its video
(function () {
  const items = document.querySelectorAll(".quest-item");
  if (!items.length) return;

  // Start with the first card selected
  if (!document.querySelector(".quest-item.selected")) {
    items[0].classList.add("selected");
  }

  function select(item) {
    items.forEach((i) => {
      i.classList.remove("selected");
      const v = i.querySelector("video");
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    });

    item.classList.add("selected");
    const video = item.querySelector("video");
    if (video) video.play().catch(() => {});
  }

  items.forEach((item) => {
    item.addEventListener("click", () => select(item));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(item);
      }
    });
  });
})();

// Demo XP system ("Try it" sa Home) – pareho ang numbers sa Tasks page:
// 125 XP per level, simula sa 1,450 XP = Level 12. Pang-demo lang 'to,
// walang sine-save at hindi nito ginagalaw yung totoong board.
(function () {
  const list = document.getElementById("demoTasks");
  if (!list) return;

  const XP_PER_TASK = 20;
  const XP_PER_LEVEL = 125;
  // Kinopya sa "Climb the ranks" section ng Home, para tugma
  const RANKS = [
    { name: "Novice", xp: 0 },
    { name: "Apprentice", xp: 100 },
    { name: "Adventurer", xp: 300 },
    { name: "Veteran", xp: 700 },
    { name: "Master", xp: 1500 },
  ];

  let total = 1450;
  let displayed = total;
  let countFrame = 0;
  let fillTimer = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const levelEl = document.getElementById("demoLevel");
  const rankEl = document.getElementById("demoRank");
  const fillEl = document.getElementById("demoFill");
  const xpEl = document.getElementById("demoXp");
  const pillEl = document.getElementById("demoPill");
  const forEl = document.getElementById("demoFor");
  const wrapEl = document.querySelector(".demo-bar-wrap");

  const levelOf = (t) => Math.floor(t / XP_PER_LEVEL) + 1;

  function stateFor(t) {
    return {
      level: levelOf(t),
      rank: RANKS.filter((r) => t >= r.xp).pop().name,
      pct: ((t % XP_PER_LEVEL) / XP_PER_LEVEL) * 100,
    };
  }

  // Ito yung text sa ilalim ng bar, hal. "1,450 XP · 50 XP to Level 13"
  function xpText(t) {
    const level = levelOf(t);
    return (
      t.toLocaleString("en-US") +
      " XP · " +
      (level * XP_PER_LEVEL - t) +
      " XP to Level " +
      (level + 1)
    );
  }

  let shown = stateFor(total);

  function countTo(from, to) {
    const start = performance.now();
    const dur = 450;
    cancelAnimationFrame(countFrame);

    (function step(now) {
      const p = reduceMotion.matches ? 1 : Math.min(1, (now - start) / dur);
      displayed = Math.round(from + (to - from) * p);
      xpEl.textContent = xpText(displayed);
      if (p < 1) countFrame = requestAnimationFrame(step);
    })(start);
  }

  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function setFill(pct, animate = true) {
    if (!animate) fillEl.style.transition = "none";
    fillEl.style.width = pct + "%";
    if (!animate) {
      void fillEl.offsetWidth;
      fillEl.style.transition = "";
    }
  }

  function popFloat(text, pct, neg) {
    const f = document.createElement("span");
    f.className = "xp-float" + (neg ? " neg" : "");
    f.textContent = text;
    f.style.left = Math.max(8, Math.min(92, pct)) + "%";
    wrapEl.appendChild(f);
    f.addEventListener("animationend", () => f.remove());
  }

  function render(next, change, name) {
    const leveledUp = next.level > shown.level;
    const leveledDown = next.level < shown.level;

    levelEl.textContent = "Level " + next.level;
    rankEl.textContent = next.rank;

    // Level up: punuin muna yung bar hanggang dulo, tapos balik sa zero.
    // Level down (nag-untick): ubusin yung bar, tapos ipakita yung laman ng dating level.
    clearTimeout(fillTimer);
    if ((leveledUp || leveledDown) && !reduceMotion.matches) {
      setFill(leveledUp ? 100 : 0);
      fillTimer = setTimeout(() => {
        setFill(leveledUp ? 0 : 100, false);
        setFill(next.pct);
      }, 600);
    } else {
      setFill(next.pct);
    }
    fillEl.classList.add("glow");
    setTimeout(() => fillEl.classList.remove("glow"), 600);

    countTo(displayed, total);

    if (change) {
      const neg = change < 0;
      pillEl.hidden = false;
      pillEl.textContent = (neg ? "−" : "+") + Math.abs(change) + " XP";
      pillEl.classList.toggle("neg", neg);
      forEl.textContent = leveledUp
        ? "Level up! for " + name
        : (neg ? "undid " : "for ") + name;
      restart(pillEl, "bump");
      if (!reduceMotion.matches) popFloat(pillEl.textContent, next.pct, neg);
    }

    if (leveledUp) restart(levelEl, "pop");
    if (next.rank !== shown.rank) restart(rankEl, "pop");

    shown = next;
  }

  list.addEventListener("change", (e) => {
    if (!e.target.matches(".demo-task input")) return;

    const label = e.target.closest(".demo-task");
    const name = label.querySelector("span").textContent;
    label.classList.toggle("done", e.target.checked);

    const before = total;
    total = Math.max(
      0,
      total + (e.target.checked ? XP_PER_TASK : -XP_PER_TASK),
    );
    render(stateFor(total), total - before, name);
  });

  const form = document.getElementById("demoAddForm");
  const input = document.getElementById("demoAddInput");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const label = document.createElement("label");
    label.className = "demo-task";

    const box = document.createElement("input");
    box.type = "checkbox";

    const span = document.createElement("span");
    span.textContent = text;

    label.append(box, document.createTextNode(" "), span);
    list.insertBefore(label, form);
    input.value = "";
  });

  levelEl.textContent = "Level " + shown.level;
  rankEl.textContent = shown.rank;
  setFill(shown.pct, false);
  xpEl.textContent = xpText(total);
})();

// Starry sky
(function () {
  const sky = document.querySelector(".sky");
  if (!sky) return;

  function add(cls, size) {
    const el = document.createElement("span");
    el.className = cls;
    el.style.left = Math.random() * 100 + "%";
    el.style.top = Math.random() * 100 + "%";
    el.style.animationDelay = (Math.random() * 5).toFixed(2) + "s";
    el.style.animationDuration = (2.5 + Math.random() * 3).toFixed(2) + "s";
    if (size) {
      el.style.width = size + "px";
      el.style.height = size + "px";
    }
    sky.appendChild(el);
  }

  for (let i = 0; i < 60; i++) add("star", Math.random() < 0.7 ? 2 : 3);
  for (let i = 0; i < 14; i++) add("spark");
})();

// =====================================================================
// FEEDBACK (Home): kailangan ng rating bago i-send. May salita ang stars
// (Poor → Excellent), optional na "What stood out?" tags, bilang ng letra,
// at footer. Pagka-send, papalitan ang form ng "receipt".
// Reference = FB-YYMMDD-XXXX (petsa + 4 na random na letra/numero, walang
// magkamukha gaya ng 0/O at 1/I). Naka-save lang sa browser (wala pang server).
// Hindi ginalaw ang index.html: dito na idinadagdag ang bagong parts.
// =====================================================================
(function () {
  const stars = document.querySelectorAll("#stars .star");
  const form = document.getElementById("feedbackForm");
  if (!stars.length || !form) return;

  const starBox = document.getElementById("stars");
  const comment = form.querySelector("textarea");
  const sendBtn = document.getElementById("feedbackBtn");
  const FEEDBACK_KEY = "questify.feedback";
  const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const TAGS = ["Quest board", "XP and levels", "Design", "Music", "Easy to use"];
  const MAX_COMMENT = 500;
  const MONTHS_LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON_ALERT = '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>';
  const ICON_CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
  const ICON_LOCK = '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
  const ICON_COPY =
    '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>';
  const STAR_PATH =
    '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.5 1.1 6.3L12 17.3l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/>';

  let rating = 0; // wala pang napipili (dati 4 agad, kaya hindi na-check)

  // --- Stars + salita sa tabi (hal. "Great") ---
  const rate = document.createElement("div");
  rate.className = "fb-rate";
  starBox.before(rate);
  rate.appendChild(starBox);
  const word = document.createElement("span");
  word.className = "fb-word";
  word.setAttribute("aria-live", "polite");
  rate.appendChild(word);

  function showWord(v) {
    word.textContent = v ? WORDS[v] : "Select a rating";
    word.classList.toggle("dim", !v);
  }
  const paint = (v) => {
    stars.forEach((s) => s.classList.toggle("on", Number(s.dataset.v) <= v));
    showWord(v);
  };
  const markChosen = () =>
    stars.forEach((s) => {
      const v = Number(s.dataset.v);
      s.setAttribute("aria-pressed", String(v === rating));
      s.setAttribute("aria-label", `${v} star${v > 1 ? "s" : ""}, ${WORDS[v]}`);
    });

  // Error sa ilalim ng stars (hindi popup)
  const err = document.createElement("p");
  err.className = "fb-err";
  err.id = "ratingErr";
  err.setAttribute("role", "alert");
  err.hidden = true;
  err.innerHTML = icon(ICON_ALERT) + "<span>Choose a rating from 1 to 5 stars.</span>";
  rate.after(err);

  function showError(on) {
    err.hidden = !on;
    starBox.classList.toggle("invalid", on);
  }

  stars.forEach((s) => {
    s.addEventListener("click", () => {
      rating = Number(s.dataset.v);
      paint(rating);
      markChosen();
      showError(false);
    });
    s.addEventListener("mouseenter", () => paint(Number(s.dataset.v)));
    s.addEventListener("mouseleave", () => paint(rating));
  });

  // --- "What stood out?" (optional na tags) ---
  const commentLabel = form.querySelector('label[for="comment"]');
  const tagBlock = document.createElement("div");
  tagBlock.className = "fb-block";
  tagBlock.innerHTML =
    '<span class="field-label" id="fbTagsLabel">What stood out? <small>optional</small></span>' +
    `<div class="fb-tags" role="group" aria-labelledby="fbTagsLabel">${TAGS.map(
      (t) =>
        `<button type="button" class="fb-tag" aria-pressed="false">${icon(ICON_CHECK)}${t}</button>`,
    ).join("")}</div>`;
  commentLabel.before(tagBlock);
  const tagBtns = [...tagBlock.querySelectorAll(".fb-tag")];
  tagBtns.forEach((b) =>
    b.addEventListener("click", () =>
      b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")),
    ),
  );
  const chosenTags = () =>
    tagBtns.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent);

  // --- Comment: "(optional)", bilang ng letra, at paalala ---
  commentLabel.insertAdjacentHTML("beforeend", " <small>optional</small>");
  comment.maxLength = MAX_COMMENT;
  const help = document.createElement("div");
  help.className = "fb-help";
  help.id = "fbHelp";
  help.innerHTML =
    '<span>Please don\'t include passwords or personal details.</span><span class="fb-count"></span>';
  comment.after(help);
  comment.setAttribute("aria-describedby", "fbHelp");
  const count = help.querySelector(".fb-count");
  const updateCount = () => (count.textContent = `${comment.value.length} / ${MAX_COMMENT}`);
  comment.addEventListener("input", updateCount);

  // --- Footer: privacy note sa kaliwa, button sa kanan ---
  const foot = document.createElement("div");
  foot.className = "fb-foot";
  foot.innerHTML = `<small>${icon(ICON_LOCK)}Saved in this browser only.</small>`;
  form.appendChild(foot);
  foot.appendChild(sendBtn);

  paint(0);
  markChosen();
  updateCount();

  function makeRef(d) {
    const pad = (n) => String(n).padStart(2, "0");
    const rnd = new Uint8Array(4);
    crypto.getRandomValues(rnd);
    const tail = [...rnd].map((b) => REF_CHARS[b % REF_CHARS.length]).join("");
    return `FB-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${tail}`;
  }

  function sentText(d) {
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, "0");
    return `Sent ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${h}:${m} ${d.getHours() < 12 ? "AM" : "PM"}`;
  }

  function saveEntry(entry) {
    try {
      const list = JSON.parse(localStorage.getItem(FEEDBACK_KEY));
      const all = Array.isArray(list) ? list : [];
      all.unshift(entry);
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all.slice(0, 20)));
    } catch (e) {
      /* naka-block ang storage: lalabas pa rin ang receipt */
    }
  }

  function resetForm() {
    rating = 0;
    paint(0);
    markChosen();
    showError(false);
    tagBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
    comment.value = "";
    updateCount();
  }

  function showReceipt(entry) {
    const d = new Date(entry.at);
    const starsHtml = [1, 2, 3, 4, 5]
      .map((v) => `<svg viewBox="0 0 24 24" class="${v <= entry.rating ? "" : "off"}" aria-hidden="true">${STAR_PATH}</svg>`)
      .join("");
    const card = document.createElement("div");
    card.className = "feedback-form fb-receipt";
    card.setAttribute("tabindex", "-1");
    card.setAttribute("aria-labelledby", "fbReceiptTitle");
    card.innerHTML = `
      <div class="rc-head">
        <span class="rc-ico">${icon(ICON_CHECK)}</span>
        <div><b id="fbReceiptTitle">Feedback received</b><small>${sentText(d)}</small></div>
      </div>
      <dl class="rc-rows">
        <div class="rc-row"><dt>Rating</dt><dd><span class="rc-stars">${starsHtml}<span>${WORDS[entry.rating]} · ${entry.rating} of 5</span></span></dd></div>
        ${entry.tags.length ? `<div class="rc-row"><dt>Stood out</dt><dd>${entry.tags.map(esc).join(", ")}</dd></div>` : ""}
        <div class="rc-row"><dt>Message</dt><dd>${entry.message ? esc(entry.message) : '<span class="rc-none">No message</span>'}</dd></div>
        <div class="rc-row"><dt>Reference</dt><dd><span class="rc-ref"><code>${entry.ref}</code><button type="button" class="rc-copy">${icon(ICON_COPY)}<span>Copy</span></button></span></dd></div>
      </dl>
      <div class="rc-foot"><small>Saved in this browser.</small><button type="button" class="rc-again">Send another response</button></div>`;

    card.querySelector(".rc-copy").addEventListener("click", (e) => {
      const label = e.currentTarget.querySelector("span");
      const done = (text) => {
        label.textContent = text;
        setTimeout(() => (label.textContent = "Copy"), 2000);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(entry.ref).then(
          () => done("Copied"),
          () => done("Copy failed"),
        );
      } else done("Copy failed");
    });
    card.querySelector(".rc-again").addEventListener("click", () => {
      card.remove();
      resetForm();
      form.hidden = false;
      stars[0].focus();
    });

    form.hidden = true;
    form.after(card);
    card.focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!rating) {
      showError(true);
      stars[0].focus();
      return;
    }
    const entry = {
      ref: makeRef(new Date()),
      rating,
      tags: chosenTags(),
      message: comment.value.trim(),
      at: Date.now(),
    };
    saveEntry(entry);
    showReceipt(entry);
  });
})();

(function () {
  const items = document.querySelectorAll(".faq-list details");
  items.forEach((d) => {
    d.addEventListener("toggle", () => {
      if (d.open) {
        items.forEach((o) => {
          if (o !== d) o.open = false;
        });
      }
    });
  });
})();

(function () {
  const wrap = document.getElementById("mascotFxWrap");
  const video = document.getElementById("mascotVideo");
  if (!wrap || !video) return;

  video.addEventListener("error", () => wrap.classList.add("is-fallback"));
  video.play().catch(() => wrap.classList.add("is-fallback"));
})();

/*
   ABOUT THE TEAM on the about pages */
(function initAboutTeam() {
  const grid = document.getElementById("team2-grid");
  if (!grid) return; // not on the about page

  const TEAM_MEMBERS = [
    {
      id: "abigail",
      name: "Abigail Ann Sarmiento",
      role: "UI/UX design",
      image: "../assets/icons/06-about/gail.jpg",
      desc: "Shapes how Questify looks and feels across every page, from the landing screen to the quest board.",
      workedShort: "Landing page, style guide, component layout",
      bio: "A designer student/ video editor / Ai prompt engineer who treats interfaces like game HUDsclear feedback, readable progress, and no wasted clicks. Abigail keeps the visual system consistent so the product feels like one world instead of five different pages.",
      hobbies:
        "Pixel art, strength training, baking, hiking, writing short game design notes",
      favorite:
        "The level-up moment when the bar fills and the rank finally changes",
      games: "League of Legends, Dota 2, Ragnarok , Valorant",
      quote: "If progress is invisible, people stop believing it happened.",
      github: "https://github.com/aasarmiento",
      linkedin: "aasarmiento",
    },
    {
      id: "christian",
      name: "Christian Allen Soriano",
      role: "Project manager",
      image: "../assets/icons/06-about/team-christian.png",
      desc: "Keeps scope honest, runs check-ins, and makes sure the team ships what we promised.",
      workedShort: "Scope plan, task breakdown, weekly reviews",
      bio: "Balances student deadlines with product deadlines. Christian turns vague ideas into weekly goals and cuts features that sound cool but do not serve the core loop: log effort, earn XP, see the level climb.",
      hobbies: "Basketball, anime, thrifting, weekend road trips",
      favorite: "Closing a milestone on time without the team burning out",
      games: "Mobile Legends, FIFA, Minecraft",
      quote: "A plan only counts when someone owns the next deadline.",
      github: "#",
      linkedin: "#",
    },
    {
      id: "jeremiah",
      name: "Jeremiah Alzona",
      role: "Documentation",
      image: "../assets/icons/06-about/team-jeremiah.png",
      desc: "Writes down decisions, workflows, and About copy so nothing important lives only in group chat.",
      workedShort: "Workflow worksheet, About page, process notes",
      bio: "Believes documentation is part of the build, not an afterthought. Jeremiah connects classroom requirements to the product story—why we log effort, how ranks work, and what each screen is for.",
      hobbies: "Reading manga, journaling, cycling, coffee brewing",
      favorite:
        "When the About page finally explains the project in one clear pass",
      games: "Persona 5, Chess.com, Among Us",
      quote: "If it is not written down, it did not really happen.",
      github: "#",
      linkedin: "#",
    },
    {
      id: "rowel",
      name: "Rowel Jepsani",
      role: "Documentation",
      image: "../assets/icons/06-about/team-rowel.png",
      desc: "Gathers references, organizes assets, and keeps design and content notes easy to find.",
      workedShort: "Asset research, icon set, reference library",
      bio: "Mixes research habits from class with a collector’s instinct from gaming—screenshots, icons, and style notes sorted so the team can reuse them instead of starting from zero every week.",
      hobbies: "Photography, sketching, board games, swimming",
      favorite:
        "Finding the right reference on the first try and saving the team an hour",
      games: "Animal Crossing, Overwatch 2, Tetris",
      quote: "Good references save more time than sudden inspiration.",
      github: "#",
      linkedin: "#",
    },
    {
      id: "sire",
      name: "Sire Manalo",
      role: "GitHub lead",
      image: "../assets/icons/06-about/team-sire.png",
      desc: "Owns the repository, reviews merges, and keeps the main branch stable for the whole team.",
      workedShort: "Repo setup, merge reviews, branch hygiene",
      bio: "Treats version control like a party raid: clear roles, clean commits, and no one merging chaos into main. Sire makes sure student work stays recoverable, reviewable, and ready to present.",
      hobbies: "Building PCs, running, badminton, video editing",
      favorite: "A clean merge with zero conflicts after a long feature branch",
      games: "League of Legends, Counter-Strike 2, Rocket League",
      quote: "Commit small, commit often, and leave the main branch playable.",
      github: "#",
      linkedin: "#",
    },
  ];

  function teamCardHTML(m) {
    return `
      <div class="team2-bust-wrap">
        <img class="team2-bust" src="${m.image}" alt="">
      </div>
      <div class="team2-body">
        <p class="team2-name">${m.name}</p>
        <p class="team2-role">${m.role}</p>
        <p class="team2-desc">${m.desc}</p>
        <p class="team2-worked">Worked on: ${m.workedShort}</p>
        <button class="team2-view-btn" type="button" tabindex="-1">View profile</button>
      </div>
    `;
  }

  function openTeamModal(id) {
    const m = TEAM_MEMBERS.find((x) => x.id === id);
    if (!m) return;

    document.getElementById("team2-modal-bust").src = m.image;
    document.getElementById("team2-modal-name").textContent = m.name;
    document.getElementById("team2-modal-role").textContent = m.role;
    document.getElementById("team2-modal-bio").textContent = m.bio;
    document.getElementById("team2-modal-hobbies").textContent = m.hobbies;
    document.getElementById("team2-modal-favorite").textContent = m.favorite;
    document.getElementById("team2-modal-games").textContent = m.games;
    document.getElementById("team2-modal-quote").textContent = m.quote;
    document.getElementById("team2-modal-github").href = m.github;
    document.getElementById("team2-modal-linkedin").href = m.linkedin;

    document.getElementById("team2-overlay").classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeTeamModal() {
    document.getElementById("team2-overlay").classList.remove("active");
    document.body.style.overflow = "";
  }

  // render cards
  TEAM_MEMBERS.forEach((m) => {
    const card = document.createElement("article");
    card.className = "team2-card";
    card.innerHTML = teamCardHTML(m);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", () => openTeamModal(m.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openTeamModal(m.id);
      }
    });
    grid.appendChild(card);
  });

  // close handlers
  const closeBtn = document.getElementById("team2-modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeTeamModal);

  document.getElementById("team2-overlay").addEventListener("click", (e) => {
    if (e.target.id === "team2-overlay") closeTeamModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeTeamModal();
  });
})();
