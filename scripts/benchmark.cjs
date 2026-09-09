const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const results = {};
  for (const [name, port] of [
    ["before", 4322],
    ["after", 4321],
  ]) {
    results[name] = [];
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      });
      await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Performance.enable");
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 40,
        downloadThroughput: 200000,
        uploadThroughput: 100000,
      });
      await page.addInitScript(() => {
        window.measure = { lcp: 0, cls: 0 };
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) window.measure.lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (!e.hadRecentInput) window.measure.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.waitForTimeout(3000);
      const m = await page.evaluate(() => ({
        ...window.measure,
        bytes: performance
          .getEntriesByType("resource")
          .reduce((s, r) => s + r.transferSize, 0),
        projectsTop: Math.round(
          document.querySelector("#projects").getBoundingClientRect().top,
        ),
      }));
      const metrics = (await cdp.send("Performance.getMetrics")).metrics;
      m.cpuMs = Math.round(
        metrics.find((m) => m.name === "TaskDuration").value * 1000,
      );
      results[name].push(m);
      await context.close();
    }
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
