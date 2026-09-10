// A reversible scroll story with one shared, visibility-aware render loop.
// The original ma0 -> cat's paw -> OSS idea is preserved. Reduced motion and
// an explicit pause both restore the complete, ordinary document flow.
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };

const sampleShape = (kind) => {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 360;
  const ctx = surface.getContext('2d');
  if (!ctx) return [{ x: .5, y: .5 }];
  ctx.fillStyle = '#fff';
  if (kind === 'paw') {
    for (const [x, y, rx, ry] of [[180, 213, 63, 45], [104, 153, 22, 29], [151, 126, 22, 30], [203, 126, 22, 30], [251, 153, 22, 29]]) {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.font = '700 125px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(kind, 180, 183);
  }
  const pixels = ctx.getImageData(0, 0, 360, 360).data;
  const points = [];
  for (let y = 0; y < 360; y += 4) for (let x = 0; x < 360; x += 4) {
    if (pixels[(y * 360 + x) * 4 + 3] > 128) points.push({ x: x / 360, y: y / 360 });
  }
  // Deterministic permutation avoids row-by-row wiping during a morph.
  let seed = 27;
  for (let i = points.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [points[i], points[j]] = [points[j], points[i]];
  }
  return points.length ? points : [{ x: .5, y: .5 }];
};

export const startCinematicExperience = () => {
  const root = document.documentElement;
  const hero = document.querySelector('.hero-visual');
  const story = document.querySelector('.chapter--film');
  if (!hero || !story) return;
  const heroCanvas = hero.querySelector('canvas');
  const storyCanvas = story.querySelector('canvas');
  const hc = heroCanvas?.getContext('2d');
  const sc = storyCanvas?.getContext('2d');
  if (!hc || !sc) return;

  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const ja = document.documentElement.lang === 'ja';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'motion-control';
  document.body.append(button);
  let paused = false;
  try { paused = sessionStorage.getItem('ma0-motion-paused') === 'true'; } catch { /* Storage is optional. */ }
  let enabled = false;
  let heroVisible = false;
  let storyVisible = false;
  let frame = null;
  let lastFrame = 0;
  let elapsed = 0;
  let heroSize = { width: 1, height: 1 };
  let storySize = { width: 1, height: 1 };
  let pointer = { x: 0, y: 0 };
  let pointerTarget = { x: 0, y: 0 };
  let pulse = 0;
  let progress = 0;
  let shapes;
  const count = matchMedia('(max-width: 760px)').matches ? 900 : 1800;
  const particles = Array.from({ length: count }, (_, i) => ({
    u: i / count * Math.PI * 2,
    v: ((i * .61803398875) % 1) * Math.PI * 2,
    size: .55 + (i % 7) * .13,
    color: ['#9bceff', '#c4baff', '#8ca5ee', '#dfebff'][i % 4]
  }));

  const resizeCanvas = (canvas, ctx) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height };
  };
  const resize = () => {
    heroSize = resizeCanvas(heroCanvas, hc);
    storySize = resizeCanvas(storyCanvas, sc);
    updateScroll();
    schedule();
  };

  const drawHero = () => {
    const { width: w, height: h } = heroSize;
    hc.clearRect(0, 0, w, h);
    pointer.x += (pointerTarget.x - pointer.x) * .065;
    pointer.y += (pointerTarget.y - pointer.y) * .065;
    const rotation = elapsed * .075;
    const radius = Math.min(w * .345, h * .78);
    const expand = 1 + pulse * .16;
    const glow = hc.createRadialGradient(w * .5, h * .46, 0, w * .5, h * .46, radius * 1.35);
    glow.addColorStop(0, '#6975dd19'); glow.addColorStop(.5, '#7961ec12'); glow.addColorStop(1, '#05050800');
    hc.fillStyle = glow; hc.fillRect(0, 0, w, h);
    hc.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const a = p.u + rotation;
      const tube = .22 + Math.sin(p.u * 3 + elapsed * .28) * .035;
      const r = radius * (1 + tube * Math.cos(p.v)) * expand;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const z = Math.sin(p.v) * radius * tube;
      const py = y * .37 + z * .88;
      const depth = y * .88 - z * .37;
      const perspective = 800 / (800 + depth);
      const dx = (x * .97 - py * .24) * perspective;
      const dy = (x * .24 + py * .97) * perspective;
      hc.globalAlpha = clamp(.52 + depth / radius * .42, .14, .95);
      hc.fillStyle = p.color;
      hc.beginPath();
      hc.arc(w * .5 + dx + pointer.x * 16, h * .45 + dy + pointer.y * 10, p.size * perspective, 0, Math.PI * 2);
      hc.fill();
    }
    hc.globalAlpha = 1; hc.globalCompositeOperation = 'source-over';
    hero.style.setProperty('--pointer-x', `${pointer.x * 8}deg`);
    hero.style.setProperty('--pointer-y', `${-pointer.y * 5}deg`);
    pulse *= .93;
  };

  const drawStory = () => {
    if (!shapes) shapes = [sampleShape('ma0'), sampleShape('paw'), sampleShape('OSS')];
    const { width: w, height: h } = storySize;
    sc.clearRect(0, 0, w, h);
    const size = Math.min(w * .8, h * .72, 660);
    const from = Math.min(1, Math.floor(progress * 2));
    const blend = smooth((progress * 2 - from - .35) / .30);
    sc.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const a = shapes[from][i % shapes[from].length];
      const b = shapes[from + 1][i % shapes[from + 1].length];
      const scatter = 1 - smooth(progress / .08);
      const ripple = Math.sin(blend * Math.PI) * Math.sin(i * 1.1) * .15;
      const x = (a.x + (b.x - a.x) * blend - .5 + ripple) * size;
      const y = (a.y + (b.y - a.y) * blend - .5) * size;
      sc.globalAlpha = .55 + (i % 5) * .1;
      sc.fillStyle = p.color;
      sc.beginPath();
      sc.arc(w / 2 + x + Math.cos(p.u * 3) * size * scatter * .5, h * .48 + y + Math.sin(p.v) * size * scatter * .35, p.size, 0, Math.PI * 2);
      sc.fill();
    }
    sc.globalAlpha = 1; sc.globalCompositeOperation = 'source-over';
  };

  let storyDirty = true;
  const updateScroll = () => {
    if (!enabled) return;
    const rect = story.getBoundingClientRect();
    const top = innerWidth <= 760 ? 60 : 64;
    progress = clamp((top - rect.top) / Math.max(1, story.offsetHeight - (innerHeight - top)));
    story.style.setProperty('--story-progress', progress.toFixed(4));
    story.querySelectorAll('.story-scenes li').forEach((item, i) => {
      const visibility = i === Math.min(2, Math.floor(progress * 3)) ? 1 : 0;
      item.style.setProperty('--scene-opacity', visibility.toFixed(3));
      item.style.setProperty('--scene-y', `${(1 - visibility) * 22}px`);
    });
    const cover = document.querySelector('#cover');
    cover.style.setProperty('--hero-progress', clamp(-cover.getBoundingClientRect().top / cover.offsetHeight).toFixed(4));
    storyDirty = true;
    schedule();
  };
  const step = (now) => {
    frame = null;
    if (!enabled || document.hidden || (!heroVisible && !storyVisible)) return;
    if (now - lastFrame >= 1000 / 30) {
      elapsed += Math.min((now - lastFrame) / 1000, .05);
      lastFrame = now;
      if (heroVisible) drawHero();
      if (storyVisible && storyDirty) { drawStory(); storyDirty = false; }
    }
    // Only the hero has ambient movement. The story renders on scroll/resize.
    if (heroVisible || storyDirty) frame = requestAnimationFrame(step);
  };
  const schedule = () => {
    if (enabled && !document.hidden && (heroVisible || storyVisible) && frame === null) frame = requestAnimationFrame(step);
  };
  const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; };

  const applyPreference = () => {
    const reduced = media.matches || connection?.saveData === true;
    const wasInStory = story.getBoundingClientRect().top < 64 && story.getBoundingClientRect().bottom > innerHeight * .4;
    enabled = !paused && !reduced;
    root.classList.toggle('motion-ready', enabled);
    root.classList.toggle('particles-ready', enabled);
    root.classList.toggle('motion-paused', !enabled);
    root.dataset.motion = enabled ? 'running' : 'paused';
    button.hidden = reduced;
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = enabled ? (ja ? 'Ⅱ 動きを止める' : 'Ⅱ Pause motion') : (ja ? '▷ 動きを再生' : '▷ Play motion');
    button.setAttribute('aria-label', ja ? 'アニメーションの一時停止' : 'Pause animations');
    if (!enabled) { stop(); hc.clearRect(0, 0, heroSize.width, heroSize.height); sc.clearRect(0, 0, storySize.width, storySize.height); }
    if (wasInStory) story.scrollIntoView({ behavior: 'instant', block: 'start' });
    resize();
  };
  button.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('ma0-motion-paused', String(paused)); } catch { /* Preference still works in memory. */ }
    applyPreference();
  });
  media.addEventListener('change', applyPreference);
  connection?.addEventListener?.('change', applyPreference);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else schedule(); });
  new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === hero) heroVisible = entry.isIntersecting;
      else storyVisible = entry.isIntersecting;
    }
    if (!heroVisible && !storyVisible) stop();
    else { storyDirty = true; schedule(); }
  }).observe(hero);
  new IntersectionObserver(([entry]) => { storyVisible = entry.isIntersecting; if (storyVisible) { storyDirty = true; schedule(); } else if (!heroVisible) stop(); }).observe(storyCanvas);
  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const rect = hero.getBoundingClientRect();
    pointerTarget = { x: (event.clientX - rect.left) / rect.width * 2 - 1, y: (event.clientY - rect.top) / rect.height * 2 - 1 };
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerTarget = { x: 0, y: 0 }; });
  hero.addEventListener('pointerdown', () => { if (enabled) { pulse = 1; schedule(); } }, { passive: true });
  window.addEventListener('scroll', updateScroll, { passive: true });
  new ResizeObserver(resize).observe(hero);
  new ResizeObserver(resize).observe(story.querySelector('.story-stage'));
  applyPreference();
};
