// ======================================
// NosleepEngine — trayButtonInventoryVisuals.js (v1)
// Inventory SVG Preview + Ghost Visual Helper
// ======================================

const STYLE_ID = "dain-inventory-premium-drag-style";

export function ensureInventoryVisualStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes dainPrimitiveGhostPulse {
      0% { transform: translate3d(0,0,0) scale(1); filter: brightness(1); }
      50% { transform: translate3d(0,-3px,0) scale(1.055); filter: brightness(1.18); }
      100% { transform: translate3d(0,0,0) scale(1); filter: brightness(1); }
    }
  `;

  document.head.appendChild(style);
}

export function createPrimitivePreview(def, size, color, premium = false) {
  const geometry = def?.geometry || def?.id || "box";
  const id = def?.id || geometry;
  const safeColor = normalizeColor(color || def?.color, "#ffd36a");

  if (geometry === "sphere" || id === "sphere") return createSphereSvg(size, safeColor, premium);
  if (geometry === "cone" || id === "cone") return createConeSvg(size, safeColor, premium);
  if (geometry === "cylinder" || id === "cylinder") return createCylinderSvg(size, safeColor, premium);
  if (geometry === "capsule" || id === "capsule") return createCapsuleSvg(size, safeColor, premium);

  return createCubeSvg(size, safeColor, premium);
}

export function createPrimitiveGhost({ state, item, x, y, params }) {
  clearPrimitiveGhost(state);

  const p = params;
  const ghost = document.createElement("div");
  ghost.className = "dain-inventory-primitive-ghost";

  const shape = createPrimitivePreview(
    item,
    Math.round(p.ghostSize * 0.82),
    p.primitiveGhostColor,
    true
  );

  Object.assign(ghost.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    width: `${p.ghostSize}px`,
    height: `${p.ghostSize}px`,
    marginLeft: `${-p.ghostSize / 2}px`,
    marginTop: `${-p.ghostSize / 2}px`,
    zIndex: "30000",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    boxShadow: "none",
    transform: "translate3d(0,0,0) scale(1)",
    animation: "dainPrimitiveGhostPulse 920ms ease-in-out infinite",
    filter: `
      drop-shadow(0 0 ${p.ghostGlow}px rgba(0,204,255,0.72))
      drop-shadow(0 18px 24px rgba(0,0,0,0.52))
    `
  });

  ghost.appendChild(shape);
  document.body.appendChild(ghost);
  state.ghost = ghost;
}

export function movePrimitiveGhost(state, x, y, params) {
  if (!state.ghost) return;

  const p = params;
  state.ghost.style.left = `${x}px`;
  state.ghost.style.top = `${y}px`;
  state.ghost.style.marginLeft = `${-p.ghostSize / 2}px`;
  state.ghost.style.marginTop = `${-p.ghostSize / 2}px`;
}

export function clearPrimitiveGhost(state) {
  try { state.ghost?.remove(); } catch (_) {}
  state.ghost = null;
}

export function normalizeColor(value, fallback = "#ffd36a") {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;
  return fallback;
}

function svgWrap(size, inner, premium) {
  const box = document.createElement("div");
  box.innerHTML = `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" style="display:block;overflow:visible">
      <defs>
        <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="${premium ? 8 : 5}" stdDeviation="${premium ? 6 : 4}" flood-color="rgba(0,0,0,.45)"/>
        </filter>
      </defs>
      ${inner}
    </svg>
  `;

  const el = box.firstElementChild;
  Object.assign(el.style, {
    pointerEvents: "none",
    filter: premium ? "drop-shadow(0 0 14px rgba(0,204,255,.35))" : "none"
  });

  return el;
}

function createCubeSvg(size, color, premium) {
  const top = lighten(color, 1.18);
  const left = darken(color, 0.82);
  const right = color;

  return svgWrap(size, `
    <g filter="url(#shadow)">
      <polygon points="50,14 82,30 50,46 18,30" fill="${top}" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/>
      <polygon points="18,30 50,46 50,84 18,68" fill="${left}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
      <polygon points="82,30 50,46 50,84 82,68" fill="${right}" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
    </g>
  `, premium);
}

function createSphereSvg(size, color, premium) {
  return svgWrap(size, `
    <defs>
      <radialGradient id="sphereGrad" cx="34%" cy="28%" r="70%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="22%" stop-color="${lighten(color, 1.25)}"/>
        <stop offset="62%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${darken(color, 0.55)}"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="34" fill="url(#sphereGrad)" filter="url(#shadow)"/>
  `, premium);
}

function createConeSvg(size, color, premium) {
  return svgWrap(size, `
    <defs>
      <linearGradient id="coneGrad" x1="25%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="${lighten(color, 1.25)}"/>
        <stop offset="62%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${darken(color, 0.65)}"/>
      </linearGradient>
    </defs>
    <g filter="url(#shadow)">
      <path d="M50 14 L82 78 Q50 92 18 78 Z" fill="url(#coneGrad)" stroke="rgba(255,255,255,.2)" stroke-width="1.5"/>
      <ellipse cx="50" cy="78" rx="32" ry="10" fill="${darken(color, 0.75)}" opacity=".75"/>
    </g>
  `, premium);
}

function createCylinderSvg(size, color, premium) {
  return svgWrap(size, `
    <defs>
      <linearGradient id="cylGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${darken(color, 0.62)}"/>
        <stop offset="42%" stop-color="${lighten(color, 1.25)}"/>
        <stop offset="68%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${darken(color, 0.58)}"/>
      </linearGradient>
    </defs>
    <g filter="url(#shadow)">
      <rect x="27" y="24" width="46" height="52" fill="url(#cylGrad)"/>
      <ellipse cx="50" cy="24" rx="23" ry="9" fill="${lighten(color, 1.12)}"/>
      <ellipse cx="50" cy="76" rx="23" ry="9" fill="${darken(color, 0.72)}"/>
      <path d="M27 24 V76 M73 24 V76" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
    </g>
  `, premium);
}

function createCapsuleSvg(size, color, premium) {
  return svgWrap(size, `
    <defs>
      <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${darken(color, 0.62)}"/>
        <stop offset="42%" stop-color="${lighten(color, 1.25)}"/>
        <stop offset="68%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${darken(color, 0.58)}"/>
      </linearGradient>
    </defs>
    <g filter="url(#shadow)">
      <rect x="30" y="14" width="40" height="72" rx="20" fill="url(#capGrad)" stroke="rgba(255,255,255,.2)" stroke-width="1.5"/>
    </g>
  `, premium);
}

function lighten(hex, factor = 1.2) {
  const c = hexToRgb(hex);

  return rgbToHex(
    Math.min(255, Math.round(c.r * factor)),
    Math.min(255, Math.round(c.g * factor)),
    Math.min(255, Math.round(c.b * factor))
  );
}

function darken(hex, factor = 0.7) {
  const c = hexToRgb(hex);

  return rgbToHex(
    Math.max(0, Math.round(c.r * factor)),
    Math.max(0, Math.round(c.g * factor)),
    Math.max(0, Math.round(c.b * factor))
  );
}

function hexToRgb(hex) {
  let h = String(hex || "#ffd36a").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "ffd36a";

  const n = parseInt(h, 16);

  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(v =>
    Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")
  ).join("")}`;
}

// CHANGELOG v1:
// • Вынесены SVG-preview примитивов из trayButtonInventory.js.
// • Вынесены ghost create/move/clear helpers.
// • Вынесены color helpers и visual style.
// • Helper не знает про Store, EventBus, defineTrayButton и сцену.
// • Поддержан модульный распил Inventory UI.

