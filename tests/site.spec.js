import { expect, test } from "@playwright/test";


const railCurrent = (page) => page.locator('.rail-tick[aria-current="true"]');

const expectCurrentChapter = async (page, href) => {
  await expect(railCurrent(page)).toHaveCount(1);
  await expect(railCurrent(page)).toHaveAttribute("href", href);
};

const expectTargetNearTop = async (page, id) => {
  await expect.poll(async () => {
    const top = await page.locator(`#${id}`).evaluate((element) => Math.round(element.getBoundingClientRect().top));
    return top >= -1 && top <= 105;
  }).toBe(true);
};


test("chapter rail stays synchronized in both motion modes", async ({ page }) => {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");

    for (const [href, id] of [
      ["#chapter-origin", "chapter-origin"],
      ["#projects", "projects"],
      ["#about", "about"],
      ["#links", "links"],
      ["#contact", "contact"],
      ["#top", "top"]
    ]) {
      await page.locator(`.rail-tick[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expectCurrentChapter(page, href);
      await expectTargetNearTop(page, id);
    }
  }
});


test("deep links remain accurate after page enhancement and font loading", async ({ page }) => {
  for (const [path, href, id] of [
    ["/", "#contact", "contact"],
    ["/", "#top", "top"],
    ["/en/", "#links", "links"]
  ]) {
    await page.goto(`${path}?deep=${id}${href}`);
    await expect(page.locator("html")).toHaveClass(/enhanced/);
    await expectCurrentChapter(page, href);
    await expectTargetNearTop(page, id);
  }
});


test("command palette uses accessible instant navigation with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Control+K");
  await expect(page.locator("dialog")).toBeVisible();
  await page.locator(".cmdk-input").fill("contact");
  await page.keyboard.press("Enter");

  await expect(page.locator("dialog")).not.toBeVisible();
  await expectCurrentChapter(page, "#contact");
  await expectTargetNearTop(page, "contact");
  await expect(page.locator("html")).not.toHaveClass(/enhanced/);
});


test("home pages never create a horizontal scroll range", async ({ page }) => {
  for (const path of ["/", "/en/"]) {
    for (const width of [320, 375, 760, 761, 1180, 1181, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.locator(".nav-cmdk")).toBeAttached();

      const geometry = await page.evaluate(() => {
        const caption = document.querySelector(".hero-visual-caption").getBoundingClientRect();
        window.scrollTo({ left: 999, top: 0, behavior: "instant" });
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollX: window.scrollX,
          captionLeft: caption.left,
          captionRight: caption.right
        };
      });

      expect(geometry.scrollWidth).toBe(geometry.clientWidth);
      expect(geometry.scrollX).toBe(0);
      expect(geometry.captionLeft).toBeGreaterThanOrEqual(0);
      expect(geometry.captionRight).toBeLessThanOrEqual(geometry.clientWidth);
    }
  }
});


test("all routes load without browser errors and project images decode", async ({ page }) => {
  const problems = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.push(`${response.status()} ${response.url()}`);
    }
  });

  for (const path of [
    "/",
    "/en/",
    "/links/",
    "/en/links/",
    "/dopasta-tiktok-mcp/privacy/",
    "/dopasta-tiktok-mcp/terms/"
  ]) {
    const response = await page.goto(path);
    expect(response.status()).toBe(200);

    if (path === "/" || path === "/en/") {
      await page.locator("#projects").scrollIntoViewIfNeeded();
      await expect.poll(async () => page.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0))).toBe(true);
    }
  }

  expect(problems).toEqual([]);
});

test("both released products are directly reachable without category controls", async ({ page }) => {
  for (const path of ["/", "/en/"]) {
    await page.goto(path + '#projects');
    await expect(page.locator('.project-card')).toHaveCount(2);
    await expect(page.locator('#projects')).not.toContainText('ドパスタ');
    await expect(page.locator('.project-filters')).toHaveCount(0);
    const links = page.locator('.project-link');
    await expect(links.nth(0)).toHaveAttribute('href', 'https://github.com/ma0dev0/desktop-usage-meter');
    await expect(links.nth(1)).toHaveAttribute('href', 'https://github.com/ma0dev0/quiet-links');
    await links.nth(1).focus();
    await expect(links.nth(1)).toBeFocused();
    await expect(links.nth(1)).toBeInViewport();
  }
});

test("palette handles empty results and restores focus on Escape", async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('.nav-cmdk');
  await trigger.click();
  await page.locator('.cmdk-input').fill('no-such-destination-xyz');
  await expect(page.locator('.cmdk-empty')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("content, images and primary navigation remain usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const path of ['/', '/en/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.hero-visual')).toBeVisible();
    await expect(page.locator('.project-filters')).toBeHidden();
    await page.locator('.primary-button').click();
    await expect(page).toHaveURL(/#projects$/);
    await expect(page.locator('.project-card:visible')).toHaveCount(2);
    await expect(page.locator('.contact-address')).toContainText('[at]');
  }
  await context.close();
});

test("email copy succeeds and gives actionable feedback when clipboard is denied", async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.locator('.contact-copy').click();
  await expect(page.locator('.contact-copy')).toHaveText('コピーしました');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('contact@ma0.dev');
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Denied'); }; });
  await page.locator('.contact-copy').click();
  await expect(page.locator('.contact-copy')).toHaveText('コピーできませんでした');
  await expect(page.locator('.contact-email')).toHaveAttribute('href','mailto:contact@ma0.dev');
});

test("link and legal pages fit small screens and enlarged text", async ({ page }) => {
  for (const path of ['/links/', '/en/links/', '/dopasta-tiktok-mcp/privacy/', '/dopasta-tiktok-mcp/terms/']) {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 760, height: 900 });
  await page.goto('/');
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("Save-Data keeps deep links and search available without decorative enhancement", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
  await page.goto('/#projects');
  await expect(page.locator('html')).not.toHaveClass(/enhanced/);
  await expectCurrentChapter(page, '#projects');
  await expectTargetNearTop(page, 'projects');
  await page.locator('.nav-cmdk').click();
  await expect(page.locator('.cmdk-input')).toBeFocused();
});

const canvasHash = async (page, selector) => page.locator(selector).evaluate((canvas) => {
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let hash = 0;
  for (let i = 0; i < pixels.length; i += 4) hash = (Math.imul(hash, 31) + pixels[i] + pixels[i + 3]) | 0;
  return hash;
});

test('cinematic hero animates, pauses, and resumes without losing content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'running');
  await expect.poll(() => canvasHash(page, '.hero-particles')).not.toBe(0);
  const first = await canvasHash(page, '.hero-particles');
  await expect.poll(() => canvasHash(page, '.hero-particles')).not.toBe(first);
  await page.locator('.motion-control').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await expect(page.locator('html')).not.toHaveClass(/motion-ready/);
  for (const scene of await page.locator('.story-scenes li').all()) await expect(scene).toBeVisible();
  const paused = await canvasHash(page, '.hero-particles');
  await page.waitForTimeout(200);
  expect(await canvasHash(page, '.hero-particles')).toBe(paused);
  await page.locator('.motion-control').click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'running');
  await expect.poll(() => canvasHash(page, '.hero-particles')).not.toBe(paused);
});

test('scroll story rewinds deterministically and stays still when scrolling stops', async ({ page }) => {
  await page.goto('/');
  const go = async (fraction) => {
    await page.locator('#chapter-origin').evaluate((section, p) => {
      window.scrollTo({ top: section.offsetTop - 64 + p * (section.offsetHeight - (innerHeight - 64)), behavior: 'instant' });
    }, fraction);
    await expect.poll(() => page.locator('#chapter-origin').evaluate(e => Number(e.style.getPropertyValue('--story-progress')))).toBeCloseTo(fraction, 2);
  };
  await go(.1);
  await expect.poll(() => canvasHash(page, '.story-particles')).not.toBe(0);
  const beginning = await canvasHash(page, '.story-particles');
  await go(.5);
  await expect.poll(() => canvasHash(page, '.story-particles')).not.toBe(beginning);
  await expect(page.locator('.story-scenes li').nth(1)).toHaveCSS('opacity', '1');
  const middle = await canvasHash(page, '.story-particles');
  await page.waitForTimeout(200);
  expect(await canvasHash(page, '.story-particles')).toBe(middle);
  await go(.1);
  await expect.poll(() => canvasHash(page, '.story-particles')).toBe(beginning);
});

test('changing reduced-motion while the page is open restores all story text', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/motion-ready/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/motion-ready/);
  await expect(page.locator('.motion-control')).toBeHidden();
  for (const scene of await page.locator('.story-scenes li').all()) await expect(scene).toBeVisible();
  await page.locator('.primary-button').click();
  await expectCurrentChapter(page, '#projects');
  await expectTargetNearTop(page, 'projects');
});
