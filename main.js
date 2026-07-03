const startEnhancements = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;

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

  const reactiveItems = document.querySelectorAll(".card, .link-button, .button, .project-link");
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
