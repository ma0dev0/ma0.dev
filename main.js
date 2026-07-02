const startEnhancements = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;

  if (prefersReducedMotion.matches || saveData) {
    return;
  }

  document.documentElement.classList.add("enhanced");

  const moveToHash = (hash) => {
    let id = hash.slice(1);

    try {
      id = decodeURIComponent(id);
    } catch {
      return;
    }

    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    const scroll = () => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", hash);
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

    event.preventDefault();
    moveToHash(link.hash);
  });

  const navLinks = Array.from(document.querySelectorAll(".nav-list a[href^='#']"));

  if ("IntersectionObserver" in window && navLinks.length > 0) {
    const navById = new Map(navLinks.map((link) => [link.hash.slice(1), link]));
    const sections = Array.from(navById.keys(), (id) => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!current) {
          return;
        }

        navLinks.forEach((link) => link.removeAttribute("aria-current"));
        navById.get(current.target.id)?.setAttribute("aria-current", "true");
      },
      {
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.1, 0.35, 0.6]
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  const reactiveItems = document.querySelectorAll(".card, .link-button, .button, .project-link");

  reactiveItems.forEach((item) => {
    item.addEventListener("pointermove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      item.style.setProperty("--spotlight-x", `${x.toFixed(2)}%`);
      item.style.setProperty("--spotlight-y", `${y.toFixed(2)}%`);
    });

    item.addEventListener("pointerleave", () => {
      item.style.removeProperty("--spotlight-x");
      item.style.removeProperty("--spotlight-y");
    });
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
