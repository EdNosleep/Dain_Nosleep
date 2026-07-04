// ======================================================
// NOSLEEP_ENGINE — concentricPulse.js v3
// Infinite hold concentric glowing rings effect
// ======================================================

export function playConcentricPulse({ layer, intent }) {
  const params = intent.params || {};
  const target = normalizeTarget(intent.target);

  const root = document.createElement("div");

  Object.assign(root.style, {
    position: "fixed",
    left: `${target.x}px`,
    top: `${target.y}px`,
    width: "0",
    height: "0",
    pointerEvents: "none",
    transform: "translate3d(0,0,0)"
  });

  layer.appendChild(root);

  const instance = {
    id: intent.id,
    effect: "concentricPulse",
    root,
    params,
    timers: [],
    intervalId: null,
    stopped: false
  };

  const interval = clampNum(params.pulseInterval ?? params.interval ?? 90, 20, 1000);

  createRing(root, params);

  instance.intervalId = setInterval(() => {
    if (instance.stopped) return;
    createRing(root, params);
  }, interval);

  return instance;
}

export function moveConcentricPulse(instance, target = {}) {
  if (!instance?.root || instance.stopped) return;

  const safe = normalizeTarget(target);

  instance.root.style.left = `${safe.x}px`;
  instance.root.style.top = `${safe.y}px`;
}

export function stopConcentricPulse(instance) {
  if (!instance || instance.stopped) return;

  instance.stopped = true;

  if (instance.intervalId) {
    clearInterval(instance.intervalId);
    instance.intervalId = null;
  }

  for (const timer of instance.timers || []) clearTimeout(timer);
  instance.timers = [];

  try {
    instance.root?.remove();
  } catch (_) {}
}

function createRing(root, params = {}) {
  const ring = document.createElement("div");

  const color = normalizeColor(params.pulseColor || params.color || "#00ccff");
  const opacity = clampNum(params.pulseOpacity ?? params.opacity ?? 0.72, 0.01, 1);
  const radius = clampNum(params.pulseRadius ?? params.radius ?? 74, 4, 340);
  const duration = clampNum(params.pulseDuration ?? params.duration ?? 760, 120, 5000);
  const glow = clampNum(params.pulseGlow ?? params.glow ?? 24, 0, 100);
  const lineWidth = clampNum(params.pulseLineWidth ?? params.lineWidth ?? 2.5, 0.5, 20);

  Object.assign(ring.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    marginLeft: `${-radius}px`,
    marginTop: `${-radius}px`,
    borderRadius: "999px",
    border: `${lineWidth}px solid ${color}`,
    boxShadow: `0 0 ${glow}px ${color}, inset 0 0 ${glow * 0.48}px ${color}`,
    opacity: String(opacity),
    transform: "scale(1.22)",
    willChange: "transform, opacity, filter",
    pointerEvents: "none",
    filter: `blur(${Math.max(0, glow * 0.035)}px)`
  });

  root.appendChild(ring);

  ring.animate([
    {
      transform: "scale(1.24)",
      opacity
    },
    {
      transform: "scale(0.18)",
      opacity: opacity * 0.32,
      offset: 0.72
    },
    {
      transform: "scale(0.025)",
      opacity: 0
    }
  ], {
    duration,
    easing: "cubic-bezier(.08,.82,.12,1)",
    fill: "forwards"
  });

  setTimeout(() => {
    try { ring.remove(); } catch (_) {}
  }, duration + 60);
}

function normalizeTarget(target = {}) {
  return {
    x: Number(target.x) || 0,
    y: Number(target.y) || 0
  };
}

function normalizeColor(value) {
  const str = String(value || "").trim();
  if (/^#[0-9a-fA-F]{3}$/.test(str)) return str;
  if (/^#[0-9a-fA-F]{6}$/.test(str)) return str;
  return "#00ccff";
}

function clampNum(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// CHANGELOG v3:
// • Эффект стал бесконечным до visual:stop.
// • Добавлен moveConcentricPulse() для следования за пальцем.
// • Кольца ускоренно сужаются в центр.
// • Добавлен blur/glow-профиль.
// • Эффект остаётся reusable и не зависит от модулей.