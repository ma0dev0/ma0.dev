// Contact: assemble the address from parts (kept out of the raw HTML for spam
// hygiene), swap the obfuscated text for a real mailto link, and add a copy button.
const enhanceContact = () => {
  const el = document.querySelector(".contact-address[data-user][data-domain]");

  if (!el) {
    return;
  }

  const email = `${el.dataset.user}@${el.dataset.domain}`;
  const ja = document.documentElement.lang.startsWith("ja");
  const labels = ja
    ? { copy: "コピー", copied: "コピーしました", aria: "メールアドレスをコピー" }
    : { copy: "Copy", copied: "Copied", aria: "Copy email address" };

  const link = document.createElement("a");
  link.className = "contact-email";
  link.href = `mailto:${email}`;
  link.textContent = email;

  el.textContent = "";
  el.append(link);

  if (!navigator.clipboard) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "contact-copy";
  button.textContent = labels.copy;
  button.setAttribute("aria-label", labels.aria);

  let resetTimer = null;

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email);
      button.textContent = labels.copied;
      button.classList.add("is-copied");
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        button.textContent = labels.copy;
        button.classList.remove("is-copied");
      }, 2000);
    } catch {
      /* clipboard blocked — the mailto link is still available */
    }
  });

  el.append(button);
};

const startEnhancements = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;

  // Functional, not decorative — enhance before the motion gate so every visitor
  // gets a real mailto link and copy button.
  enhanceContact();

  if (prefersReducedMotion.matches || saveData) {
    return;
  }

  document.documentElement.classList.add("enhanced");

  const navLinks = Array.from(document.querySelectorAll(".nav-list a[href^='#']"));
  const navById = new Map(navLinks.map((link) => [link.hash.slice(1), link]));

  const setCurrentNav = (id) => {
    if (navLinks.length === 0) {
      return;
    }

    navLinks.forEach((link) => link.removeAttribute("aria-current"));
    navById.get(id)?.setAttribute("aria-current", "true");
  };

  const getHashTarget = (hash) => {
    let id = hash.slice(1);

    try {
      id = decodeURIComponent(id);
    } catch {
      return null;
    }

    return document.getElementById(id);
  };

  const moveToHash = (hash, target = getHashTarget(hash)) => {
    if (!target) {
      return;
    }

    const scroll = () => {
      setCurrentNav(target.id);
      target.scrollIntoView({ behavior: "smooth", block: "start" });

      if (location.hash !== hash) {
        history.pushState(null, "", hash);
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(scroll);
      return;
    }

    scroll();
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const link = target?.closest("a[href^='#']");

    if (!link || link.hash.length <= 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const targetElement = getHashTarget(link.hash);

    if (!targetElement) {
      return;
    }

    event.preventDefault();
    moveToHash(link.hash, targetElement);
  });

  if (location.hash) {
    const currentTarget = getHashTarget(location.hash);

    if (currentTarget) {
      setCurrentNav(currentTarget.id);
    }
  }

  if ("IntersectionObserver" in window && navLinks.length > 0) {
    const sections = Array.from(navById.keys(), (id) => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!current) {
          return;
        }

        setCurrentNav(current.target.id);
      },
      {
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.1, 0.35, 0.6]
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  // Spotlight position drives the inner wash and the border ring glow (CSS
  // handles the opacity transition on :hover/:focus-within — this only tracks
  // pointer position via custom properties).
  const reactiveItems = document.querySelectorAll(".card, .link-button");
  const frames = new WeakMap();
  const points = new WeakMap();

  reactiveItems.forEach((item) => {
    item.addEventListener("pointermove", (event) => {
      const rect = item.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      points.set(item, { x, y });

      if (frames.has(item)) {
        return;
      }

      const frame = requestAnimationFrame(() => {
        const point = points.get(item);

        if (point) {
          item.style.setProperty("--spotlight-x", `${point.x.toFixed(2)}%`);
          item.style.setProperty("--spotlight-y", `${point.y.toFixed(2)}%`);
        }

        frames.delete(item);
      });

      frames.set(item, frame);
    }, { passive: true });

    item.addEventListener("pointerleave", () => {
      const frame = frames.get(item);

      if (frame) {
        cancelAnimationFrame(frame);
      }

      frames.delete(item);
      points.delete(item);
      item.style.removeProperty("--spotlight-x");
      item.style.removeProperty("--spotlight-y");
    }, { passive: true });
  });

  startTilt();
  startMagneticButtons();
  startAuroraField(prefersReducedMotion);
  startParticleField();
  startStoryScroller();
};

// 3D tilt on project cards, driven by pointer position. Runs alongside the
// spotlight listener above (same precedent as the old hero-visual tilt).
const startTilt = () => {
  if (!window.matchMedia("(hover: hover)").matches) {
    return;
  }

  document.querySelectorAll(".project-card").forEach((card) => {
    let frame = null;
    let point = null;

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      point = {
        x: (event.clientX - rect.left) / rect.width - 0.5,
        y: (event.clientY - rect.top) / rect.height - 0.5
      };

      if (frame) {
        return;
      }

      frame = requestAnimationFrame(() => {
        if (point) {
          card.style.setProperty("--tilt-x", `${(-point.y * 5).toFixed(2)}deg`);
          card.style.setProperty("--tilt-y", `${(point.x * 7).toFixed(2)}deg`);
        }

        frame = null;
      });
    }, { passive: true });

    card.addEventListener("pointerleave", () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }

      point = null;
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    }, { passive: true });
  });
};

// Hero buttons lean toward the cursor and spring back on leave.
const startMagneticButtons = () => {
  if (!window.matchMedia("(hover: hover)").matches) {
    return;
  }

  document.querySelectorAll(".hero-actions .button").forEach((button) => {
    const strength = 0.22;
    const limit = 8;

    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * strength;
      const y = (event.clientY - rect.top - rect.height / 2) * strength;

      button.style.setProperty("--mag-x", `${Math.max(-limit, Math.min(limit, x)).toFixed(2)}px`);
      button.style.setProperty("--mag-y", `${Math.max(-limit, Math.min(limit, y)).toFixed(2)}px`);
    }, { passive: true });

    button.addEventListener("pointerleave", () => {
      button.style.setProperty("--mag-x", "0px");
      button.style.setProperty("--mag-y", "0px");
    }, { passive: true });
  });
};

// Aurora: a fixed full-viewport WebGL fbm-noise field behind the whole page.
// Pauses in hidden tabs; position:fixed means it's always "in view" by definition.
const startAuroraField = (prefersReducedMotion) => {
  const canvas = document.querySelector(".aurora-canvas");
  const gl = canvas?.getContext("webgl", { alpha: true, antialias: false });

  if (!canvas || !gl) {
    return;
  }

  const vertexSource = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  const fragmentSource = [
    "precision highp float;",
    "uniform vec2 u_res; uniform float u_time; uniform vec2 u_ptr; uniform float u_int; uniform float u_scroll;",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); }",
    "float fbm(vec2 p){ float v = 0.0; float a = 0.5; for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / u_res;",
    "  vec2 p = uv * vec2(u_res.x/u_res.y, 1.0);",
    "  p.y += u_scroll * 0.9;",
    "  float t = u_time * 0.045;",
    "  vec2 drift = (u_ptr - 0.5) * 0.35;",
    "  float n1 = fbm(p*1.35 + vec2(t*0.7, -t*0.45) + drift);",
    "  float n2 = fbm(p*2.1 - vec2(t*0.32, t*0.58) - drift*0.6);",
    "  float n3 = fbm(p*1.7 + vec2(-t*0.5, t*0.35));",
    "  vec3 cyan = vec3(0.30, 0.85, 0.95);",
    "  vec3 magenta = vec3(0.88, 0.42, 0.90);",
    "  vec3 mint = vec3(0.40, 0.92, 0.65);",
    "  vec3 colA = cyan * smoothstep(0.42, 0.95, n1)",
    "            + magenta * smoothstep(0.50, 1.0, n2) * 0.75",
    "            + mint * smoothstep(0.55, 1.0, n3 * n1 * 1.8) * 0.55;",
    "  vec3 colB = magenta * smoothstep(0.42, 0.95, n1)",
    "            + mint * smoothstep(0.50, 1.0, n2) * 0.75",
    "            + cyan * smoothstep(0.55, 1.0, n3 * n1 * 1.8) * 0.55;",
    "  vec3 col = mix(colA, colB, u_scroll);",
    "  float vert = smoothstep(0.05, 1.05, uv.y);",
    "  gl_FragColor = vec4(col * u_int * vert * 0.42, 1.0) * (u_int * vert);",
    "}"
  ].join("\n");

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return;
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "u_res");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uPtr = gl.getUniformLocation(program, "u_ptr");
  const uInt = gl.getUniformLocation(program, "u_int");
  const uScroll = gl.getUniformLocation(program, "u_scroll");

  const intensity = 0.65;
  let frame = null;
  let pointer = { x: 0.5, y: 0.5 };
  let smooth = { x: 0.5, y: 0.5 };
  let scrollSmooth = 0;
  const start = performance.now();

  const resize = () => {
    const w = Math.max(2, Math.round(canvas.clientWidth * 0.5));
    const h = Math.max(2, Math.round(canvas.clientHeight * 0.5));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  const step = () => {
    frame = null;

    if (document.hidden) {
      return;
    }

    resize();
    smooth.x += (pointer.x - smooth.x) * 0.03;
    smooth.y += (pointer.y - smooth.y) * 0.03;

    // Scroll progress eases the palette from cyan- to magenta-dominant and
    // drifts the noise field, so the aurora itself responds to scrolling.
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTarget = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    scrollSmooth += (scrollTarget - scrollSmooth) * 0.05;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - start) / 1000);
    gl.uniform2f(uPtr, smooth.x, 1 - smooth.y);
    gl.uniform1f(uInt, intensity);
    gl.uniform1f(uScroll, scrollSmooth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    frame = requestAnimationFrame(step);
  };

  const play = () => {
    if (!frame && !document.hidden) {
      frame = requestAnimationFrame(step);
    }
  };

  const pause = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pause();
    } else {
      play();
    }
  });

  window.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight };
  }, { passive: true });

  prefersReducedMotion.addEventListener?.("change", () => {
    if (prefersReducedMotion.matches) {
      pause();
    } else {
      play();
    }
  });

  play();
};

// Shared shape samplers: rasterise a glyph or the paw into an offscreen
// canvas and return shuffled points in 0..1 space. Used by both the hero
// particle field and the story scroller.
const sampleShapePoints = (draw) => {
  const s = 480;
  const off = document.createElement("canvas");
  off.width = s;
  off.height = s;
  const offCtx = off.getContext("2d");
  offCtx.fillStyle = "#fff";
  draw(offCtx, s);

  const data = offCtx.getImageData(0, 0, s, s).data;
  const points = [];
  const step = 3;

  for (let y = 0; y < s; y += step) {
    for (let x = 0; x < s; x += step) {
      if (data[(y * s + x) * 4 + 3] > 128) {
        points.push({ x: x / s, y: y / s });
      }
    }
  }

  for (let i = points.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = points[i];
    points[i] = points[j];
    points[j] = t;
  }

  return points;
};

const drawTextShape = (text, size) => (c, s) => {
  c.font = `700 ${Math.floor(s * size)}px "Instrument Sans", system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, s / 2, s * 0.52);
};

const drawPawShape = (c, s) => {
  const cx = s / 2;
  const cy = s * 0.6;

  const ellipse = (x, y, rx, ry) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  };

  ellipse(cx, cy, s * 0.155, s * 0.13);
  ellipse(cx - s * 0.175, cy - s * 0.135, s * 0.055, s * 0.072);
  ellipse(cx - s * 0.062, cy - s * 0.205, s * 0.056, s * 0.075);
  ellipse(cx + s * 0.062, cy - s * 0.205, s * 0.056, s * 0.075);
  ellipse(cx + s * 0.175, cy - s * 0.135, s * 0.055, s * 0.072);
};

// Particle field: canvas 2D dots that morph between "ma0", a paw shape, and
// "OSS", drawn by sampling an offscreen canvas. Reacts to pointer proximity
// and click bursts inside the hero visual.
const startParticleField = () => {
  const canvas = document.querySelector(".particle-canvas");
  const ctx = canvas?.getContext("2d");
  const field = canvas?.closest(".hero-visual");

  if (!canvas || !ctx || !field) {
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let frame = null;
  let visible = true;
  let particles = [];
  let shapes = [];
  let shapeIndex = 0;
  let fieldPointer = null;
  let burstAt = null;

  const colorFor = () => {
    const r = Math.random();

    if (r < 0.46) return "rgba(96, 218, 240,";
    if (r < 0.72) return "rgba(235, 240, 252,";
    if (r < 0.9) return "rgba(226, 120, 224,";
    return "rgba(120, 235, 175,";
  };

  const buildShapes = () => {
    shapes = [
      sampleShapePoints(drawTextShape("ma0", 0.36)),
      sampleShapePoints(drawPawShape),
      sampleShapePoints(drawTextShape("OSS", 0.34))
    ];
  };

  const density = () => (window.innerWidth < 560 ? 0.55 : 1);

  const assign = () => {
    const points = shapes[shapeIndex];

    if (!points || points.length === 0) {
      return;
    }

    particles.forEach((particle, i) => {
      const target = points[i % points.length];
      particle.tx = target.x;
      particle.ty = target.y;
    });
  };

  const build = () => {
    buildShapes();
    const count = Math.round(1300 * density());

    particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      r: 0.7 + Math.random() * 1.3,
      c: colorFor(),
      a: 0.5 + Math.random() * 0.5
    }));

    assign();
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
  };

  const step = () => {
    frame = null;

    if (!visible || document.hidden) {
      return;
    }

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    const burst = burstAt;
    burstAt = null;

    for (const p of particles) {
      const tx = p.tx * width;
      const ty = p.ty * height;
      const px = p.x * width;
      const py = p.y * height;
      p.vx += (tx - px) * 0.014;
      p.vy += (ty - py) * 0.014;

      if (fieldPointer) {
        const dx = px - fieldPointer.x;
        const dy = py - fieldPointer.y;
        const d2 = dx * dx + dy * dy;
        const radius = 110;

        if (d2 < radius * radius && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / radius) * 2.6;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }

      if (burst) {
        const dx = px - burst.x;
        const dy = py - burst.y;
        const d = Math.max(6, Math.hypot(dx, dy));
        const f = Math.max(0, 1 - d / (width * 0.7)) * (14 + Math.random() * 10);
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }

      p.vx *= 0.86;
      p.vy *= 0.86;
      p.x += p.vx / width;
      p.y += p.vy / height;

      ctx.fillStyle = `${p.c} ${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    frame = requestAnimationFrame(step);
  };

  const play = () => {
    if (!frame && visible && !document.hidden) {
      frame = requestAnimationFrame(step);
    }
  };

  const pause = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  resize();

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      build();
      play();
    });
  } else {
    build();
  }

  build();

  new ResizeObserver(resize).observe(canvas);

  new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;

    if (visible) {
      play();
    } else {
      pause();
    }
  }).observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pause();
    } else {
      play();
    }
  });

  setInterval(() => {
    if (!visible || document.hidden) {
      return;
    }

    shapeIndex = (shapeIndex + 1) % shapes.length;
    assign();
  }, 5000);

  field.addEventListener("pointermove", (event) => {
    const rect = field.getBoundingClientRect();
    fieldPointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, { passive: true });

  field.addEventListener("pointerleave", () => {
    fieldPointer = null;
  }, { passive: true });

  field.addEventListener("click", (event) => {
    const rect = field.getBoundingClientRect();
    burstAt = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  play();
};

// Story: a scroll-scrubbed particle film inside a sticky full-viewport stage.
// Every frame is a pure function of scroll progress — scrolling forward plays
// the movie (scatter → "ma0" → paw → "OSS" → dissolve), scrolling back
// rewinds it frame-perfect. Captions and the HUD are driven off the same
// progress value.
const startStoryScroller = () => {
  const section = document.querySelector(".story");
  const track = section?.querySelector(".story-track");
  const canvas = section?.querySelector(".story-canvas");
  const ctx = canvas?.getContext("2d");

  if (!section || !track || !canvas || !ctx) {
    return;
  }

  const captions = Array.from(section.querySelectorAll(".story-caption"));
  const sceneNo = section.querySelector(".story-scene-no");
  const progressFill = section.querySelector(".story-progress-fill");

  // Timeline keyframes. shape ids: 0 scattered cloud, 1 "ma0", 2 paw,
  // 3 "OSS", 4 dissolve. Equal t on consecutive keys with the same shape
  // means "hold"; differing shapes morph with an eased swirl between them.
  const KEYS = [
    { t: 0, shape: 0 },
    { t: 0.1, shape: 0 },
    { t: 0.3, shape: 1 },
    { t: 0.42, shape: 1 },
    { t: 0.58, shape: 2 },
    { t: 0.7, shape: 2 },
    { t: 0.84, shape: 3 },
    { t: 0.93, shape: 3 },
    { t: 1.0001, shape: 4 }
  ];

  const CAPTION_WINDOWS = [
    [0.015, 0.14],
    [0.25, 0.44],
    [0.53, 0.72],
    [0.79, 0.945]
  ];

  // Weighted per-scene palettes (scatter / ma0 / paw / OSS)
  const PALETTES = [
    [[150, 175, 205], [150, 175, 205], [96, 218, 240], [235, 240, 252]],
    [[96, 218, 240], [96, 218, 240], [235, 240, 252], [120, 235, 175]],
    [[226, 120, 224], [235, 240, 252], [226, 120, 224], [96, 218, 240]],
    [[120, 235, 175], [96, 218, 240], [120, 235, 175], [235, 240, 252]]
  ];

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let frame = null;
  let inView = true;
  let built = false;
  let particles = [];

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

  const build = () => {
    const shapes = [
      sampleShapePoints(drawTextShape("ma0", 0.34)),
      sampleShapePoints(drawPawShape),
      sampleShapePoints(drawTextShape("OSS", 0.32))
    ];

    const count = Math.round(window.innerWidth < 560 ? 650 : 1500);

    particles = Array.from({ length: count }, (_, i) => {
      const swirlAngle = Math.random() * Math.PI * 2;
      const exitAngle = Math.random() * Math.PI * 2;

      return {
        cloudAngle: Math.random() * Math.PI * 2,
        cloudRadius: Math.sqrt(Math.random()),
        swirlX: Math.cos(swirlAngle),
        swirlY: Math.sin(swirlAngle),
        swirlAmp: 0.05 + Math.random() * 0.16,
        exitX: Math.cos(exitAngle),
        exitY: Math.sin(exitAngle),
        wobble: Math.random() * Math.PI * 2,
        r: 0.7 + Math.random() * 1.5,
        a: 0.45 + Math.random() * 0.55,
        colors: PALETTES.map((palette) => palette[Math.floor(Math.random() * palette.length)]),
        targets: shapes.map((points) => points[i % points.length])
      };
    });

    built = true;
  };

  // Stage-space position of a particle for a given shape id at progress p.
  const shapePos = (particle, shape, p, out) => {
    const side = Math.min(width * 0.92, height * 0.74);
    const cx = width / 2;
    const cy = height * 0.46;

    if (shape === 0) {
      const ang = particle.cloudAngle + p * 1.4;
      out.x = cx + Math.cos(ang) * particle.cloudRadius * width * 0.46;
      out.y = cy + Math.sin(ang) * particle.cloudRadius * height * 0.4;
      return;
    }

    if (shape === 4) {
      const push = Math.max(width, height) * 0.75;
      const base = particle.targets[2];
      out.x = cx + (base.x - 0.5) * side + particle.exitX * push;
      out.y = cy + (base.y - 0.5) * side + particle.exitY * push;
      return;
    }

    const pt = particle.targets[shape - 1];
    out.x = cx + (pt.x - 0.5) * side;
    out.y = cy + (pt.y - 0.5) * side;
  };

  const posA = { x: 0, y: 0 };
  const posB = { x: 0, y: 0 };

  const render = (p, now) => {
    let k = 0;

    while (k < KEYS.length - 2 && KEYS[k + 1].t <= p) {
      k += 1;
    }

    const from = KEYS[k];
    const to = KEYS[k + 1];
    const span = to.t - from.t;
    const local = span > 0 ? clamp01((p - from.t) / span) : 0;
    const morphing = from.shape !== to.shape;
    const e = morphing ? smoother(local) : 0;
    const swirl = morphing ? Math.sin(Math.PI * e) : 0;
    const alphaMul = to.shape === 4 ? 1 - e : 1;
    const sizeRef = Math.min(width, height);

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    for (const particle of particles) {
      shapePos(particle, from.shape, p, posA);
      let x = posA.x;
      let y = posA.y;
      let [cr, cg, cb] = particle.colors[Math.min(from.shape, 3)];

      if (morphing) {
        shapePos(particle, to.shape, p, posB);
        x += (posB.x - x) * e + particle.swirlX * particle.swirlAmp * sizeRef * swirl;
        y += (posB.y - y) * e + particle.swirlY * particle.swirlAmp * sizeRef * swirl;

        const target = particle.colors[Math.min(to.shape, 3)];
        cr += (target[0] - cr) * e;
        cg += (target[1] - cg) * e;
        cb += (target[2] - cb) * e;
      }

      // Idle shimmer so held frames still feel alive between scrolls
      x += Math.sin(now * 0.0011 + particle.wobble) * 1.6;
      y += Math.cos(now * 0.0009 + particle.wobble * 1.7) * 1.6;

      ctx.fillStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${(particle.a * alphaMul).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, particle.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const updateOverlay = (p) => {
    captions.forEach((caption, i) => {
      const window_ = CAPTION_WINDOWS[i];

      if (!window_) {
        return;
      }

      const [start, end] = window_;
      const fade = 0.045;
      const alpha = clamp01((p - start) / fade) * clamp01((end - p) / fade);
      const drift = (p - (start + end) / 2) / (end - start);

      caption.style.opacity = alpha.toFixed(3);
      caption.style.translate = `0 ${(-drift * 46).toFixed(1)}px`;
    });

    if (progressFill) {
      progressFill.style.scale = `${p.toFixed(4)} 1`;
    }

    if (sceneNo) {
      const scene = p < 0.2 ? 1 : p < 0.5 ? 2 : p < 0.77 ? 3 : 4;
      const label = `0${scene}`;

      if (sceneNo.textContent !== label) {
        sceneNo.textContent = label;
      }
    }
  };

  const step = () => {
    frame = null;

    if (!inView || document.hidden) {
      return;
    }

    const rect = track.getBoundingClientRect();
    const range = rect.height - window.innerHeight;
    const p = range > 0 ? clamp01(-rect.top / range) : 0;

    if (built) {
      render(p, performance.now());
      updateOverlay(p);
    }

    frame = requestAnimationFrame(step);
  };

  const play = () => {
    if (!frame && inView && !document.hidden) {
      frame = requestAnimationFrame(step);
    }
  };

  const pause = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();

  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => {
    build();
    play();
  });

  new ResizeObserver(resize).observe(canvas);

  new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true;

    if (inView) {
      play();
    } else {
      pause();
    }
  }).observe(track);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pause();
    } else {
      play();
    }
  });

  play();
};

const scheduleEnhancements = () => {
  if ("scheduler" in window && "postTask" in window.scheduler) {
    window.scheduler.postTask(startEnhancements, { priority: "background" });
    return;
  }

  if ("requestIdleCallback" in window) {
    requestIdleCallback(startEnhancements, { timeout: 1400 });
    return;
  }

  setTimeout(startEnhancements, 0);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleEnhancements, { once: true });
} else {
  scheduleEnhancements();
}
