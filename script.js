(() => {
  const C = window.CONFIG;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const HEARTS = ["❤", "♥", "♡"];

  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(id).classList.add("active");
  }

  // ---------- Плавающие сердечки на фоне ----------
  function spawnFloater() {
    const el = document.createElement("span");
    el.className = "floater";
    el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
    const size = 12 + Math.random() * 26;
    const dur = 8 + Math.random() * 8;
    el.style.left = Math.random() * 100 + "vw";
    el.style.fontSize = size + "px";
    el.style.animationDuration = dur + "s";
    el.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
    el.style.setProperty("--rot", (Math.random() * 80 - 40) + "deg");
    el.style.setProperty("--o", (0.3 + Math.random() * 0.5).toFixed(2));
    $("floaters").appendChild(el);
    setTimeout(() => el.remove(), dur * 1000);
  }
  setInterval(spawnFloater, 700);

  // ---------- Взрыв сердечек ----------
  function burst(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "burst";
      el.textContent = HEARTS[i % HEARTS.length];
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 60 + Math.random() * 90;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.fontSize = 14 + Math.random() * 18 + "px";
      el.style.setProperty("--x", Math.cos(angle) * dist + "px");
      el.style.setProperty("--y", Math.sin(angle) * dist + "px");
      el.style.setProperty("--r", (Math.random() * 90 - 45) + "deg");
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }
  }
  document.addEventListener("click", (e) => burst(e.clientX, e.clientY, 8));

  // ---------- Сердце из частиц ----------
  function startHeart(canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, scale, particles;

    // Классическая параметрическая кривая сердца
    const heartPoint = (t) => ({
      x: 16 * Math.sin(t) ** 3,
      y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    });

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(w, h) / 38;
      const n = Math.round(Math.min(900, (w * h) / 900));
      particles = Array.from({ length: n }, () => {
        const p = heartPoint(Math.random() * Math.PI * 2);
        // Часть частиц ложится на контур, часть заполняет сердце внутри
        const k = Math.random() < 0.6 ? 1 : Math.sqrt(Math.random());
        return {
          tx: p.x * k, ty: p.y * k,
          x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60,
          r: 0.8 + Math.random() * 1.8,
          hue: 335 + Math.random() * 25,
          phase: Math.random() * Math.PI * 2,
        };
      });
    }

    function frame(time) {
      const t = time / 1000;
      // Двойной удар, как у настоящего сердца
      const beat = 1 + 0.06 * Math.max(0, Math.sin(t * 5.2)) ** 6 + 0.04 * Math.max(0, Math.sin(t * 5.2 - 0.9)) ** 6;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2 - scale * 1.5;
      for (const p of particles) {
        p.x += (p.tx - p.x) * 0.04;
        p.y += (p.ty - p.y) * 0.04;
        const jitter = Math.sin(t * 2 + p.phase) * 0.25;
        const x = cx + (p.x + jitter) * scale * beat;
        const y = cy + (p.y + jitter) * scale * beat;
        const alpha = 0.5 + 0.4 * Math.sin(t * 3 + p.phase) ** 2;
        ctx.fillStyle = `hsla(${p.hue}, 85%, 62%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(frame);
  }

  // ---------- Печатная машинка ----------
  async function typeLines(el, lines) {
    for (const line of lines) {
      el.textContent = "";
      for (const ch of line) {
        el.textContent += ch;
        await sleep(ch === "," || ch === "." ? 260 : 45);
      }
      await sleep(1800);
    }
  }

  // ---------- Сценарий ----------
  $("envelope").addEventListener("click", async (e) => {
    e.currentTarget.classList.add("open");
    await sleep(1600);
    show("main");
    startHeart($("heart"));
    $("title").textContent = C.name;
    await sleep(1400);
    $("title").classList.add("show");
    await sleep(1200);
    await typeLines($("typed"), C.lines);
    $("toReasons").classList.remove("hidden");
  }, { once: true });

  $("toReasons").addEventListener("click", () => {
    show("reasons");
    const cards = $("cards");
    let flipped = 0;
    C.reasons.forEach((r, i) => {
      const card = document.createElement("button");
      card.className = "card";
      card.style.animationDelay = i * 0.12 + "s";
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front"><span class="num">${i + 1}</span><span></span></div>
          <div class="card-face card-back"></div>
        </div>`;
      card.querySelector(".card-front span:last-child").textContent = r.front;
      card.querySelector(".card-back").textContent = r.back;
      card.addEventListener("click", () => {
        if (!card.classList.contains("flipped")) flipped++;
        card.classList.add("flipped");
        if (flipped === C.reasons.length) $("toFinal").classList.remove("hidden");
      });
      cards.appendChild(card);
    });
  }, { once: true });

  $("toFinal").addEventListener("click", () => {
    show("final");
    $("finalTitle").textContent = C.finalTitle;
    $("finalText").textContent = C.finalText;
  });

  // Кнопка «Нет» убегает от курсора
  const no = $("no");
  function runAway() {
    no.classList.add("running");
    const pad = 20;
    const x = pad + Math.random() * (window.innerWidth - no.offsetWidth - pad * 2);
    const y = pad + Math.random() * (window.innerHeight - no.offsetHeight - pad * 2);
    no.style.left = x + "px";
    no.style.top = y + "px";
  }
  no.addEventListener("mouseenter", runAway);
  no.addEventListener("click", (e) => { e.stopPropagation(); runAway(); });

  $("yes").addEventListener("click", async (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      burst(
        rect.left + rect.width / 2 + (Math.random() - 0.5) * 300,
        rect.top + (Math.random() - 0.5) * 200,
        16,
      );
      await sleep(150);
    }
    document.querySelector(".final-buttons").style.display = "none";
    const after = $("afterYes");
    after.textContent = `${C.afterYes} ❤︎`;
    after.classList.remove("hidden");
    const sign = document.createElement("p");
    sign.className = "sub";
    sign.textContent = C.from;
    after.after(sign);
    setInterval(spawnFloater, 250);
  }, { once: true });
})();
