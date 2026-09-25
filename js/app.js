// Background music – starts on first interaction
const bgMusic = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
let musicPlaying = false;
let hasInteracted = false;

if (bgMusic && musicToggle) {
  // Yung icon ng sound button (naka-mute o tumutugtog) ay nakabase sa aria-pressed.
  // Si CSS (.music-btn) na bahala kung aling speaker icon ang lalabas.
  const showMusicState = on => {
    musicToggle.setAttribute('aria-pressed', String(on));
    musicToggle.title = on ? 'Mute music' : 'Play music';
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
      console.warn('Could not start music:', err.message);
    }

    document.removeEventListener('click', startMusicOnFirstInteraction);
    document.removeEventListener('touchstart', startMusicOnFirstInteraction);
  };

  document.addEventListener('click', startMusicOnFirstInteraction);
  document.addEventListener('touchstart', startMusicOnFirstInteraction);

  musicToggle.addEventListener('click', async (e) => {
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
      console.warn('Music toggle error:', err.message);
    }
  });
}


// Level-up animation
(function () {
  const categories = [
    { name: "Work mastery", icon: "💼", badges: ["📋", "⏱️", "🎯", "📈"] },
    { name: "Learning mastery", icon: "📚", badges: ["🧠", "✍️", "🔍", "🏆"] },
    { name: "Health mastery", icon: "💪", badges: ["🏃", "🧘", "❤️", "⚡"] }
  ];

  const logoEl = document.getElementById("levelupLogo");
  const labelEl = document.getElementById("levelupLabel");
  const fillEl = document.getElementById("levelupFill");
  const percentEl = document.getElementById("levelupPercent");
  const leftBadges = document.querySelector(".left-badges");
  const rightBadges = document.querySelector(".right-badges");
  const logoWrap = document.querySelector(".levelup-logo-wrapper");

  let current = 0;
  let progress = 0;

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

  function startCategory() {
    const cat = categories[current];

    progress = 0;
    fillEl.style.width = "0%";
    percentEl.textContent = "0%";
    labelEl.textContent = cat.name;
    logoEl.style.opacity = "0";
    logoEl.style.transform = "scale(0.7)";

    setTimeout(() => {
      logoEl.textContent = cat.icon;
      logoEl.style.opacity = "1";
      logoEl.style.transform = "scale(1)";
      logoWrap.classList.add("active");
    }, 150);

    renderBadges(cat.badges);
    document.querySelectorAll(".levelup-badge").forEach(b => b.classList.remove("visible"));

    animate();
  }

  function animate() {
    progress += 0.7;

    if (progress >= 100) {
      setTimeout(() => {
        logoWrap.classList.remove("active");
        current = (current + 1) % categories.length;
        startCategory();
      }, 700);
      return;
    }

    fillEl.style.width = progress + "%";
    percentEl.textContent = Math.floor(progress) + "%";

    const thresholds = [18, 38, 58, 78];
    const badges = document.querySelectorAll(".levelup-badge");
    thresholds.forEach((t, i) => {
      if (progress >= t && badges[i]) badges[i].classList.add("visible");
    });

    requestAnimationFrame(animate);
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      startCategory();
      observer.disconnect();
    }
  }, { threshold: 0.3 });

  const section = document.querySelector(".progress-section");
  if (section) observer.observe(section);
})();


// Quest cards – select one and play its video
(function () {
  const items = document.querySelectorAll('.quest-item');
  if (!items.length) return;

  // Start with the first card selected
  if (!document.querySelector('.quest-item.selected')) {
    items[0].classList.add('selected');
  }

  function select(item) {
    items.forEach(i => {
      i.classList.remove('selected');
      const v = i.querySelector('video');
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    });

    item.classList.add('selected');
    const video = item.querySelector('video');
    if (video) video.play().catch(() => {});
  }

  items.forEach(item => {
    item.addEventListener('click', () => select(item));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
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
  const list = document.getElementById('demoTasks');
  if (!list) return;

  const XP_PER_TASK = 20;
  const XP_PER_LEVEL = 125;
  // Kinopya sa "Climb the ranks" section ng Home, para tugma
  const RANKS = [
    { name: 'Novice', xp: 0 },
    { name: 'Apprentice', xp: 100 },
    { name: 'Adventurer', xp: 300 },
    { name: 'Veteran', xp: 700 },
    { name: 'Master', xp: 1500 }
  ];

  let total = 1450;
  let displayed = total;
  let countFrame = 0;
  let fillTimer = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const levelEl = document.getElementById('demoLevel');
  const rankEl = document.getElementById('demoRank');
  const fillEl = document.getElementById('demoFill');
  const xpEl = document.getElementById('demoXp');
  const pillEl = document.getElementById('demoPill');
  const forEl = document.getElementById('demoFor');
  const wrapEl = document.querySelector('.demo-bar-wrap');

  const levelOf = t => Math.floor(t / XP_PER_LEVEL) + 1;

  function stateFor(t) {
    return {
      level: levelOf(t),
      rank: RANKS.filter(r => t >= r.xp).pop().name,
      pct: ((t % XP_PER_LEVEL) / XP_PER_LEVEL) * 100
    };
  }

  // Ito yung text sa ilalim ng bar, hal. "1,450 XP · 50 XP to Level 13"
  function xpText(t) {
    const level = levelOf(t);
    return t.toLocaleString('en-US') + ' XP · ' + (level * XP_PER_LEVEL - t) + ' XP to Level ' + (level + 1);
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
    if (!animate) fillEl.style.transition = 'none';
    fillEl.style.width = pct + '%';
    if (!animate) {
      void fillEl.offsetWidth;
      fillEl.style.transition = '';
    }
  }

  function popFloat(text, pct, neg) {
    const f = document.createElement('span');
    f.className = 'xp-float' + (neg ? ' neg' : '');
    f.textContent = text;
    f.style.left = Math.max(8, Math.min(92, pct)) + '%';
    wrapEl.appendChild(f);
    f.addEventListener('animationend', () => f.remove());
  }

  function render(next, change, name) {
    const leveledUp = next.level > shown.level;
    const leveledDown = next.level < shown.level;

    levelEl.textContent = 'Level ' + next.level;
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
    fillEl.classList.add('glow');
    setTimeout(() => fillEl.classList.remove('glow'), 600);

    countTo(displayed, total);

    if (change) {
      const neg = change < 0;
      pillEl.hidden = false;
      pillEl.textContent = (neg ? '−' : '+') + Math.abs(change) + ' XP';
      pillEl.classList.toggle('neg', neg);
      forEl.textContent = leveledUp ? 'Level up! for ' + name : (neg ? 'undid ' : 'for ') + name;
      restart(pillEl, 'bump');
      if (!reduceMotion.matches) popFloat(pillEl.textContent, next.pct, neg);
    }

    if (leveledUp) restart(levelEl, 'pop');
    if (next.rank !== shown.rank) restart(rankEl, 'pop');

    shown = next;
  }

  list.addEventListener('change', e => {
    if (!e.target.matches('.demo-task input')) return;

    const label = e.target.closest('.demo-task');
    const name = label.querySelector('span').textContent;
    label.classList.toggle('done', e.target.checked);

    const before = total;
    total = Math.max(0, total + (e.target.checked ? XP_PER_TASK : -XP_PER_TASK));
    render(stateFor(total), total - before, name);
  });

  const form = document.getElementById('demoAddForm');
  const input = document.getElementById('demoAddInput');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const label = document.createElement('label');
    label.className = 'demo-task';

    const box = document.createElement('input');
    box.type = 'checkbox';

    const span = document.createElement('span');
    span.textContent = text;

    label.append(box, document.createTextNode(' '), span);
    list.insertBefore(label, form);
    input.value = '';
  });

  // Initial paint
  levelEl.textContent = 'Level ' + shown.level;
  rankEl.textContent = shown.rank;
  setFill(shown.pct, false);
  xpEl.textContent = xpText(total);
})();


// Starry sky
(function () {
  const sky = document.querySelector('.sky');
  if (!sky) return;

  function add(cls, size) {
    const el = document.createElement('span');
    el.className = cls;
    el.style.left = Math.random() * 100 + '%';
    el.style.top = Math.random() * 100 + '%';
    el.style.animationDelay = (Math.random() * 5).toFixed(2) + 's';
    el.style.animationDuration = (2.5 + Math.random() * 3).toFixed(2) + 's';
    if (size) {
      el.style.width = size + 'px';
      el.style.height = size + 'px';
    }
    sky.appendChild(el);
  }

  for (let i = 0; i < 60; i++) add('star', Math.random() < 0.7 ? 2 : 3);
  for (let i = 0; i < 14; i++) add('spark');
})();



(function () {
  const stars = document.querySelectorAll('#stars .star');
  const form = document.getElementById('feedbackForm');
  if (!stars.length || !form) return;

  let rating = 4;

  const paint = v => stars.forEach(s => s.classList.toggle('on', Number(s.dataset.v) <= v));

  stars.forEach(s => {
    s.addEventListener('click', () => {
      rating = Number(s.dataset.v);
      paint(rating);
    });
    s.addEventListener('mouseenter', () => paint(Number(s.dataset.v)));
    s.addEventListener('mouseleave', () => paint(rating));
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('feedbackBtn');
    btn.textContent = 'Thanks for your feedback!';
    btn.disabled = true;
    form.querySelector('textarea').value = '';
  });
})();



(function () {
  const items = document.querySelectorAll('.faq-list details');
  items.forEach(d => {
    d.addEventListener('toggle', () => {
      if (d.open) {
        items.forEach(o => {
          if (o !== d) o.open = false;
        });
      }
    });
  });
})();