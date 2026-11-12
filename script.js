/* ============================================================
   Chiner — portfolio animations (plain JavaScript, no libraries)

   1. Fill the page from content.js
   2. Intro loader + landing entrance
   3. Landing canvas: glowing flow-field particles that react to the pointer
   4. Name letters that swell toward the pointer
   5. Typed taglines + text scramble
   6. Cursor glow, magnetic buttons, card spotlight
   7. Scroll: progress bar, nav, reveals, bio that lights up word by word
   ============================================================ */
(() => {
  'use strict';

  const C = window.PORTFOLIO || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  // Pointer position in viewport coordinates, shared by several effects.
  const pointer = { x: -9999, y: -9999, seen: false };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.seen = true;
  }, { passive: true });

  /* ---------- 1. Content ---------- */
  function renderContent() {
    const name = C.name || 'Chiner';
    const role = C.role || 'Developer';
    document.title = `${name} — ${role}`;
    ['#navName', '#footName', '#loaderName'].forEach((s) => { $(s).textContent = name; });
    $('#year').textContent = new Date().getFullYear();

    // Name → one span per letter, plus a glowing full stop.
    const h1 = $('#name');
    h1.textContent = '';
    h1.setAttribute('aria-label', name);
    [...name, '.'].forEach((char, i) => {
      const span = el('span', char === '.' && i === name.length ? 'ch ch--dot' : 'ch', char);
      span.style.setProperty('--i', i);
      span.setAttribute('aria-hidden', 'true');
      h1.append(span);
    });

    $('#role').textContent = role;

    // About
    const bio = $('#bio');
    bio.textContent = '';
    (C.bio || '').split(/\s+/).filter(Boolean).forEach((word) => {
      bio.append(el('span', 'bw', word), ' ');
    });

    const portrait = $('#portrait');
    if (C.photo) {
      const img = el('img');
      img.src = C.photo;
      img.alt = `Portrait of ${name}`;
      img.loading = 'lazy';
      portrait.append(img);
    } else {
      const initial = el('span', 'portrait__initial', name.charAt(0));
      initial.setAttribute('aria-hidden', 'true');
      portrait.append(initial);
    }

    const facts = $('#facts');
    (C.facts || []).forEach((fact, i) => {
      const row = el('div', 'facts__row reveal');
      row.style.setProperty('--d', i * 90);
      row.append(el('dt', 'mono', fact.label), el('dd', '', fact.value));
      facts.append(row);
    });

    // Skills: cards + scrolling banner
    const groups = C.skills || [];
    const grid = $('#skillGrid');
    groups.forEach((group, i) => {
      const card = el('article', 'skill-card reveal');
      card.style.setProperty('--d', i * 110);
      const head = el('div', 'skill-card__head mono');
      head.append(el('h3', 'skill-card__title', group.group), el('span', '', String(group.items.length).padStart(2, '0')));
      const chips = el('ul', 'chips');
      group.items.forEach((item) => chips.append(el('li', 'chip', item)));
      card.append(head, chips);
      grid.append(card);
    });

    const all = [...new Set(groups.flatMap((g) => g.items))];
    const marquee = $('#marquee');
    if (all.length) {
      const half = Math.ceil(all.length / 2);
      const rows = all.length > 3 ? [all.slice(0, half), all.slice(half)] : [all];
      rows.forEach((items, r) => {
        const row = el('div', r % 2 ? 'marquee__row marquee__row--rev' : 'marquee__row');
        // Repeat the list until it is comfortably wider than any screen, then double it
        // so the -50% loop is seamless.
        const repeats = Math.max(2, Math.ceil(14 / items.length));
        for (let copy = 0; copy < 2; copy++) {
          for (let n = 0; n < repeats; n++) items.forEach((item) => row.append(el('span', 'marquee__item', item)));
        }
        row.style.setProperty('--dur', `${items.length * repeats * 3.2}s`);
        marquee.append(row);
      });
    } else {
      marquee.remove();
    }

    // Contact
    const email = C.email || '';
    $('#mail').href = `mailto:${email}`;
    $('#mailText').textContent = email;
    const socials = $('#socials');
    (C.socials || []).forEach((s) => {
      const li = el('li');
      const a = el('a', '', s.label);
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      li.append(a);
      socials.append(li);
    });
    if (C.phone) {
      const li = el('li');
      const a = el('a', '', C.phone);
      a.href = `tel:${C.phone.replace(/[^\d+]/g, '')}`;
      a.setAttribute('aria-label', `Call ${C.phone}`);
      li.append(a);
      socials.append(li);
    }

    // Headings → words that rise into place when scrolled to.
    $$('[data-split]').forEach((heading) => {
      const words = heading.textContent.trim().split(/\s+/);
      heading.setAttribute('aria-label', heading.textContent.trim());
      heading.textContent = '';
      words.forEach((word, i) => {
        const outer = el('span', 'w');
        const inner = el('span', '', word);
        inner.style.setProperty('--i', i);
        outer.setAttribute('aria-hidden', 'true');
        outer.append(inner);
        heading.append(outer, ' ');
      });
      heading.classList.add('reveal-split');
    });
  }

  /* ---------- 2. Loader + entrance ---------- */
  function runLoader(onDone) {
    const loader = $('#loader');
    const root = document.documentElement;
    const finish = () => {
      root.classList.remove('is-loading');
      onDone();
    };
    if (reduceMotion || !loader) {
      if (loader) loader.remove();
      finish();
      return;
    }
    const count = $('#loaderCount');
    const bar = $('#loaderBar');
    const duration = 1500;
    const start = performance.now();
    const tick = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      bar.style.transform = `scaleX(${eased})`;
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        loader.classList.add('is-done');
        setTimeout(finish, 350);
        setTimeout(() => loader.remove(), 1100);
      }
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 3. Flow-field canvas ---------- */
  function initField() {
    const canvas = $('#field');
    const hero = $('#top');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { start() {} };

    const COLORS = ['77,255,195', '77,255,195', '56,182,255', '233,239,236'];
    let width = 0, height = 0, particles = [], rect = null;
    let running = false, visible = true, frameId = 0;

    const spawn = (p = {}) => {
      p.x = p.px = Math.random() * width;
      p.y = p.py = Math.random() * height;
      p.vx = p.vy = 0;
      p.life = 0;
      p.max = 140 + Math.random() * 280;
      p.speed = 0.5 + Math.random() * 0.9;
      p.color = COLORS[(Math.random() * COLORS.length) | 0];
      return p;
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((width * height) / 2100, 160, 760));
      particles = Array.from({ length: count }, () => spawn());
      rect = canvas.getBoundingClientRect();
      if (reduceMotion) drawStill();
    }

    // A smooth, slowly changing direction for every point on the canvas.
    const angleAt = (x, y, t) => {
      const s = 0.0017;
      return (
        Math.sin(x * s + t * 0.00013) +
        Math.cos(y * s * 1.35 - t * 0.00017) +
        Math.sin((x + y) * s * 0.6 + t * 0.00009)
      ) * Math.PI;
    };

    function step(t, fade) {
      if (fade) {
        // Fade old strokes a little each frame so particles leave glowing trails.
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.065)';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';

      const mx = pointer.x - rect.left;
      const my = pointer.y - rect.top;
      const radius = 190;

      for (const p of particles) {
        const a = angleAt(p.x, p.y, t);
        p.vx += Math.cos(a) * 0.085 * p.speed;
        p.vy += Math.sin(a) * 0.085 * p.speed;

        // Pointer: push particles away and spin them around it.
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = 1 - d / radius;
          p.vx += (dx / d) * force * 0.85 - (dy / d) * force * 0.7;
          p.vy += (dy / d) * force * 0.85 + (dx / d) * force * 0.7;
        }

        p.vx *= 0.94;
        p.vy *= 0.94;
        p.px = p.x;
        p.py = p.y;
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const alpha = Math.sin((Math.PI * p.life) / p.max) * 0.6;
        ctx.strokeStyle = `rgba(${p.color},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (p.life > p.max || p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) spawn(p);
      }
    }

    function drawStill() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < 70; i++) step(i * 16, false);
    }

    function loop(t) {
      frameId = 0;
      if (!running || !visible || document.hidden) return;
      step(t, true);
      frameId = requestAnimationFrame(loop);
    }
    const wake = () => { if (running && !frameId && !reduceMotion) frameId = requestAnimationFrame(loop); };

    // Click or tap: blast nearby particles outward.
    hero.addEventListener('pointerdown', (e) => {
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      for (const p of particles) {
        const dx = p.x - x, dy = p.y - y;
        const d = Math.hypot(dx, dy);
        if (d < 280 && d > 0.01) {
          const force = (1 - d / 280) * 9;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }
    });

    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }).observe(hero);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('scroll', () => { rect = canvas.getBoundingClientRect(); }, { passive: true });
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (hero.clientWidth !== width || Math.abs(hero.clientHeight - height) > 120) resize(); }, 150);
    });

    resize();
    return { start() { running = true; wake(); } };
  }

  /* ---------- 4. Name letters ---------- */
  function initName() {
    if (reduceMotion) return { start() {} };
    const hero = $('#top');
    const letters = $$('#name .ch').map((node, i) => ({ node, i, weight: 500, lift: 0 }));
    let visible = true, running = false, frameId = 0;

    function loop(t) {
      frameId = 0;
      if (!running || !visible || document.hidden) return;
      const size = parseFloat(getComputedStyle(letters[0].node).fontSize);
      const reach = size * 1.15;
      for (const l of letters) {
        // A slow wave keeps the name alive; the pointer makes nearby letters heavy.
        const wave = 430 + 150 * Math.sin(t * 0.0015 - l.i * 0.75);
        let near = 0;
        if (pointer.seen) {
          const r = l.node.getBoundingClientRect();
          const d = Math.hypot(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2));
          near = clamp(1 - d / reach, 0, 1);
        }
        l.weight = lerp(l.weight, lerp(wave, 800, near), 0.12);
        l.lift = lerp(l.lift, near, 0.12);
        l.node.style.fontWeight = Math.round(l.weight);
        l.node.style.transform = `translateY(${(-l.lift * 0.045).toFixed(4)}em)`;
      }
      frameId = requestAnimationFrame(loop);
    }
    const wake = () => { if (running && !frameId) frameId = requestAnimationFrame(loop); };
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }).observe(hero);
    document.addEventListener('visibilitychange', wake);
    return { start() { running = true; wake(); } };
  }

  /* ---------- 5. Typed taglines + scramble ---------- */
  function scramble(node, duration = 900) {
    const final = node.textContent;
    if (reduceMotion) return;
    const glyphs = '<>/\\[]{}=+*#_01';
    const start = performance.now();
    const tick = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const shown = Math.floor(p * final.length);
      let out = final.slice(0, shown);
      for (let i = shown; i < final.length; i++) {
        out += final[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0];
      }
      node.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else node.textContent = final;
    };
    requestAnimationFrame(tick);
  }

  function initTyped() {
    const node = $('#typed');
    const lines = (C.taglines || []).filter(Boolean);
    if (!lines.length) return { start() {} };
    if (reduceMotion) {
      node.textContent = lines[0];
      return { start() {} };
    }
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    async function run() {
      for (let i = 0; ; i = (i + 1) % lines.length) {
        const line = lines[i];
        for (let n = 1; n <= line.length; n++) {
          node.textContent = line.slice(0, n);
          await wait(34 + Math.random() * 40);
        }
        await wait(2200);
        if (lines.length === 1) return;
        for (let n = line.length; n >= 0; n--) {
          node.textContent = line.slice(0, n);
          await wait(16);
        }
        await wait(350);
      }
    }
    return { start() { run(); } };
  }

  /* ---------- 6. Pointer effects ---------- */
  function initPointerEffects() {
    if (!finePointer || reduceMotion) return;

    // Soft light that trails the cursor.
    const glow = $('#cursorGlow');
    let gx = innerWidth / 2, gy = innerHeight / 2;
    const follow = () => {
      if (pointer.seen) {
        glow.classList.add('is-on');
        gx = lerp(gx, pointer.x, 0.1);
        gy = lerp(gy, pointer.y, 0.1);
        glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
      }
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);

    // Buttons lean toward the cursor.
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${(x * 0.22).toFixed(1)}px, ${(y * 0.32).toFixed(1)}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });

    // Skill cards light up where the cursor is.
    $$('.skill-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- 7. Scroll ---------- */
  function initScroll() {
    const nav = $('#nav');
    const progress = $('#progress');
    const heroInner = $('#heroInner');
    const bio = $('#bio');
    const words = $$('.bw', bio);
    let lastY = window.scrollY, ticking = false;

    function update() {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;

      progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

      // Nav: solid after the top, hidden while scrolling down, back when scrolling up.
      nav.classList.toggle('is-scrolled', y > 24);
      if (Math.abs(y - lastY) > 6) {
        nav.classList.toggle('is-hidden', y > lastY && y > vh * 0.5);
        lastY = y;
      }

      if (!reduceMotion) {
        // Landing content drifts up and fades as you leave it.
        if (y < vh * 1.1) {
          const p = clamp(y / vh, 0, 1);
          heroInner.style.transform = `translate3d(0, ${(-p * 90).toFixed(1)}px, 0)`;
          heroInner.style.opacity = (1 - p * 1.25).toFixed(3);
        }

        // Bio lights up word by word as it crosses the screen.
        if (words.length) {
          const r = bio.getBoundingClientRect();
          const p = clamp((vh * 0.86 - r.top) / (r.height + vh * 0.42), 0, 1);
          const lit = Math.round(p * words.length);
          words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
        }
      }
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Reveal blocks once as they enter the screen.
    const revealer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal, .reveal-split').forEach((node) => revealer.observe(node));

    // Highlight the nav link of the section on screen.
    const links = $$('.nav__links a');
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((section) => spy.observe(section));
  }

  function initCopy() {
    const btn = $('#copy');
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      const email = C.email || '';
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        const area = el('textarea');
        area.value = email;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        try { document.execCommand('copy'); } catch { /* nothing else to try */ }
        area.remove();
      }
      btn.textContent = 'Copied';
      btn.classList.add('is-copied');
      setTimeout(() => { btn.textContent = label; btn.classList.remove('is-copied'); }, 1600);
    });
  }

  /* ---------- Start ---------- */
  renderContent();
  const field = initField();
  const nameFx = initName();
  const typed = initTyped();
  initPointerEffects();
  initScroll();
  initCopy();

  runLoader(() => {
    document.body.classList.add('is-ready');
    field.start();
    setTimeout(() => scramble($('#hello')), 150);
    setTimeout(() => scramble($('#role'), 700), 750);
    setTimeout(() => typed.start(), 1500);
    // Once the letters have landed, hand them over to the pointer effect.
    setTimeout(() => {
      document.body.classList.add('is-settled');
      nameFx.start();
    }, 1900);
  });
})();
