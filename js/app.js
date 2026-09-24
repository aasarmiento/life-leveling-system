// Background music – starts on first interaction
const bgMusic = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
let musicPlaying = false;
let hasInteracted = false;

if (bgMusic && musicToggle) {
  const startMusicOnFirstInteraction = async () => {
    if (hasInteracted) return;
    hasInteracted = true;

    try {
      bgMusic.muted = false;
      await bgMusic.play();
      musicPlaying = true;
      musicToggle.textContent = '🔊';
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

    try {
      if (musicPlaying) {
        bgMusic.pause();
        musicToggle.textContent = '🔇';
        musicPlaying = false;
      } else {
        bgMusic.muted = false;
        await bgMusic.play();
        musicToggle.textContent = '🔊';
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


// Demo XP system
(function () {
  const list = document.getElementById('demoTasks');
  if (!list) return;

  const XP_PER_TASK = 20;
  const RANKS = ['Novice', 'Apprentice', 'Adventurer', 'Veteran', 'Master'];
  const MAX_LEVEL = RANKS.length;
  const MAX_TOTAL = 1500;

  // Start at Level 3 with 240 / 300 XP
  let total = 100 + 200 + 240;

  const levelEl = document.getElementById('demoLevel');
  const rankEl = document.getElementById('demoRank');
  const fillEl = document.getElementById('demoFill');
  const xpEl = document.getElementById('demoXp');
  const pillEl = document.getElementById('demoPill');
  const forEl = document.getElementById('demoFor');
  const wrapEl = document.querySelector('.demo-bar-wrap');

  function stateFor(t) {
    let level = 1;
    let rem = t;
    while (level < MAX_LEVEL && rem >= level * 100) {
      rem -= level * 100;
      level++;
    }
    return {
      level,
      xp: Math.min(rem, level * 100),
      max: level * 100
    };
  }

  let shown = stateFor(total);

  function countTo(from, to, max) {
    const start = performance.now();
    const dur = 450;

    (function step(now) {
      const p = Math.min(1, (now - start) / dur);
      xpEl.textContent = Math.round(from + (to - from) * p) + ' / ' + max + ' XP';
      if (p < 1) requestAnimationFrame(step);
    })(start);
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
    rankEl.textContent = RANKS[next.level - 1];

    const pct = (next.xp / next.max) * 100;
    fillEl.style.width = pct + '%';
    fillEl.classList.add('glow');
    setTimeout(() => fillEl.classList.remove('glow'), 600);

    countTo(leveledUp || leveledDown ? next.xp : shown.xp, next.xp, next.max);

    if (change) {
      const neg = change < 0;
      pillEl.textContent = (neg ? '-' : '+') + Math.abs(change) + ' XP';
      pillEl.classList.toggle('neg', neg);
      forEl.textContent = leveledUp ? 'Level up! for ' + name : (neg ? 'undid ' : 'for ') + name;
      pillEl.classList.remove('bump');
      void pillEl.offsetWidth;
      pillEl.classList.add('bump');
      popFloat(pillEl.textContent, pct, neg);
    }

    if (leveledUp) {
      levelEl.classList.remove('pop');
      void levelEl.offsetWidth;
      levelEl.classList.add('pop');
    }

    shown = next;
  }

  list.addEventListener('change', e => {
    if (!e.target.matches('.demo-task input')) return;

    const label = e.target.closest('.demo-task');
    const name = label.querySelector('span').textContent;
    label.classList.toggle('done', e.target.checked);

    const before = total;
    total = Math.max(0, Math.min(MAX_TOTAL, total + (e.target.checked ? XP_PER_TASK : -XP_PER_TASK)));
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
  rankEl.textContent = RANKS[shown.level - 1];
  fillEl.style.width = (shown.xp / shown.max) * 100 + '%';
  xpEl.textContent = shown.xp + ' / ' + shown.max + ' XP';
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
