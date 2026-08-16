/* Charming Chameleon — living skin engine
   One hue to rule the page: JS lerps --h toward the active
   section's colour every frame; aurora, cursor, glows follow. */

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const root = document.documentElement;
  const body = document.body;

  /* ================= HUE ENGINE ================= */
  let hue = 160;
  let hueTarget = 160;
  let cycling = false;

  const hueSections = document.querySelectorAll("[data-hue]");
  const hueObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          cycling = entry.target.hasAttribute("data-cycle");
          if (!cycling) hueTarget = parseFloat(entry.target.dataset.hue);
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );
  hueSections.forEach((el) => hueObserver.observe(el));

  /* ================= PRELOADER ================= */
  const loader = document.getElementById("loader");
  const pct = document.getElementById("loaderPct");

  const finishLoad = () => {
    if (loader) loader.classList.add("is-done");
    body.classList.add("is-ready");
    setTimeout(() => loader && loader.remove(), 900);
  };

  if (reduceMotion || !loader) {
    if (loader) loader.remove();
    body.classList.add("is-ready");
  } else {
    let p = 0;
    const step = () => {
      p = Math.min(100, p + Math.random() * 14 + 6);
      if (pct) pct.textContent = String(Math.floor(p)).padStart(2, "0");
      if (p < 100) {
        setTimeout(step, 90);
      } else {
        setTimeout(finishLoad, 250);
      }
    };
    step();
    setTimeout(finishLoad, 3000); /* hard cap, never trap the page */
  }

  /* ================= SPLIT HERO LINES INTO WORDS/CHARS ================= */
  document.querySelectorAll("[data-split]").forEach((line, li) => {
    const words = line.textContent.split(" ");
    line.textContent = "";
    let ci = 0;
    words.forEach((word, wi) => {
      const w = document.createElement("span");
      w.className = "word";
      [...word].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "char";
        s.textContent = ch;
        s.style.transitionDelay = `${0.15 + li * 0.09 + ci * 0.022}s`;
        w.appendChild(s);
        ci++;
      });
      line.appendChild(w);
      if (wi < words.length - 1) line.appendChild(document.createTextNode(" "));
    });
  });

  /* ================= AURORA ================= */
  const canvas = document.getElementById("aurora");
  const ctx = canvas ? canvas.getContext("2d") : null;
  let W = 0, H = 0;

  const ORBS = [
    { dx: 0.22, dy: 0.3, r: 0.55, sx: 0.00016, sy: 0.00012, ph: 0, hueOff: 0, a: 0.2 },
    { dx: 0.78, dy: 0.25, r: 0.5, sx: 0.00012, sy: 0.00017, ph: 2.1, hueOff: 40, a: 0.16 },
    { dx: 0.6, dy: 0.75, r: 0.6, sx: 0.0001, sy: 0.00014, ph: 4.2, hueOff: -35, a: 0.17 },
    { dx: 0.15, dy: 0.85, r: 0.45, sx: 0.00018, sy: 0.0001, ph: 1.2, hueOff: 70, a: 0.13 },
    { dx: 0.9, dy: 0.8, r: 0.42, sx: 0.00013, sy: 0.00016, ph: 5.3, hueOff: -70, a: 0.12 },
  ];

  const sizeCanvas = () => {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawAurora = (t) => {
    ctx.fillStyle = "#0a0b0d";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const o of ORBS) {
      const x = (o.dx + Math.sin(t * o.sx + o.ph) * 0.16) * W;
      const y = (o.dy + Math.cos(t * o.sy + o.ph) * 0.18) * H;
      const r = o.r * Math.max(W, H);
      const h = ((hue + o.hueOff) % 360 + 360) % 360;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `hsla(${h}, 85%, 50%, ${o.a})`);
      g.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  if (canvas) {
    sizeCanvas();
    window.addEventListener("resize", () => {
      sizeCanvas();
      if (reduceMotion) drawAurora(0);
    });
    if (reduceMotion) drawAurora(0);
  }

  /* ================= CUSTOM CURSOR ================= */
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  let mx = -100, my = -100, rx = -100, ry = -100;

  if (finePointer && !reduceMotion && dot && ring) {
    root.classList.add("has-cursor");
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });

    document.querySelectorAll("[data-cursor='play']").forEach((el) => {
      el.addEventListener("pointerenter", () => ring.classList.add("is-play"));
      el.addEventListener("pointerleave", () => ring.classList.remove("is-play"));
    });
  }

  /* ================= MASTER FRAME LOOP ================= */
  const lerpHue = () => {
    let d = ((hueTarget - hue + 540) % 360) - 180;
    hue += d * 0.045;
    hue = ((hue % 360) + 360) % 360;
    root.style.setProperty("--h", hue.toFixed(1));
  };

  if (!reduceMotion) {
    const frame = (t) => {
      if (canvas && canvas.width === 0 && window.innerWidth > 0) sizeCanvas();
      if (cycling) hueTarget = (hueTarget + 0.25) % 360;
      lerpHue();
      if (ctx) drawAurora(t);
      if (root.classList.contains("has-cursor")) {
        rx += (mx - rx) * 0.16;
        ry += (my - ry) * 0.16;
        dot.style.transform = `translate(${mx}px, ${my}px)`;
        ring.style.transform = `translate(${rx}px, ${ry}px)`;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  } else {
    root.style.setProperty("--h", String(hueTarget));
  }

  /* ================= SCROLL REVEALS ================= */
  document.querySelectorAll(".client-logo").forEach((el, i) => {
    el.style.setProperty("--i", i);
  });

  document.querySelectorAll(".creative__tags li").forEach((el, i) => {
    el.style.setProperty("--i", i);
  });

  const revealTargets = document.querySelectorAll(
    ".section-head h2, .contact__title, .project, .cap, .sector, .about__grid, .clients__grid, .creative__body, .creative__tags, .creative__close"
  );
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -12% 0px" }
  );
  revealTargets.forEach((el) => revealObserver.observe(el));

  /* Cards and sector names take full colour at centre stage */
  const liveObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-live", entry.isIntersecting);
      });
    },
    { rootMargin: "-32% 0px -32% 0px" }
  );
  document.querySelectorAll(".project, .sector").forEach((el) => liveObserver.observe(el));

  /* ================= 3D TILT ON POSTERS ================= */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".project__poster").forEach((poster) => {
      const damp = 9;
      poster.addEventListener("pointermove", (e) => {
        const r = poster.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        poster.style.transform =
          `rotateY(${px * damp}deg) rotateX(${-py * damp}deg) translateZ(0)`;
      });
      poster.addEventListener("pointerleave", () => {
        poster.style.transform = "rotateY(0deg) rotateX(0deg)";
        poster.style.transition = "transform 0.6s cubic-bezier(0.22, 0.9, 0.24, 1), box-shadow 0.5s ease, border-color 0.5s ease";
        setTimeout(() => { poster.style.transition = ""; }, 600);
      });
    });
  }

  /* ================= MAGNETIC BUTTON ================= */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 0.35;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "translate(0, 0)";
        el.style.transition = "transform 0.5s cubic-bezier(0.22, 0.9, 0.24, 1)";
        setTimeout(() => { el.style.transition = ""; }, 500);
      });
    });
  }

  /* ================= CLICK-TO-PLAY EMBEDS ================= */
  document.querySelectorAll(".project__poster[data-video]").forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        const wrap = document.createElement("div");
        wrap.className = "project__embed";
        const frame = document.createElement("iframe");
        frame.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.video}?autoplay=1&rel=0`;
        frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        frame.allowFullscreen = true;
        frame.title = (btn.getAttribute("aria-label") || "Video player").replace("Play video: ", "");
        wrap.appendChild(frame);
        btn.replaceWith(wrap);
        if (ring) ring.classList.remove("is-play");
      },
      { once: true }
    );
  });

  /* ================= WATERMARK PARALLAX ================= */
  const mark = document.querySelector(".hero__watermark");
  if (mark && finePointer && !reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 36;
      const y = (e.clientY / window.innerHeight - 0.5) * 24;
      mark.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }, { passive: true });
  }

  /* ================= TIMECODE (25 fps) ================= */
  const tc = document.getElementById("timecode");
  if (tc && !reduceMotion) {
    const start = performance.now();
    const pad2 = (n) => String(n).padStart(2, "0");
    const tick = (now) => {
      const t = (now - start) / 1000;
      tc.textContent =
        `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor((t % 3600) / 60))}:` +
        `${pad2(Math.floor(t % 60))}:${pad2(Math.floor((t % 1) * 25))}`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ================= NAV TUCK ================= */
  const nav = document.querySelector(".nav");
  if (nav) {
    let lastY = window.scrollY;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (y > lastY + 6 && y > 260) nav.classList.add("nav--hidden");
      else if (y < lastY - 6 || y <= 260) nav.classList.remove("nav--hidden");
      lastY = y;
    }, { passive: true });
  }
})();
