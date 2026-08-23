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


test("deep links are restored after the enhanced Story changes page height", async ({ page }) => {
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
      await expect.poll(async () => page.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth === 900 && image.naturalHeight === 600))).toBe(true);
    }
  }

  expect(problems).toEqual([]);
});
