(() => {
  const C = window.CONFIG;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active");
  }

  // ---------- Звёздное небо (canvas) ----------
  const sky = (() => {
    const canvas = $("stars");
    const ctx = canvas.getContext("2d");
    let w, h, stars = [], trail = [], sparks = [], t0 = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((w * h) / 1800) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.1 ? 1.3 + Math.random() : 0.4 + Math.random() * 0.8,
        delay: Math.random() * 3,
        speed: 0.8 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function frame(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const appear = Math.min(1, Math.max(0, (t - s.delay) / 1.5));
        const a = appear * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase) ** 2);
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.3) {
          ctx.fillStyle = `rgba(170,210,255,${a * 0.18})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Хвост падающей звезды
      ctx.lineCap = "round";
      trail = trail.filter((p) => now - p.t < 600);
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        const k = 1 - (now - b.t) / 600;
        ctx.strokeStyle = `rgba(200,230,255,${k * 0.7})`;
        ctx.lineWidth = k * b.size;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Искры
      sparks = sparks.filter((p) => p.life > 0);
      for (const p of sparks) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        p.life -= 0.016;
        ctx.fillStyle = `rgba(220,238,255,${Math.max(0, p.life)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(frame);
    }

    return {
      start() {
        resize();
        window.addEventListener("resize", resize);
        t0 = performance.now();
        requestAnimationFrame(frame);
      },
      trail(x, y, size) {
        trail.push({ x, y, size, t: performance.now() });
      },
      sparks(x, y, n, power = 1) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = (0.3 + Math.random() * 2.2) * power;
          sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 0.6 + Math.random() * 1.6, life: 0.6 + Math.random() * 0.6 });
        }
      },
    };
  })();

  // ---------- Падающая звезда ----------
  function starPoints(cx, cy, R, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? r : R;
      pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(" ");
  }
  $("starShape").setAttribute("points", starPoints(50, 54, 46, 24));

  async function fallingStar() {
    const el = $("wish");
    const w = window.innerWidth, h = window.innerHeight;
    const p0 = { x: w * 0.78, y: h * 0.3 };
    const p1 = { x: w * 0.12, y: h * 0.42 }; // контрольная точка дуги
    const p2 = { x: w * 0.5, y: h * 0.58 };
    const at = (x, y, s, r) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s}) rotate(${r}deg)`;

    el.style.transform = at(p0.x, p0.y, 0.04, 0);
    el.classList.add("visible");

    // Звезда разгорается и мерцает на месте
    await el.animate(
      [0.04, 0.09, 0.06, 0.12, 0.08].map((s, i) => ({ transform: at(p0.x, p0.y, s, i * 12) })),
      { duration: 2200, easing: "ease-in-out", fill: "forwards" },
    ).finished;

    // Падение по дуге (квадратичная кривая Безье), звезда растёт и вращается
    const frames = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, v = 1 - u;
      const x = v * v * p0.x + 2 * v * u * p1.x + u * u * p2.x;
      const y = v * v * p0.y + 2 * v * u * p1.y + u * u * p2.y;
      frames.push({ transform: at(x, y, 0.08 + 0.92 * u ** 2.2, 48 - 408 * u) });
    }
    const fall = el.animate(frames, { duration: 2800, easing: "cubic-bezier(.45,.05,.4,1)", fill: "forwards" });

    let falling = true;
    (function follow() {
      if (!falling) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      sky.trail(cx, cy, Math.max(2, r.width * 0.12));
      sky.sparks(cx, cy, 2, 0.6);
      requestAnimationFrame(follow);
    })();

    await fall.finished;
    falling = false;
    sky.sparks(p2.x, p2.y, 70, 2.2);
    el.classList.add("landed");
  }

  // ---------- Сценарий ----------
  function writeWords(el, text) {
    const words = text.split(" ");
    el.innerHTML = "";
    words.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      span.style.animationDelay = 0.7 + i * 0.2 + "s";
      el.append(span, " ");
    });
    return 700 + words.length * 200 + 700;
  }

  async function nightScene() {
    show("night");
    document.body.classList.add("night");
    document.querySelector('meta[name="theme-color"]').content = "#040a1c";
    sky.start();
    await sleep(1600);
    const q = $("question");
    q.textContent = C.question;
    q.classList.add("show");
    await sleep(3800);
    q.classList.add("up");
    await sleep(900);
    await fallingStar();
  }

  $("envelope").addEventListener("click", async (e) => {
    e.currentTarget.classList.add("open");
    await sleep(1500);
    show("letter");
    await sleep(writeWords($("letterText"), C.letter));
    $("letterHint").classList.add("show");
    $("letter").addEventListener("click", nightScene, { once: true });
  }, { once: true });

  $("wishText").textContent = C.wish;
})();
