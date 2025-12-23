// ======================================
// Dain_Coin — TRAY MODULE (v9)
// Active icon brightness (works for PNG/img/mask/text) + remove activeLight overlay
// ======================================
//
// CHANGELOG v9:
// • Реально подключена "Яркость активной иконки" (activeBrightness) через CSS filter: brightness()
//   — работает для IMG/PNG, mask-иконок и SPAN
// • Удалён слой activeLightEl (давал "светлую широкую полосу" над активной иконкой)
// • Сохранён glow (drop-shadow + glow layer), но теперь он комбинируется с brightness
//
// Event IN:
// • trayPanel:offset  { offsetPx, level, dragging }
// • trayPanel:closed  {}
// • trayPanel:motion  { animDuration }
//
// Event OUT/IN (button host):
// • tray:registerButton
// • tray:buttonPressed
// • tray:setPanelLevel
// • tray:openPanel
// • tray:panelDragStart / Move / End
//
// Button payload supported:
// • id (string) required
// • order (number)
// • icon (string/html) fallback
// • iconSrc (string) optional
// • iconSize (number) optional (перекрывает глобальный)
// • preferImg (bool) optional — если true, используем <img> даже при maskTint=1
// • onClick() optional
//
// ======================================

import { defineModule } from "../../moduleFactory.js";

// ====== INSPECTOR ======

const trayInspector = {
  "Высота трея (vh)": { min: 6, max: 18, step: 1, value: 9, param: "trayHeight", type: "slider" },
  "Ширина трея (% экрана)": { min: 60, max: 100, step: 1, value: 96, param: "trayWidth", type: "slider" },
"Отступ снизу (px)": { min: 0, max: 40, step: 1, value: 12,  param: "marginBottom", type: "slider" },
"Отступ по бокам (px)": { min: 0, max: 40, step: 1, value: 9, param: "marginSide",   type: "slider", hidden: true },
  "Скругление (px)": { min: 8, max: 32, step: 1, value: 19, param: "radius", type: "slider" },

  "Цвет панели": { value: "#141414", param: "panelColor", type: "color" },
  "Прозрачность панели": { min: 0.6, max: 1, step: 0.02, value: 0.9, param: "alpha", type: "slider" },

  "Цвет рамки": { value: "#545454", param: "borderColor", type: "color" },
  "Толщина рамки (px)": { min: 0, max: 4, step: 1, value: 1, param: "borderWidth", type: "slider", hidden: true },
  "Размер тени (px)": { min: 0, max: 200, step: 5, value: 50, param: "shadowSize", type: "slider" },

  "Яркость активной иконки": { min: 1, max: 2.4, step: 0.05, value: 1.35, param: "activeBrightness", type: "slider", hidden: true },
  "Интенсивность glow (px)": { min: 0, max: 30, step: 1, value: 10, param: "iconGlowSize", type: "slider", hidden: true },
  "Цвет glow": { value: "#00ccff", param: "iconGlowColor", type: "color" },

  // Tint:
  "Тинт иконок (mask)": { type: "toggle", value: 1, param: "maskTint", hidden: true },
  "Цвет иконки": { value: "#ffffff", param: "iconTint", type: "color" },

  "Показывать ручку (handle)": { type: "toggle", value: 1, param: "showHandle" },
  "Порог старта drag (px)": { min: 3, max: 20, step: 1, value: 5, param: "dragStartThreshold", type: "slider", hidden:true },
  "Окно скорости (мс)": { min: 40, max: 180, step: 10, value: 50, param: "velocityWindowMs", type: "slider", hidden: true }
};

// ====== MODULE ======

export const registerTrayModule = defineModule({
  key: "__trayModule",
  name: "Нижний трей",
  inspector: trayInspector,
  dependencies: [],

  createState() {
    return {
      params: {
        trayHeight: trayInspector["Высота трея (vh)"].value,
        trayWidth: trayInspector["Ширина трея (% экрана)"].value,
        marginBottom: trayInspector["Отступ снизу (px)"].value,
marginSide: trayInspector["Отступ по бокам (px)"].value,
        radius: trayInspector["Скругление (px)"].value,

        panelColor: trayInspector["Цвет панели"].value,
        alpha: trayInspector["Прозрачность панели"].value,

        borderColor: trayInspector["Цвет рамки"].value,
        borderWidth: trayInspector["Толщина рамки (px)"].value,
        shadowSize: trayInspector["Размер тени (px)"].value,

        activeBrightness: trayInspector["Яркость активной иконки"].value,
        iconGlowSize: trayInspector["Интенсивность glow (px)"].value,
        iconGlowColor: trayInspector["Цвет glow"].value,

        maskTint: !!trayInspector["Тинт иконок (mask)"].value,
        iconTint: trayInspector["Цвет иконки"].value,

        showHandle: !!trayInspector["Показывать ручку (handle)"].value,
        dragStartThreshold: trayInspector["Порог старта drag (px)"].value,
        velocityWindowMs: trayInspector["Окно скорости (мс)"].value
      },

      // sync from panel
      panelOffsetPx: 0,
      panelLevel: 0,
      animDuration: 300,

      // DOM
      tray: null,
      handle: null,
      buttonsWrap: null,

      // buttons
      buttons: new Map(), // id -> { button, iconEl, glowEl, data }
      activeId: null,

      // gesture
      touching: false,
      dragging: false,
      startY: 0,
      samples: [], // {t,y}
      samplesLastBackup: null
    };
  },

  onStart({ state, bus }) {
    const tray = document.createElement("div");
    Object.assign(tray.style, {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9000,
      backdropFilter: "blur(10px)",
      pointerEvents: "auto",
      willChange: "bottom",
      touchAction: "none",
      overflow: "hidden"
    });

    // handle
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

    // buttons wrap
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
    document.body.appendChild(tray);

    state.tray = tray;
    state.handle = handle;
    state.buttonsWrap = buttonsWrap;

    applyTrayVisuals(state);
    applyButtonsVisuals(state);

    // ====== SYNC FROM PANEL ======
    bus.on("trayPanel:motion", ({ animDuration }) => {
      if (typeof animDuration === "number") {
        state.animDuration = animDuration;
        applyTrayMotion(state);
      }
    }, { moduleKey: "__trayModule" });

    bus.on("trayPanel:offset", ({ offsetPx, level, dragging }) => {
      state.panelOffsetPx = offsetPx || 0;
      state.panelLevel = typeof level === "number" ? level : 0;

      if (dragging) disableTrayMotion(state);
      else applyTrayMotion(state);

      applyTrayPosition(state);

      if (state.panelLevel === 0) deactivateButton(state);
    }, { moduleKey: "__trayModule" });

    bus.on("trayPanel:closed", () => deactivateButton(state), {
      moduleKey: "__trayModule"
    });

    // ====== BUTTON HOST ======
    bus.on("tray:registerButton", (data) => registerButton(state, bus, data), {
      moduleKey: "__trayModule"
    });

    bus.on("tray:updateButton", ({ id, iconSize }) => {
  const entry = state.buttons.get(id);
  if (!entry || typeof iconSize !== "number") return;

  entry.data.iconSize = iconSize;
  applyButtonsVisuals(state);
}, { moduleKey: "__trayModule" });
    
    // ====== GESTURE ON TRAY ======
    tray.addEventListener("touchstart", e => onTouchStart(e, state, bus), { passive: false });
    tray.addEventListener("touchmove",  e => onTouchMove(e, state, bus),  { passive: false });
    tray.addEventListener("touchend",   e => onTouchEnd(e, state, bus),   { passive: false });
    tray.addEventListener("touchcancel",e => onTouchEnd(e, state, bus),   { passive: false });
  },

  onDisable({ state }) {
    state.buttons.clear();
    if (state.tray) state.tray.remove();
    state.tray = null;
    state.buttonsWrap = null;
    state.handle = null;
    state.activeId = null;

    state.touching = false;
    state.dragging = false;
    state.samples = [];
    state.samplesLastBackup = null;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (param === "showHandle" && state.handle) {
      state.handle.style.display = value ? "flex" : "none";
    }

    // если меняются параметры иконок — переаплай
    if (
      param === "activeBrightness" ||
      param === "iconGlowSize" ||
      param === "iconGlowColor" ||
      param === "maskTint" ||
      param === "iconTint"
    ) {
      applyButtonsVisuals(state);
    }

    applyTrayVisuals(state);
  }
});

// =========================
// TRAY VISUALS / POSITION / MOTION
// =========================

function applyTrayVisuals(state) {
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

function applyTrayPosition(state) {
  const tray = state.tray;
  const p = state.params;
  if (!tray) return;

  const baseBottom = (state.panelOffsetPx || 0) + p.marginBottom;
  tray.style.bottom = `calc(var(--safe-bottom, 0px) + ${baseBottom}px)`;
}

function applyTrayMotion(state) {
  const tray = state.tray;
  if (!tray) return;
  tray.style.transition = `bottom ${state.animDuration}ms ease`;
}

function disableTrayMotion(state) {
  const tray = state.tray;
  if (!tray) return;
  tray.style.transition = "none";
}

// =========================
// BUTTONS (ICON-ONLY STYLE)
// =========================

function registerButton(state, bus, data) {
  const {
    id,
    order = 0,
    icon,
    iconSrc,
    iconSize, // ✅ no default (global fallback below)
    preferImg = false,
    onClick
  } = data || {};

  if (!id || state.buttons.has(id) || !state.buttonsWrap) return;

  const btn = document.createElement("button");
  btn.dataset.trayButton = id;

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
    outline: "none"
  });

  // glow layer host
  btn.style.position = "relative";
  btn.style.overflow = "visible";

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

  btn.appendChild(glowEl);

  // ✅ global fallback
  const finalIconSize =
    typeof iconSize === "number"
      ? iconSize
      : 26;

  // icon element (мы будем менять filter/тени только на нём)
  const iconEl = createIconElement(state, {
    iconSrc,
    icon,
    iconSize: finalIconSize,
    preferImg
  });

  // иконка всегда поверх glow
  iconEl.style.position = "relative";
  iconEl.style.zIndex = "1";
  iconEl.style.transition = "filter 0.18s ease";
  iconEl.style.willChange = "filter";

  btn.appendChild(iconEl);

  btn.onmousedown = () => (btn.style.transform = "scale(0.92)");
  btn.onmouseup = () => (btn.style.transform = "scale(1)");
  btn.onmouseleave = () => (btn.style.transform = "scale(1)");

  btn.onclick = () => {
    if (state.dragging) return;

    bus.emit("tray:buttonPressed", { id });
    activateButton(state, id);

    // по ТЗ: кнопка → панель на level 1
    bus.emit("tray:setPanelLevel", { level: 1 });
    bus.emit("tray:openPanel");

    if (typeof onClick === "function") onClick();
  };

  state.buttons.set(id, {
    button: btn,
    iconEl,
    glowEl,
    data: { ...data, order }
  });

  // sort + rebuild
  const ordered = [...state.buttons.entries()].sort(
    (a, b) => (a[1].data.order || 0) - (b[1].data.order || 0)
  );

  state.buttonsWrap.innerHTML = "";
  ordered.forEach(([, obj]) => state.buttonsWrap.appendChild(obj.button));

  applyButtonsVisuals(state);
}

function createIconElement(state, { iconSrc, icon, iconSize, preferImg }) {
  const p = state.params;

  // maskTint mode: best for monochrome png/svg (NOT for gif)
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

  // fallback: text/icon glyph
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

function applyButtonsVisuals(state) {
  const p = state.params;

  state.buttons.forEach(({ button, iconEl, glowEl, data }, id) => {
    if (!button || !iconEl) return;

    const isActive = state.activeId === id;

    // ====== BRIGHTNESS (works for IMG/PNG + MASK + TEXT) ======
    const ab = clamp(Number(p.activeBrightness) || 1.35, 1, 3);
    const brightness = isActive ? ab : 1;

    // baseline glow через drop-shadow (приятно для SPAN/MASK/IMG)
    const glowSize = Number(p.iconGlowSize) || 0;
    const ds = (isActive && glowSize > 0)
      ? `drop-shadow(0 0 ${glowSize}px ${p.iconGlowColor || "#00ccff"})`
      : "";

    // комбинируем фильтры (важно: brightness всегда задан, чтобы не "залипало")
    const parts = [`brightness(${brightness})`];
    if (ds) parts.push(ds);
    iconEl.style.filter = parts.join(" ");

    // ====== MAIN GLOW LAYER (гарантированный, особенно для PNG) ======
    if (glowEl) {
      // размер glow подстраиваем под размер иконки, чтобы выглядел “премиально”
      const baseSize = typeof data.iconSize === "number"
        ? data.iconSize
        : Number(p.iconSize) || 26;

      const s = Math.max(44, baseSize * 2.2);
      glowEl.style.width = `${s}px`;
      glowEl.style.height = `${s}px`;

      // цвет glow
      const c = p.iconGlowColor || "#00ccff";
      glowEl.style.background = `radial-gradient(circle, ${c} 0%, rgba(0,0,0,0) 70%)`;

      // показываем glow только на активной
      glowEl.style.opacity = (isActive && glowSize > 0) ? "0.85" : "0";
      glowEl.style.filter = `blur(${Math.max(6, glowSize)}px)`;
    }

    // tint:
    if (iconEl.dataset.mask === "1") {
      iconEl.style.backgroundColor = p.iconTint || "#ffffff";
    } else if (iconEl.tagName === "SPAN") {
      iconEl.style.color = p.iconTint || "#ffffff";
    }

    // ensure correct size for global changes (если кнопка не задала свой iconSize)
    const size = typeof data.iconSize === "number"
      ? data.iconSize
      : Number(p.iconSize) || 26;

    iconEl.style.width = `${size}px`;
    iconEl.style.height = `${size}px`;
    iconEl.style.fontSize = `${size}px`;
  });
}

function activateButton(state, id) {
  state.activeId = id;
  applyButtonsVisuals(state);
}

function deactivateButton(state) {
  state.activeId = null;
  applyButtonsVisuals(state);
}

// =========================
// GESTURE -> TRAYPANEL BRIDGE
// =========================

function onTouchStart(e, state, bus) {
  if (!e.touches || e.touches.length !== 1) return;

  state.touching = true;
  state.dragging = false;
  state.startY = e.touches[0].clientY;

  state.samples = [];
  state.samplesLastBackup = null;
  recordSample(state, state.startY);

  // сообщаем панели: готовимся к drag
  bus.emit("tray:panelDragStart");
}

function onTouchMove(e, state, bus) {
  if (!state.touching || !e.touches || e.touches.length !== 1) return;

  const y = e.touches[0].clientY;
  const dyFromStart = y - state.startY;

  recordSample(state, y);

  // пока не превысили порог — не считаем это drag
  const thr = Number(state.params.dragStartThreshold) || 7;
  if (!state.dragging) {
    if (Math.abs(dyFromStart) < thr) return;
    state.dragging = true;
  }

  // realtime: двигаем панель на каждый move
  e.preventDefault();
  bus.emit("tray:panelDragMove", { dy: y - state.startY });

  // обновляем startY для инкрементального dy
  state.startY = y;
}

function onTouchEnd(e, state, bus) {
  if (!state.touching) return;

  state.touching = false;

  // velocity (px/ms)
  const vy = computeVelocity(state);

  // если drag так и не начался — считаем это "tap"
  if (!state.dragging) {
    state.dragging = false;
    state.samples = [];
    state.samplesLastBackup = null;
    return;
  }

  bus.emit("tray:panelDragEnd", { vy });

  state.dragging = false;
  state.samples = [];
  state.samplesLastBackup = null;
}

function recordSample(state, y) {
  const now = performance.now();
  state.samples.push({ t: now, y });

  const win = Number(state.params.velocityWindowMs) || 100;
  const cutoff = now - win;

  while (state.samples.length > 0 && state.samples[0].t < cutoff) {
    state.samples.shift();
  }

  if (state.samples.length >= 2) {
    state.samplesLastBackup = [...state.samples];
  }
}

function computeVelocity(state) {
  const samples = state.samples.length >= 2
    ? state.samples
    : (state.samplesLastBackup || []);

  if (!samples || samples.length < 2) return 0;

  const first = samples[0];
  const last = samples[samples.length - 1];

  const dt = last.t - first.t;
  if (dt <= 0) return 0;

  const dy = last.y - first.y;
  return dy / dt;
}

// =========================
// UTILS
// =========================

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