import { startCinematicExperience } from "/motion.js";

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
  button.setAttribute("aria-live", "polite");

  let resetTimer = null;

  button.addEventListener("click", async () => {
    clearTimeout(resetTimer);
    button.setAttribute("aria-label", labels.aria);
    try {
      await navigator.clipboard.writeText(email);
      button.textContent = labels.copied;
      button.setAttribute("aria-label", labels.copied);
      button.classList.add("is-copied");
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        button.textContent = labels.copy;
        button.setAttribute("aria-label", labels.aria);
        button.classList.remove("is-copied");
      }, 2000);
    } catch {
      button.textContent = ja ? "コピーできませんでした" : "Could not copy";
      button.setAttribute("aria-label", ja ? "コピーできませんでした。アドレスを選択してコピーしてください" : "Copy failed. Select and copy the email address.");
    }
  });

  el.append(button);
};

// Keep the header and chapter rail in sync independently from visual effects.
// Reduced-motion and Save-Data visitors still need accurate navigation state.
const startChapterNavigation = (allowMotion) => {
  const navLinks = Array.from(document.querySelectorAll(".nav-list a[href^='#']"));
  const navById = new Map(navLinks.map((link) => [link.hash.slice(1), link]));
  const railTicks = Array.from(document.querySelectorAll(".rail-tick[data-rail-no]"));
  const railByNo = new Map(railTicks.map((tick) => [tick.dataset.railNo, tick]));
  const chapters = Array.from(document.querySelectorAll("[data-chapter]"));

  if (chapters.length === 0) {
    return { chapters, navigateToHash: null };
  }

  const setCurrentNav = (id) => {
    if (navLinks.length === 0) {
      return;
    }

    navLinks.forEach((link) => link.removeAttribute("aria-current"));
    navById.get(id)?.setAttribute("aria-current", "true");
  };

  let currentChapter = null;

  // One event, one truth: the rail, the chapter counters and anything added
  // later (sound, figure bands) all read the same "which chapter are we in".
  const setCurrentChapter = (section) => {
    if (!section || section === currentChapter) {
      return;
    }

    currentChapter = section;
    setCurrentNav(section.id);

    railTicks.forEach((tick) => tick.removeAttribute("aria-current"));
    railByNo.get(section.dataset.chapterNo)?.setAttribute("aria-current", "true");

    document.dispatchEvent(new CustomEvent("chapterchange", {
      detail: { no: section.dataset.chapterNo, name: section.dataset.chapterName }
    }));
  };

  const markCurrent = (el) => {
    const chapter = el?.hasAttribute("data-chapter")
      ? el
      : el?.id === "top"
        ? chapters[0]
        : el?.closest?.("[data-chapter]");

    if (chapter) {
      setCurrentChapter(chapter);
      return;
    }

    setCurrentNav(el?.id ?? "");
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
      return false;
    }

    const scroll = () => {
      markCurrent(target);
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: allowMotion && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant", block: "start" });

      if (location.hash !== hash) {
        history.pushState(null, "", hash);
      }
    };

    scroll();
    return true;
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const link = target?.closest("a[href^='#']");

    if (event.defaultPrevented || !link || link.hash.length <= 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const targetElement = getHashTarget(link.hash);

    if (!targetElement) {
      return;
    }

    event.preventDefault();
    moveToHash(link.hash, targetElement);
  });

  // A single reading line is more reliable than comparing only the entries
  // delivered by IntersectionObserver. That callback contains changed entries,
  // not a snapshot of every chapter, which could leave a previous chapter active.
  const syncCurrentChapter = () => {
    const readingLine = window.innerHeight * 0.3;
    let current = chapters[0];

    chapters.forEach((chapter) => {
      if (chapter.getBoundingClientRect().top <= readingLine) {
        current = chapter;
      }
    });

    setCurrentChapter(current);
  };

  let syncFrame = null;
  const requestSync = () => {
    if (syncFrame) {
      return;
    }

    syncFrame = requestAnimationFrame(() => {
      syncFrame = null;
      syncCurrentChapter();
    });
  };

  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync, { passive: true });

  const currentTarget = location.hash ? getHashTarget(location.hash) : null;
  if (currentTarget) {
    markCurrent(currentTarget);
  } else {
    syncCurrentChapter();
  }

  // Recheck after the browser restores a hash/scroll position and after the
  // first layout pass, when web fonts and section geometry may have settled.
  requestSync();

  const restoreHashPosition = () => {
    if (!location.hash) {
      return false;
    }

    const target = getHashTarget(location.hash);
    if (!target) {
      return false;
    }

    // Initial fragment scrolling happens before the enhanced Story expands.
    // Re-anchor without animation after that layout change so deep links do
    // not strand the reader thousands of pixels above their target.
    target.scrollIntoView({ behavior: "instant", block: "start" });
    markCurrent(target);
    return true;
  };

  return { chapters, navigateToHash: moveToHash, restoreHashPosition };
};

const startEnhancements = () => {
  const allowMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && navigator.connection?.saveData !== true;
  enhanceContact();
  const { navigateToHash, restoreHashPosition } = startChapterNavigation(allowMotion);
  startCommandPalette(navigateToHash);
  if (allowMotion) document.documentElement.classList.add("enhanced");
  startCinematicExperience();
  restoreHashPosition?.();
  document.fonts?.ready.then(() => restoreHashPosition?.());
  window.addEventListener("hashchange", () => restoreHashPosition?.());
};

// Command palette (⌘K): quick navigation across pages and external links.
// Built lazily into a native <dialog> so focus trapping and Esc come for free.
const startCommandPalette = (navigateToHash) => {
  const ja = document.documentElement.lang.startsWith("ja");
  const onHome = document.getElementById("projects") !== null;
  const home = ja ? "/" : "/en/";

  const t = ja
    ? {
        title: "コマンドパレット",
        open: "コマンドパレットを開く",
        placeholder: "移動先やリンクを検索…",
        empty: "見つかりませんでした",
        select: "選択",
        run: "開く",
        close: "閉じる",
        linksPage: "Links ページ",
        language: "English version",
        copy: "メールアドレスをコピー",
        copied: "コピーしました ✓"
      }
    : {
        title: "Command palette",
        open: "Open command palette",
        placeholder: "Search pages and links…",
        empty: "No results",
        select: "select",
        run: "open",
        close: "Close",
        linksPage: "Links page",
        language: "日本語版",
        copy: "Copy email address",
        copied: "Copied ✓"
      };

  const anchorHref = (hash) => (onHome ? hash : `${home}${hash}`);
  const languageHref = ja
    ? `/en${location.pathname}`.replace(/\/{2,}/g, "/")
    : location.pathname.replace(/^\/en/, "") || "/";

  const items = [
    { label: "Top", hint: anchorHref("#top"), href: anchorHref("#top") },
    { label: "Projects", keywords: "作品 ツール 音楽", hint: anchorHref("#projects"), href: anchorHref("#projects") },
    { label: "About", keywords: "紹介 概要 について", hint: anchorHref("#about"), href: anchorHref("#about") },
    { label: "Links", keywords: "リンク", hint: anchorHref("#links"), href: anchorHref("#links") },
    { label: "Contact", keywords: "連絡 問い合わせ メール", hint: anchorHref("#contact"), href: anchorHref("#contact") },
    { label: t.linksPage, hint: ja ? "/links/" : "/en/links/", href: ja ? "/links/" : "/en/links/" },
    { label: t.language, hint: languageHref, href: languageHref },
    { label: "GitHub", hint: "github.com/ma0dev0", href: "https://github.com/ma0dev0", external: true },
    { label: "X", hint: "x.com/ma0dev", href: "https://x.com/ma0dev", external: true },
    { label: "note", hint: "note.com/ma0dev", href: "https://note.com/ma0dev", external: true },
    { label: "BOOTH", hint: "ma0dev.booth.pm", href: "https://ma0dev.booth.pm/", external: true }
  ];

  const dialog = document.createElement("dialog");
  dialog.className = "cmdk";
  dialog.setAttribute("aria-label", t.title);
  dialog.innerHTML = [
    '<div class="cmdk-head">',
    '<span class="cmdk-glyph" aria-hidden="true">&gt;_</span>',
    `<input class="cmdk-input" type="text" placeholder="${t.placeholder}" aria-label="${t.placeholder}" autocomplete="off" spellcheck="false">`,
    `<button type="button" class="cmdk-esc" aria-label="${t.close}"><kbd>esc</kbd></button>`,
    "</div>",
    `<ul id="cmdk-results" class="cmdk-list" role="listbox" aria-label="${t.title}"></ul>`,
    `<p class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> ${t.select}</span><span><kbd>↵</kbd> ${t.run}</span></p>`
  ].join("");
  document.body.append(dialog);

  const input = dialog.querySelector(".cmdk-input");
  const list = dialog.querySelector(".cmdk-list");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-controls", "cmdk-results");
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("aria-autocomplete", "list");

  let filtered = items;
  let selected = 0;

  const select = (index) => {
    selected = index;
    Array.from(list.children).forEach((child, i) => {
      child.setAttribute("aria-selected", i === selected ? "true" : "false");
    });
    input.setAttribute("aria-activedescendant", `cmdk-item-${selected}`);
    list.children[selected]?.scrollIntoView({ block: "nearest" });
  };

  const run = (item) => {
    if (item.action) {
      item.action();
      return;
    }

    if (item.external) {
      dialog.close();
      window.open(item.href, "_blank", "noopener");
      return;
    }

    dialog.close();

    if (item.href.startsWith("#") && navigateToHash?.(item.href)) {
      return;
    }

    location.assign(item.href);
  };

  const renderList = () => {
    list.textContent = "";

    if (filtered.length === 0) {
      const empty = document.createElement("li");
      empty.className = "cmdk-empty";
      empty.setAttribute("role", "option");
      empty.setAttribute("aria-disabled", "true");
      empty.textContent = t.empty;
      list.append(empty);
      input.removeAttribute("aria-activedescendant");
      return;
    }

    filtered.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = "cmdk-item";
      li.id = `cmdk-item-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === selected ? "true" : "false");

      const label = document.createElement("span");
      label.className = "cmdk-item-label";
      label.textContent = item.label;

      const hint = document.createElement("span");
      hint.className = "cmdk-item-hint";
      hint.textContent = item.hint;

      li.append(label, hint);
      li.addEventListener("pointermove", () => {
        if (selected !== i) {
          select(i);
        }
      }, { passive: true });
      li.addEventListener("click", () => run(item));
      list.append(li);
    });

    input.setAttribute("aria-activedescendant", `cmdk-item-${selected}`);
  };

  const applyFilter = () => {
    const query = input.value.trim().toLowerCase();
    filtered = query
      ? items.filter((item) => `${item.label} ${item.hint} ${item.keywords ?? ""}`.toLowerCase().includes(query))
      : items;
    selected = 0;
    renderList();
  };

  // Copy-email action only where the obfuscated address exists (home page).
  const contactEl = document.querySelector(".contact-address[data-user][data-domain]");

  if (contactEl && navigator.clipboard) {
    items.push({
      label: t.copy,
      hint: "clipboard",
      action: async () => {
        try {
          await navigator.clipboard.writeText(`${contactEl.dataset.user}@${contactEl.dataset.domain}`);
          const current = list.querySelector('[aria-selected="true"] .cmdk-item-label');

          if (current) {
            current.textContent = t.copied;
          }

          setTimeout(() => dialog.close(), 700);
        } catch {
          dialog.close();
        }
      }
    });
  }

  const open = () => {
    if (dialog.open) {
      return;
    }

    input.value = "";
    applyFilter();
    dialog.showModal();
    input.focus();
  };

  // The open attribute is the single source of truth: syncing the html-level
  // class off it covers every close path (Esc, backdrop click, item actions)
  // without depending on the close event's timing.
  new MutationObserver(() => {
    document.documentElement.classList.toggle("cmdk-open", dialog.open);
  }).observe(dialog, { attributes: true, attributeFilter: ["open"] });

  // Click on the backdrop (target is the dialog itself) closes the palette.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.querySelector(".cmdk-esc").addEventListener("click", () => dialog.close());

  input.addEventListener("input", applyFilter);

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (filtered.length > 0) {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        select((selected + delta + filtered.length) % filtered.length);
      }

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[selected];

      if (item) {
        run(item);
      }
    }
  });

  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();

      if (dialog.open) {
        dialog.close();
      } else {
        open();
      }
    }
  });

  const navList = document.querySelector(".nav-list");

  if (navList) {
    const isMac = /Mac|iP/.test(navigator.userAgentData?.platform ?? navigator.platform);
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-cmdk";
    button.textContent = isMac ? "⌘K" : "Ctrl K";
    button.setAttribute("aria-label", t.open);
    button.addEventListener("click", open);
    li.append(button);
    navList.append(li);
  }
};


startEnhancements();
