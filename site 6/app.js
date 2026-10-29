/* =========================================================
   CONFIG — everything you'll likely want to swap lives here
   ========================================================= */
const CONFIG = {
  worldBackground: "assets/art/world-bg.jpg", // the pannable background (set in index.html too)
  worldScale: 1.7,                         // world size = this × the screen (bigger = more to explore)
  ambientAudio: null,                      // e.g. "assets/audio/ambient.mp3" (optional looping sound)

  // Characters floating in the world. x / y are fractions (0–1) of the world size.
  // Every entry is clickable. `name` shows in the speech bubble; `w` is its width in px.
  characters: [
    { id: "rice-fields", name: "Rice Fields", src: "assets/characters/rice-fields.png", x: 0.33, y: 0.26, w: 195,
      blurb: "Hello there!\nThis is Rice Fields." },
    { id: "lanterns", name: "Lantern Night", src: "assets/characters/lanterns.png", x: 0.56, y: 0.24, w: 195,
      blurb: "Hello there!\nThis is Lantern Night." },
    { id: "sky-lanterns", name: "Sky Lanterns", src: "assets/characters/sky-lanterns.png", x: 0.22, y: 0.46, w: 195,
      blurb: "Hello there!\nThis is Sky Lanterns." },
    { id: "whirlpool", name: "Whirlpool", src: "assets/characters/whirlpool.png", x: 0.78, y: 0.42, w: 195,
      blurb: "Hello there!\nThis is Whirlpool." },
    { id: "friends", name: "Friends", src: "assets/characters/friends.png", x: 0.70, y: 0.67, w: 195,
      blurb: "Hello there!\nThis is Friends." },
    { id: "blossoms", name: "Blossoms", src: "assets/characters/blossoms.png", x: 0.31, y: 0.67, w: 195,
      blurb: "Hello there!\nThis is Blossoms." },
    { id: "lotus-pond", name: "Lotus Pond", src: "assets/characters/lotus-pond.png", x: 0.86, y: 0.62, w: 195,
      blurb: "Hello there!\nThis is Lotus Pond." },
    { id: "dragon-waves", name: "Dragon Waves", src: "assets/characters/dragon-waves.png", x: 0.84, y: 0.17, w: 195,
      blurb: "Hello there!\nThis is Dragon Waves." },
    { id: "floating-market", name: "Floating Market", src: "assets/characters/floating-market.png", x: 0.10, y: 0.82, w: 195,
      blurb: "Hello there!\nThis is Floating Market." },
  ],
  defaultStory: "Nobody knows for certain how old this friend really is. Their wise stories often leave us clues.", // shown after connect-the-dots; override per character with `story: "..."`
  // Non-clickable decoration scattered around
  decor: [
    // Optional non-clickable scenery, e.g. { src: "assets/characters/grass-1.png", x: 0.10, y: 0.12, w: 44 }
  ],

  // Connect-the-dots: points in any units — they're auto-scaled to fit. Order = connect order.
  dots: [
    [268,1122],[284,1084],[290,1057],[314,1050],[320,1017],[336,1071],[336,1122],[361,1181],
    [368,1104],[395,1141],[377,1195],[377,1263],[329,1252],[343,1211],[316,1197],[316,1215],
    [266,1255],[245,1255],[267,1192],[312,1166],
  ],

  // Coloring
  coloringPage: "assets/art/coloring-page.png",   // transparent PNG line-art works best
  palette: ["#b5233f", "#3f5fa8", "#5b3a5e", "#1f5a45", "#c9a63a"],
  confettiColors: ["#b5233f", "#3f5fa8", "#1f5a45", "#e6c14a"],
  shareText: "Look what I colored!",
};

/* =========================================================
   Helpers
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mod = (n, m) => ((n % m) + m) % m;
const rand = (a, b) => a + Math.random() * (b - a);

const views = { play: $("#view-play"), dots: $("#view-dots"), reveal: $("#view-reveal"), color: $("#view-color") };
let current = "play";

function go(name, { silent = false } = {}) {
  if (!views[name]) name = "play";
  Object.entries(views).forEach(([k, el]) => el.classList.toggle("active", k === name));
  current = name;
  document.body.classList.toggle("is-play", name === "play");
  if (!silent) history.replaceState(null, "", "#" + (name === "reveal" ? "play" : name));
  if (name === "play") closeBubble();
  if (name === "dots") startDots();
  if (name === "color") requestAnimationFrame(layoutPaint);
  if (name !== "reveal") $("#view-reveal").classList.remove("copy");
  stopConfetti(name !== "reveal");
}

$$("[data-go]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); go(a.dataset.go); }));
$$("[data-soon]").forEach(a => a.addEventListener("click", e => e.preventDefault()));

let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* =========================================================
   PLAY — draggable, wrapping world
   ========================================================= */
const world = $("#world"), inner = $("#worldInner"), bgImg = $("#worldBg");
const items = [];
let W = 2400, H = 1700, ox = 0, oy = 0, vx = 0, vy = 0, bgRatio = 2262 / 3200;
let dragging = false, focused = null, lastX = 0, lastY = 0, moved = 0;

function buildWorld() {
  const make = (d, cls) => {
    const el = document.createElement("div");
    el.className = "w-item " + cls;
    el.dataset.w = d.w;
    el.style.width = d.w * itemScale() + "px";
    el.style.top = d.y * 100 + "%";
    el.innerHTML = `<img src="${d.src}" alt="${d.name || ""}">`;
    inner.appendChild(el);
    const it = { el, d };
    const img = el.querySelector("img");
    const upd = () => { el.style.height = d.w * itemScale() * (img.naturalHeight / img.naturalWidth || 1) + "px"; };
    img.complete ? upd() : img.addEventListener("load", upd);
    items.push(it);
    return it;
  };
  CONFIG.decor.forEach(d => make(d, "decor"));
  CONFIG.characters.forEach(d => {
    const it = make(d, "clickable");
    it.el.addEventListener("click", () => { if (moved < 6) focusItem(it); });
  });
  bgImg.src = CONFIG.worldBackground;
  const setRatio = () => { if (bgImg.naturalWidth) { bgRatio = bgImg.naturalHeight / bgImg.naturalWidth; sizeWorld(); } };
  bgImg.complete ? setRatio() : bgImg.addEventListener("load", setRatio);
  sizeWorld(true);
}

function itemScale() { return Math.max(0.55, Math.min(1, Math.min(innerWidth, innerHeight * 1.3) / 900)); }
/* On tall/narrow screens the map is much wider than the screen, so pull the spots closer together horizontally. */
function placeItems() {
  const spread = Math.min(1, (innerWidth * 2.0) / W);
  items.forEach(it => { it.el.style.left = (0.5 + (it.d.x - 0.5) * spread) * 100 + "%"; });
}
function rescaleItems() {
  items.forEach(it => {
    const img = it.el.querySelector("img"), w = it.d.w * itemScale();
    it.el.style.width = w + "px"; it.el.style.height = w * (img.naturalHeight / img.naturalWidth || 1) + "px";
  });
}

/* The world is a fixed-size map (no looping). Panning is clamped so you can't leave it. */
function sizeWorld(center) {
  const k = CONFIG.worldScale;
  let w = innerWidth * k, h = w * bgRatio;
  if (h < innerHeight * k) { h = innerHeight * k; w = h / bgRatio; }
  W = w; H = h;
  placeItems();
  inner.style.width = W + "px"; inner.style.height = H + "px";
  if (center) { ox = (innerWidth - W) / 2; oy = (innerHeight - H) / 2; }
  clampWorld();
}
function clampWorld() {
  const nx = Math.min(0, Math.max(innerWidth - W, ox)), ny = Math.min(0, Math.max(innerHeight - H, oy));
  if (nx !== ox) vx = 0;
  if (ny !== oy) vy = 0;
  ox = nx; oy = ny;
}
function tick() {
  if (current === "play") {
    if (!dragging && !focused) { ox += vx; oy += vy; vx *= 0.94; vy *= 0.94; if (Math.abs(vx) < .05) vx = 0; if (Math.abs(vy) < .05) vy = 0; }
    clampWorld();
    inner.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
  }
  if (focused) positionBubble();
  requestAnimationFrame(tick);
}

world.addEventListener("pointerdown", e => {
  if (focused) return;
  dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; vx = vy = 0;
  world.classList.add("dragging");
});
addEventListener("pointermove", e => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  ox += dx; oy += dy; vx = dx; vy = dy;
});
addEventListener("pointerup", () => { dragging = false; world.classList.remove("dragging"); });
addEventListener("pointercancel", () => { dragging = false; world.classList.remove("dragging"); });
world.addEventListener("wheel", e => { if (focused) return; ox -= e.deltaX; oy -= e.deltaY; }, { passive: true });
addEventListener("keydown", e => { if (e.key === "Escape") closeBubble(); });

/* --- bubble --- */
const bubble = $("#bubble");
function focusItem(it) {
  focused = it;
  $("#view-play").classList.add("focus");
  items.forEach(i => i.el.classList.toggle("focused", i === it));
  $("#bubbleText").innerHTML = (it.d.blurb || `Hello there!\nThis is ${it.d.name}.`).replace(/\n/g, "<br>");
  bubble.classList.add("show");
  positionBubble();
}
function positionBubble() {
  if (!focused) return;
  const r = focused.el.getBoundingClientRect();
  const bw = bubble.offsetWidth || 150;
  let x = r.right + 10;
  if (x + bw > innerWidth - 8) x = Math.max(8, r.left - bw - 10);
  bubble.style.left = x + "px";
  bubble.style.top = Math.max(60, r.top + 10) + "px";
}
function closeBubble() {
  focused = null;
  bubble.classList.remove("show");
  $("#view-play").classList.remove("focus");
  items.forEach(i => i.el.classList.remove("focused"));
}
// the world is paused while focused, but clicks on empty space should close it
$("#view-play").addEventListener("click", e => {
  if (focused && !e.target.closest(".bubble") && !e.target.closest(".w-item.focused")) closeBubble();
});
bubble.addEventListener("click", e => {
  const b = e.target.closest("[data-activity]");
  if (!b) return;
  const name = focused ? focused.d.name : "Ector";
  $("#revealTitle").textContent = `Hello there! This is ${name}.`;
  $("#revealBody").textContent = (focused && focused.d.story) || CONFIG.defaultStory;
  go(b.dataset.activity);
});

/* sound toggle */
let soundOn = true, audio = null;
$("#sound").addEventListener("click", () => {
  soundOn = !soundOn;
  $("#soundImg").src = `assets/icons/sound-${soundOn ? "on" : "off"}.png`;
  if (CONFIG.ambientAudio) {
    if (!audio) { audio = new Audio(CONFIG.ambientAudio); audio.loop = true; }
    soundOn ? audio.play().catch(() => {}) : audio.pause();
  }
});

/* =========================================================
   CONNECT THE DOTS
   ========================================================= */
const dotsStage = $("#dotsStage"), dotsSvg = $("#dotsLines");
let dotEls = [], dotPts = [], nextDot = 2, dotsDone = false;

function startDots() {
  dotsStage.innerHTML = ""; dotsStage.appendChild(dotsSvg); dotsSvg.innerHTML = "";
  dotsStage.classList.remove("numbered");
  dotsDone = false; nextDot = 2; dotEls = [];

  const sw = Math.min(340, innerWidth * 0.8), sh = Math.min(innerHeight * 0.62, 520);
  const xs = CONFIG.dots.map(p => p[0]), ys = CONFIG.dots.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(sw / (maxX - minX), sh / (maxY - minY));
  const bw = (maxX - minX) * scale, bh = (maxY - minY) * scale;
  dotsStage.style.width = bw + "px"; dotsStage.style.height = bh + "px";
  dotsStage.style.top = Math.max(96, (innerHeight * 0.74 - bh) / 2 + 10) + "px";
  dotPts = CONFIG.dots.map(p => [(p[0] - minX) * scale, (p[1] - minY) * scale]);

  dotPts.forEach((p, i) => {
    const el = document.createElement("button");
    el.className = "dot" + (i === 0 ? " done" : i === 1 ? " next" : "");
    el.innerHTML = `<span class="num">${i + 1}</span>`;
    el.setAttribute("aria-label", "Dot " + (i + 1));
    el.style.transform = `translate(${rand(-innerWidth * .3, bw + innerWidth * .3)}px, ${rand(-80, bh + 120)}px)`;
    el.addEventListener("click", () => hitDot(i + 1));
    dotsStage.appendChild(el); dotEls.push(el);
    setTimeout(() => { el.classList.add("in"); }, 60 + i * 35);
    setTimeout(() => { el.style.transform = `translate(${p[0]}px, ${p[1]}px)`; }, 700 + i * 30);
  });
  setTimeout(() => dotsStage.classList.add("numbered"), 1900);
}

function hitDot(n) {
  if (dotsDone || current !== "dots") return;
  const el = dotEls[n - 1];
  if (n !== nextDot) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); return; }
  const a = dotPts[n - 2], b = dotPts[n - 1];
  const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
  ln.setAttribute("x1", a[0]); ln.setAttribute("y1", a[1]);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  ln.setAttribute("x2", a[0]); ln.setAttribute("y2", a[1]);
  dotsSvg.appendChild(ln);
  const t0 = performance.now();
  (function grow(t) {
    const k = Math.min(1, (t - t0) / 160);
    ln.setAttribute("x2", a[0] + (b[0] - a[0]) * k); ln.setAttribute("y2", a[1] + (b[1] - a[1]) * k);
    if (k < 1) requestAnimationFrame(grow);
  })(t0);
  el.classList.remove("next"); el.classList.add("done");
  nextDot++;
  if (nextDot <= dotEls.length) dotEls[nextDot - 1].classList.add("next");
  else finishDots();
}

function finishDots() {
  dotsDone = true;
  setTimeout(() => {
    go("reveal");
    startConfetti();
    setTimeout(() => $("#view-reveal").classList.add("copy"), 1800);
  }, 450);
}

/* confetti */
const cv = $("#confetti"), cx = cv.getContext("2d");
let parts = [], confettiRaf = 0;
function sizeConfetti() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
function startConfetti() {
  sizeConfetti();
  const ox0 = innerWidth / 2, oy0 = innerHeight * 0.38;
  parts = Array.from({ length: 240 }, () => {
    const a = rand(0, Math.PI * 2), s = rand(2, 15) * Math.random();
    return { x: ox0, y: oy0, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, r: rand(2.5, 8),
      c: CONFIG.confettiColors[(Math.random() * CONFIG.confettiColors.length) | 0], life: rand(160, 300), age: 0 };
  });
  cancelAnimationFrame(confettiRaf);
  (function loop() {
    cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => {
      p.age++; p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.06; p.x += p.vx; p.y += p.vy;
      cx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
    });
    parts = parts.filter(p => p.age < p.life);
    if (parts.length) confettiRaf = requestAnimationFrame(loop); else cx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}
function stopConfetti(doIt) {
  if (!doIt) return;
  cancelAnimationFrame(confettiRaf); parts = []; cx.clearRect(0, 0, cv.width, cv.height);
}

/* =========================================================
   COLORING
   ========================================================= */
const stage = $("#paintStage"), paint = $("#paint"), art = $("#art"), pctx = paint.getContext("2d");
const cursor = $("#brushCursor"), sizeInput = $("#size");
let color = CONFIG.palette[0], erasing = false, drawing = false, lx = 0, ly = 0, picked = false;
let nw = 1600, nh = 1000;

art.src = CONFIG.coloringPage;
function onArtLoad() {
  nw = art.naturalWidth || 1600; nh = art.naturalHeight || 1000;
  paint.width = nw; paint.height = nh;
  layoutPaint();
}
art.complete && art.naturalWidth ? onArtLoad() : art.addEventListener("load", onArtLoad);

function layoutPaint() {
  const tools = $(".tools").getBoundingClientRect();
  const availW = innerWidth - 24;
  const availH = tools.top - 78 - 12;
  const k = Math.min(availW / nw, Math.max(availH, 120) / nh);
  stage.style.width = nw * k + "px"; stage.style.height = nh * k + "px";
  stage.style.top = Math.max(78 + 8, (tools.top + 78 - nh * k) / 2) + "px";   // centre in the free space
  updateCursorSize();
}

/* palette */
const palette = $("#palette");
CONFIG.palette.forEach((c, i) => {
  const b = document.createElement("button");
  b.className = "swatch"; b.style.setProperty("--c", c); b.setAttribute("role", "radio");
  b.setAttribute("aria-checked", i === 0 ? "true" : "false"); b.setAttribute("aria-label", "Color " + (i + 1));
  b.addEventListener("click", () => {
    color = c; setErasing(false); picked = true; $("#pickHint").classList.add("gone");
    $$(".swatch").forEach(s => s.setAttribute("aria-checked", s === b ? "true" : "false"));
    document.documentElement.style.setProperty("--brush", c);
  });
  palette.appendChild(b);
});
document.documentElement.style.setProperty("--brush", color);

function setErasing(v) { erasing = v; $("#btnEraser").setAttribute("aria-pressed", v); }
$("#btnEraser").addEventListener("click", () => setErasing(!erasing));
$("#btnStartOver").addEventListener("click", () => { pctx.clearRect(0, 0, nw, nh); toast("Fresh page!"); });
sizeInput.addEventListener("input", updateCursorSize);

function brushPx() { return +sizeInput.value; }               // size in screen pixels
function updateCursorSize() { cursor.style.width = cursor.style.height = brushPx() + "px"; }

function pos(e) {
  const r = paint.getBoundingClientRect();
  return [(e.clientX - r.left) * nw / r.width, (e.clientY - r.top) * nh / r.height, nw / r.width];
}
function stroke(x0, y0, x1, y1, k) {
  pctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
  pctx.strokeStyle = pctx.fillStyle = color;
  pctx.lineWidth = brushPx() * k; pctx.lineCap = pctx.lineJoin = "round";
  pctx.beginPath(); pctx.moveTo(x0, y0); pctx.lineTo(x1, y1); pctx.stroke();
}
stage.addEventListener("pointerdown", e => {
  drawing = true; stage.setPointerCapture(e.pointerId);
  const [x, y, k] = pos(e); lx = x; ly = y; stroke(x, y, x, y, k);
});
stage.addEventListener("pointermove", e => {
  cursor.style.left = e.clientX + "px"; cursor.style.top = e.clientY + "px";
  if (e.pointerType === "mouse") cursor.classList.add("show");
  if (!drawing) return;
  const [x, y, k] = pos(e); stroke(lx, ly, x, y, k); lx = x; ly = y;
});
["pointerup", "pointercancel"].forEach(t => stage.addEventListener(t, () => { drawing = false; }));
stage.addEventListener("pointerleave", () => cursor.classList.remove("show"));

/* save / share */
function composite() {
  const c = document.createElement("canvas"); c.width = nw; c.height = nh;
  const x = c.getContext("2d");
  x.fillStyle = getComputedStyle(document.body).backgroundColor; x.fillRect(0, 0, nw, nh);
  x.drawImage(paint, 0, 0);
  x.globalCompositeOperation = "multiply"; x.drawImage(art, 0, 0, nw, nh);
  return c;
}
const toBlob = c => new Promise(r => c.toBlob(r, "image/png"));
function download(blob) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "my-coloring.png"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$("#btnSave").addEventListener("click", async () => { download(await toBlob(composite())); toast("Saved to your downloads"); });
$("#btnShare").addEventListener("click", async () => {
  const blob = await toBlob(composite());
  const file = new File([blob], "my-coloring.png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: CONFIG.shareText });
    } else {
      download(blob); toast("Image saved — share it from your downloads");
    }
  } catch (_) { /* user cancelled */ }
});

/* =========================================================
   Water ripple on every click / tap (not while painting)
   ========================================================= */
const rippleLayer = $("#ripples");
document.addEventListener("pointerdown", e => {
  if (e.target.closest("#paintStage")) return;
  const r = document.createElement("div");
  r.className = "ripple"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
  [[260, 0], [180, 0.12], [110, 0.26]].forEach(([size, delay]) => {
    const i = document.createElement("i"); i.style.setProperty("--r", size + "px"); i.style.setProperty("--d", delay + "s"); r.appendChild(i);
  });
  rippleLayer.appendChild(r);
  setTimeout(() => r.remove(), 2200);
}, true);

/* =========================================================
   Boot
   ========================================================= */
let lastW = innerWidth;
addEventListener("resize", () => {
  sizeWorld(false); rescaleItems();
  if (current === "color") layoutPaint();
  if (current === "dots" && innerWidth !== lastW && !dotsDone) startDots();   // ignore mobile URL-bar height changes
  lastW = innerWidth;
});
buildWorld();
tick();
const start = location.hash.slice(1);
go(["color", "dots"].includes(start) ? start : "play", { silent: true });
