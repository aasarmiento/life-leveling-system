// Background music – starts on first interaction
const bgMusic = document.getElementById("bg-music");
const musicToggle = document.getElementById("music-toggle");
let musicPlaying = false;
let hasInteracted = false;

if (bgMusic && musicToggle) {
  // Yung icon ng sound button (naka-mute o tumutugtog) ay nakabase sa aria-pressed.
  // Si CSS (.music-btn) na bahala kung aling speaker icon ang lalabas.
  const showMusicState = (on) => {
    musicToggle.setAttribute("aria-pressed", String(on));
    musicToggle.title = on ? "Mute music" : "Play music";
  };

  const startMusicOnFirstInteraction = async () => {
    if (hasInteracted) return;
    hasInteracted = true;

    try {
      bgMusic.muted = false;
      await bgMusic.play();
      musicPlaying = true;
      showMusicState(true);
    } catch (err) {
      console.warn("Could not start music:", err.message);
    }

    document.removeEventListener("click", startMusicOnFirstInteraction);
    document.removeEventListener("touchstart", startMusicOnFirstInteraction);
  };

  document.addEventListener("click", startMusicOnFirstInteraction);
  document.addEventListener("touchstart", startMusicOnFirstInteraction);

  musicToggle.addEventListener("click", async (e) => {
    e.stopPropagation();
    // Bilang "first interaction" na rin 'to. Kung wala 'to, pag in-mute mo
    // tapos nag-click ka sa ibang lugar, tutugtog ulit yung music.
    hasInteracted = true;

    try {
      if (musicPlaying) {
        bgMusic.pause();
        showMusicState(false);
        musicPlaying = false;
      } else {
        bgMusic.muted = false;
        await bgMusic.play();
        showMusicState(true);
        musicPlaying = true;
      }
    } catch (err) {
      console.warn("Music toggle error:", err.message);
    }
  });
}

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

(function () {
  const stars = document.querySelectorAll("#stars .star");
  const form = document.getElementById("feedbackForm");
  if (!stars.length || !form) return;

  let rating = 4;

  const paint = (v) =>
    stars.forEach((s) => s.classList.toggle("on", Number(s.dataset.v) <= v));

  stars.forEach((s) => {
    s.addEventListener("click", () => {
      rating = Number(s.dataset.v);
      paint(rating);
    });
    s.addEventListener("mouseenter", () => paint(Number(s.dataset.v)));
    s.addEventListener("mouseleave", () => paint(rating));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = document.getElementById("feedbackBtn");
    btn.textContent = "Thanks for your feedback!";
    btn.disabled = true;
    form.querySelector("textarea").value = "";
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
