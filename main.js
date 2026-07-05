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

  // Spotlight position drives the inner wash, the border glow, and the hero glare.
  const reactiveItems = document.querySelectorAll(".card, .link-button, .button, .project-link, .hero-visual");
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
  startHeroField(prefersReducedMotion);
};

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

// 3D tilt on the hero visual, driven by pointer position.
const startTilt = () => {
  const visual = document.querySelector(".hero-visual");

  if (!visual || !window.matchMedia("(hover: hover)").matches) {
    return;
  }

  let frame = null;
  let point = null;

  visual.addEventListener("pointermove", (event) => {
    const rect = visual.getBoundingClientRect();

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
        visual.style.setProperty("--tilt-x", `${(-point.y * 6).toFixed(2)}deg`);
        visual.style.setProperty("--tilt-y", `${(point.x * 8).toFixed(2)}deg`);
      }

      frame = null;
    });
  }, { passive: true });

  visual.addEventListener("pointerleave", () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }

    point = null;
    visual.style.removeProperty("--tilt-x");
    visual.style.removeProperty("--tilt-y");
  }, { passive: true });
};

// Hero buttons lean toward the cursor and spring back on leave.
const startMagneticButtons = () => {
  if (!window.matchMedia("(hover: hover)").matches) {
    return;
  }

  document.querySelectorAll(".hero-actions .button").forEach((button) => {
    const strength = 0.22;
    const limit = 7;

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

// Constellation field behind the hero. Pauses offscreen and in hidden tabs.
const startHeroField = (prefersReducedMotion) => {
  const canvas = document.querySelector(".hero-field");
  const context = canvas?.getContext("2d");

  if (!canvas || !context) {
    return;
  }

  const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const pointerFine = window.matchMedia("(pointer: fine)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const linkDistance = 130;

  let width = 0;
  let height = 0;
  let particles = [];
  let frame = null;
  let visible = true;
  let pointer = { x: 0.5, y: 0.5 };
  let drift = { x: 0.5, y: 0.5 };

  const palette = () => (darkScheme.matches
    ? { dot: [168, 182, 255], line: [150, 165, 255] }
    : { dot: [82, 98, 210], line: [96, 112, 220] });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();

    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(110, Math.round((width * height) / 12000));

    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: 0.8 + Math.random() * 1.4,
      depth: 0.35 + Math.random() * 0.65
    }));
  };

  const step = () => {
    frame = null;

    if (!visible || document.hidden) {
      return;
    }

    const colors = palette();

    drift.x += (pointer.x - drift.x) * 0.04;
    drift.y += (pointer.y - drift.y) * 0.04;

    context.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
    }

    const offsetX = (drift.x - 0.5) * 26;
    const offsetY = (drift.y - 0.5) * 18;

    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      const ax = a.x + offsetX * a.depth;
      const ay = a.y + offsetY * a.depth;

      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const bx = b.x + offsetX * b.depth;
        const by = b.y + offsetY * b.depth;
        const dx = ax - bx;
        const dy = ay - by;
        const distance = Math.hypot(dx, dy);

        if (distance < linkDistance) {
          const alpha = (1 - distance / linkDistance) * 0.2;

          context.strokeStyle = `rgba(${colors.line[0]}, ${colors.line[1]}, ${colors.line[2]}, ${alpha.toFixed(3)})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(ax, ay);
          context.lineTo(bx, by);
          context.stroke();
        }
      }

      context.fillStyle = `rgba(${colors.dot[0]}, ${colors.dot[1]}, ${colors.dot[2]}, ${(0.35 + a.depth * 0.4).toFixed(3)})`;
      context.beginPath();
      context.arc(ax, ay, a.r, 0, Math.PI * 2);
      context.fill();
    }

    frame = requestAnimationFrame(step);
  };

  const play = () => {
    if (!frame && visible && !document.hidden && !prefersReducedMotion.matches) {
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

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;

      if (visible) {
        play();
      } else {
        pause();
      }
    }).observe(canvas);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pause();
    } else {
      play();
    }
  });

  prefersReducedMotion.addEventListener?.("change", () => {
    if (prefersReducedMotion.matches) {
      pause();
      context.clearRect(0, 0, width, height);
    } else {
      play();
    }
  });

  if (pointerFine) {
    window.addEventListener("pointermove", (event) => {
      pointer = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight
      };
    }, { passive: true });
  }

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
