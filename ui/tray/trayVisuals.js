// ======================================
// Dain_Coin — TRAY VISUALS HELPER (v2)
// Transform-synced tray movement
// ======================================

export function createTrayDom(state) {
  const tray = document.createElement("div");
  Object.assign(tray.style, {
    position: "fixed",
    left: "50%",
    transform: "translate3d(-50%, 0, 0)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9000,
    backdropFilter: "blur(10px)",
    pointerEvents: "auto",
    willChange: "transform",
    touchAction: "none",
    overflow: "hidden"
  });

  const handle = document.createElement("div");
  Object.assign(handle.style, {
    height: "18px",
    width: "100%",
    display: state.params.showHandle ? "flex" : "none",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
    opacity: "0.9"
  });

  const handleBar = document.createElement("div");
  Object.assign(handleBar.style, {
    width: "44px",
    height: "4px",
    borderRadius: "2px",
    background: "rgba(255,255,255,0.35)"
  });

  handle.appendChild(handleBar);

  const buttonsWrap = document.createElement("div");
  Object.assign(buttonsWrap.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    flex: "1",
    gap: "2vw",
    padding: "0 3vw 6px 3vw"
  });

  tray.append(handle, buttonsWrap);

  return { tray, handle, buttonsWrap };
}

export function applyTrayVisuals(state) {
  const p = state.params;
  const tray = state.tray;
  if (!tray) return;

  tray.style.height = `${p.trayHeight}vh`;
  tray.style.width = `${p.trayWidth}vw`;
  tray.style.maxWidth = `calc(100vw - ${p.marginSide * 2}px)`;
  tray.style.background = rgbaFromHex(p.panelColor, p.alpha);
  tray.style.borderRadius = `${p.radius}px`;
  tray.style.border = Number(p.borderWidth) > 0 ? `${p.borderWidth}px solid ${p.borderColor}` : "none";
  tray.style.boxShadow = Number(p.shadowSize) > 0 ? `0 0 ${p.shadowSize}px rgba(0,0,0,0.55)` : "none";

  applyTrayMotion(state);
  applyTrayPosition(state);
}

export function applyTrayPosition(state) {
  if (!state.tray) return;

  const baseBottom = state.params.marginBottom;
  const offset = Number(state.panelOffsetPx) || 0;

  state.tray.style.bottom = `calc(var(--safe-bottom, 0px) + ${baseBottom}px)`;
  state.tray.style.transform = `translate3d(-50%, ${-offset}px, 0)`;
}

export function applyTrayMotion(state) {
  if (!state.tray) return;
  state.tray.style.transition = `transform ${state.animDuration}ms ease`;
}

export function disableTrayMotion(state) {
  if (!state.tray) return;
  state.tray.style.transition = "none";
}

export function createTrayButtonElement() {
  const btn = document.createElement("button");

  Object.assign(btn.style, {
    flex: "1",
    height: "70%",
    borderRadius: "12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.15s ease",
    outline: "none",
    position: "relative",
    overflow: "visible"
  });

  return btn;
}

export function createGlowElement() {
  const glowEl = document.createElement("div");
  glowEl.dataset.role = "glow";

  Object.assign(glowEl.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "64px",
    height: "64px",
    transform: "translate(-50%, -50%)",
    borderRadius: "999px",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 0.18s ease",
    background: "transparent",
    filter: "blur(10px)"
  });

  return glowEl;
}

export function createIconElement(state, { iconSrc, icon, iconSize, preferImg }) {
  const p = state.params;
  const canMask = !!p.maskTint && !!iconSrc && !preferImg;

  if (canMask) {
    const el = document.createElement("div");
    el.dataset.role = "icon";
    el.dataset.mask = "1";

    Object.assign(el.style, {
      width: `${iconSize}px`,
      height: `${iconSize}px`,
      backgroundColor: p.iconTint || "#ffffff",
      WebkitMaskImage: `url("${iconSrc}")`,
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      WebkitMaskSize: "contain",
      maskImage: `url("${iconSrc}")`,
      maskRepeat: "no-repeat",
      maskPosition: "center",
      maskSize: "contain",
      pointerEvents: "none",
      transform: "translateZ(0)"
    });

    return el;
  }

  if (iconSrc) {
    const img = document.createElement("img");
    img.dataset.role = "icon";

    Object.assign(img.style, {
      width: `${iconSize}px`,
      height: `${iconSize}px`,
      objectFit: "contain",
      pointerEvents: "none",
      userSelect: "none",
      transform: "translateZ(0)"
    });

    img.src = iconSrc;
    return img;
  }

  const span = document.createElement("span");
  span.dataset.role = "icon";
  span.textContent = icon || "★";

  Object.assign(span.style, {
    width: `${iconSize}px`,
    height: `${iconSize}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: `${iconSize}px`,
    lineHeight: "1",
    color: p.iconTint || "#ffffff",
    pointerEvents: "none",
    userSelect: "none",
    transform: "translateZ(0)"
  });

  return span;
}

export function applyButtonsVisuals(state) {
  const p = state.params;

  state.buttons.forEach(({ iconEl, glowEl, data }, id) => {
    if (!iconEl) return;

    const isActive = state.activeId === id;
    const brightness = isActive ? clamp(Number(p.activeBrightness) || 1.35, 1, 3) : 1;
    const glowSize = Number(p.iconGlowSize) || 0;
    const ds = (isActive && glowSize > 0)
      ? `drop-shadow(0 0 ${glowSize}px ${p.iconGlowColor || "#00ccff"})`
      : "";

    const parts = [`brightness(${brightness})`];
    if (ds) parts.push(ds);
    iconEl.style.filter = parts.join(" ");

    if (glowEl) {
      const baseSize = typeof data.iconSize === "number" ? data.iconSize : 26;
      const s = Math.max(44, baseSize * 2.2);

      glowEl.style.width = `${s}px`;
      glowEl.style.height = `${s}px`;
      glowEl.style.background = `radial-gradient(circle, ${p.iconGlowColor || "#00ccff"} 0%, rgba(0,0,0,0) 70%)`;
      glowEl.style.opacity = (isActive && glowSize > 0) ? "0.85" : "0";
      glowEl.style.filter = `blur(${Math.max(6, glowSize)}px)`;
    }

    if (iconEl.dataset.mask === "1") {
      iconEl.style.backgroundColor = p.iconTint || "#ffffff";
    } else if (iconEl.tagName === "SPAN") {
      iconEl.style.color = p.iconTint || "#ffffff";
    }

    const size = typeof data.iconSize === "number" ? data.iconSize : 26;
    iconEl.style.width = `${size}px`;
    iconEl.style.height = `${size}px`;
    iconEl.style.fontSize = `${size}px`;
  });
}

function rgbaFromHex(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex || "#000000");
  const a = clamp(Number(alpha) || 1, 0, 1);
  return `rgba(${r},${g},${b},${a})`;
}

function hexToRgb(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };

  const n = parseInt(h, 16);

  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// CHANGELOG v2:
// • Движение трея переведено с bottom на transform.
// • bottom теперь фиксирует только базовую позицию.
// • panelOffsetPx применяется через translate3d синхронно с trayPanel.
// • Убран источник визуальной “пружины” от layout-пересчёта bottom.
// • Визуал кнопок, glow, handle и стили сохранены.