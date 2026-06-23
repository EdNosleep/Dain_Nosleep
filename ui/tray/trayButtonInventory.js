// ======================================
// Dain_Coin — TRAY BUTTON: INVENTORY (v8)
// Premium Catalog Primitive Ghost + Stable Vertical Drag
// ======================================

import { defineTrayButton } from "./defineTrayButton.js";
import { itemCatalog } from "../../gameplay/data/itemCatalog.js";
import { primitiveCatalog } from "../../entity/data/primitiveCatalog.js";

const ICON_PATH = "./assets/tray/trayButtons1/trayIconInventory.png";
const STYLE_ID = "dain-inventory-premium-drag-style";

export const registerTrayButtonInventoryModule = defineTrayButton({
  key: "__trayButtonInventoryModule",
  name: "Инвентарь / Assets",

  id: "inventory",
  order: 5,
  icon: "🎒",
  iconSize: 28,
  preferImg: false,

  inspector: {
    "Размер ячейки (px)": { param: "cellSize", type: "range", min: 48, max: 120, step: 2, value: 60 },
    "Ячеек в ряду": { param: "cellsPerRow", type: "range", min: 3, max: 8, step: 1, value: 5 },
    "Отступ между ячейками": { param: "cellGap", type: "range", min: 4, max: 20, step: 1, value: 10 },
    "Скругление ячейки": { param: "cellRadius", type: "range", min: 6, max: 24, step: 1, value: 14 },
    "Цвет активной рамки": { param: "activeBorderColor", type: "color", value: "#00ccff" },
    "Glow активной ячейки": { param: "activeGlow", type: "range", min: 0, max: 30, step: 1, value: 12 },

    "Long press drag (мс)": { param: "longPressMs", type: "range", min: 180, max: 700, step: 20, value: 360 },
    "Порог отмены drag (px)": { param: "dragCancelThreshold", type: "range", min: 6, max: 28, step: 1, value: 14 },
    "Размер ghost (px)": { param: "ghostSize", type: "range", min: 48, max: 140, step: 2, value: 86 },
    "Glow ghost": { param: "ghostGlow", type: "range", min: 0, max: 60, step: 1, value: 34 }
  },

  async resolveIcon() {
    const ok = await checkImage(ICON_PATH);
    return {
      iconSrc: ok ? ICON_PATH : null,
      icon: ok ? null : "🎒"
    };
  },

  createState() {
    return {
      cleanup: null,
      params: {},
      ghost: null,
      __rerender: null,
      scrollTop: 0,
      activePress: null,
      dragLockRestore: null
    };
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
    state.__rerender?.();
  },

  panel({ container, store, bus, state }) {
    state.cleanup?.();
    ensurePremiumDragStyle();

    const root = document.createElement("div");
    Object.assign(root.style, {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      maxHeight: "100%",
      minHeight: "0",
      overflow: "hidden",
      color: "#fff",
      boxSizing: "border-box"
    });

    const title = makeTitle("Инвентарь / Asset Browser");

    const scroller = document.createElement("div");
    Object.assign(scroller.style, {
      display: "flex",
      flexDirection: "column",
      flex: "1 1 auto",
      minHeight: "0",
      overflowY: "auto",
      overflowX: "hidden",
      overscrollBehavior: "contain",
      WebkitOverflowScrolling: "touch",
      gap: "14px",
      padding: "6px",
      boxSizing: "border-box"
    });

    const primitiveTitle = makeSectionTitle("Фигуры");
    const primitiveGrid = document.createElement("div");

    const avatarTitle = makeSectionTitle("Аватары");
    const avatarGrid = document.createElement("div");

    const skinTitle = makeSectionTitle("Скины");
    const skinGrid = document.createElement("div");

    const presetTitle = makeSectionTitle("Сохранённые пресеты");
    const presetGrid = document.createElement("div");

    scroller.append(
      primitiveTitle,
      primitiveGrid,
      avatarTitle,
      avatarGrid,
      skinTitle,
      skinGrid,
      presetTitle,
      presetGrid
    );

    root.append(title, scroller);
    container.appendChild(root);

    const render = () => {
      const inventory = store.get("inventory") || {};
      const equipment = store.get("equipment") || {};
      const presets = store.get("customEntityPresets") || [];

      renderPrimitiveGrid({
        grid: primitiveGrid,
        items: Object.values(primitiveCatalog),
        state,
        bus
      });

      renderItemGrid({
        grid: avatarGrid,
        ids: Array.isArray(inventory.avatars) ? inventory.avatars : [],
        catalog: itemCatalog.avatars,
        activeId: equipment.avatarId || null,
        state,
        onSelect: id => bus.emit("avatar:select", { id })
      });

      const skins = Array.isArray(inventory.skins) ? inventory.skins : [];
      skinTitle.style.display = skins.length ? "" : "none";
      skinGrid.style.display = skins.length ? "" : "none";

      renderItemGrid({
        grid: skinGrid,
        ids: skins,
        catalog: itemCatalog.skins,
        activeId: equipment.skinId || null,
        state,
        onSelect: id => bus.emit("skin:select", { id })
      });

      presetTitle.style.display = presets.length ? "" : "none";
      presetGrid.style.display = presets.length ? "" : "none";

      renderPresetGrid({
        grid: presetGrid,
        presets,
        state
      });
    };

    state.__rerender = render;
    render();

    requestAnimationFrame(() => {
      scroller.scrollTop = state.scrollTop || 0;
    });

    scroller.addEventListener("scroll", () => {
      state.scrollTop = scroller.scrollTop || 0;
    }, { passive: true });

    const unsubInv = store.subscribe("inventory", render);
    const unsubEq = store.subscribe("equipment", render);
    const unsubPresets = store.subscribe("customEntityPresets", render);

    state.cleanup = () => {
      state.scrollTop = scroller.scrollTop || 0;
      cancelActivePress(state);

      try { unsubInv?.(); } catch (_) {}
      try { unsubEq?.(); } catch (_) {}
      try { unsubPresets?.(); } catch (_) {}
      try { state.ghost?.remove(); } catch (_) {}

      unlockDocumentDrag(state);
      state.ghost = null;
      root.remove();
    };

    return state.cleanup;
  },

  onDisable({ state }) {
    state.cleanup?.();
    state.cleanup = null;
  }
});

function renderPrimitiveGrid({ grid, items, state, bus }) {
  applyGridStyle(grid, state);
  grid.innerHTML = "";

  items.forEach(def => {
    const btn = makeCell(state, false, true);

    const shape = createCatalogPrimitiveShape(def, 30, false);
    const label = document.createElement("div");
    label.textContent = def.name;

    Object.assign(label.style, {
      fontSize: "11px",
      fontWeight: "900",
      opacity: "0.92",
      letterSpacing: "-0.02em"
    });

    btn.append(shape, label);

    btn.onpointerdown = e => {
      startPrimitivePress({ event: e, state, bus, item: def, button: btn });
    };

    grid.appendChild(btn);
  });
}

function startPrimitivePress({ event, state, bus, item, button }) {
  if (!event.isPrimary) return;

  event.preventDefault();
  cancelActivePress(state);

  const p = getParams(state);
  const startX = event.clientX;
  const startY = event.clientY;

  let dragging = false;
  let cancelled = false;
  let lastX = startX;
  let lastY = startY;

  button.setPointerCapture?.(event.pointerId);
  pressButton(button, true);

  const longPressTimer = setTimeout(() => {
    if (cancelled) return;

    dragging = true;
    lockDocumentDrag(state);

    button.style.transform = "scale(1)";
    button.style.filter = "none";

    bus.emit("tray:setPanelLevel", { level: 0 });

    createPrimitiveGhost({
      state,
      item,
      x: lastX,
      y: lastY
    });

    bus.emit("ui:assetDragStart", {
      kind: "primitive",
      id: item.id,
      primitiveId: item.id,
      clientX: lastX,
      clientY: lastY
    });
  }, p.longPressMs);

  const move = ev => {
    lastX = ev.clientX;
    lastY = ev.clientY;

    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const dist = Math.hypot(dx, dy);

    if (!dragging && dist > p.dragCancelThreshold) {
      cancelled = true;
      clearTimeout(longPressTimer);
      pressButton(button, false);
      return;
    }

    if (!dragging) return;

    ev.preventDefault();
    moveGhost(state, ev.clientX, ev.clientY);

    bus.emit("ui:assetDragMove", {
      kind: "primitive",
      id: item.id,
      primitiveId: item.id,
      clientX: ev.clientX,
      clientY: ev.clientY
    });
  };

  const finish = ev => {
    clearTimeout(longPressTimer);
    removeDragListeners(move, finish, cancel);

    pressButton(button, false);

    if (!dragging && !cancelled) {
      bus.emit("entityEditor:addPrimitive", { primitiveId: item.id });
      clearGhost(state);
      unlockDocumentDrag(state);
      state.activePress = null;
      return;
    }

    if (dragging) {
      bus.emit("ui:assetDragEnd", {
        kind: "primitive",
        id: item.id,
        primitiveId: item.id,
        clientX: ev.clientX ?? lastX,
        clientY: ev.clientY ?? lastY
      });
    }

    clearGhost(state);
    unlockDocumentDrag(state);
    state.activePress = null;
  };

  const cancel = ev => {
    clearTimeout(longPressTimer);
    removeDragListeners(move, finish, cancel);

    pressButton(button, false);

    if (dragging) {
      bus.emit("ui:assetDragEnd", {
        kind: "primitive",
        id: item.id,
        primitiveId: item.id,
        clientX: ev?.clientX ?? lastX,
        clientY: ev?.clientY ?? lastY
      });
    }

    clearGhost(state);
    unlockDocumentDrag(state);
    state.activePress = null;
  };

  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", finish, { once: true, passive: false });
  window.addEventListener("pointercancel", cancel, { once: true, passive: false });
  window.addEventListener("lostpointercapture", cancel, { once: true, passive: false });

  state.activePress = {
    cancel,
    timer: longPressTimer
  };
}

function removeDragListeners(move, finish, cancel) {
  window.removeEventListener("pointermove", move);
  window.removeEventListener("pointerup", finish);
  window.removeEventListener("pointercancel", cancel);
  window.removeEventListener("lostpointercapture", cancel);
}

function cancelActivePress(state) {
  if (!state.activePress) return;

  try { clearTimeout(state.activePress.timer); } catch (_) {}
  try { state.activePress.cancel?.(); } catch (_) {}

  state.activePress = null;
}

function lockDocumentDrag(state) {
  if (state.dragLockRestore) return;

  const html = document.documentElement;
  const body = document.body;

  const prev = {
    htmlTouchAction: html.style.touchAction,
    bodyTouchAction: body.style.touchAction,
    bodyUserSelect: body.style.userSelect,
    bodyWebkitUserSelect: body.style.webkitUserSelect,
    bodyOverscroll: body.style.overscrollBehavior
  };

  html.style.touchAction = "none";
  body.style.touchAction = "none";
  body.style.userSelect = "none";
  body.style.webkitUserSelect = "none";
  body.style.overscrollBehavior = "none";

  state.dragLockRestore = () => {
    html.style.touchAction = prev.htmlTouchAction;
    body.style.touchAction = prev.bodyTouchAction;
    body.style.userSelect = prev.bodyUserSelect;
    body.style.webkitUserSelect = prev.bodyWebkitUserSelect;
    body.style.overscrollBehavior = prev.bodyOverscroll;
  };
}

function unlockDocumentDrag(state) {
  try { state.dragLockRestore?.(); } catch (_) {}
  state.dragLockRestore = null;
}

function createPrimitiveGhost({ state, item, x, y }) {
  clearGhost(state);

  const p = getParams(state);
  const ghost = document.createElement("div");
  ghost.className = "dain-inventory-primitive-ghost";

  const shapeSize = Math.round(p.ghostSize * 0.88);
  const shape = createCatalogPrimitiveShape(item, shapeSize, true);

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
    backdropFilter: "none",
    WebkitBackdropFilter: "none",

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

function moveGhost(state, x, y) {
  if (!state.ghost) return;

  const p = getParams(state);
  state.ghost.style.left = `${x}px`;
  state.ghost.style.top = `${y}px`;
  state.ghost.style.marginLeft = `${-p.ghostSize / 2}px`;
  state.ghost.style.marginTop = `${-p.ghostSize / 2}px`;
}

function clearGhost(state) {
  try { state.ghost?.remove(); } catch (_) {}
  state.ghost = null;
}

function createCatalogPrimitiveShape(def, size, premium) {
  const geometry = def?.geometry || def?.id || "box";
  const color = def?.color || "#ededed";

  if (geometry === "sphere") return createSphereShape(size, color, premium);
  if (geometry === "cone") return createConeShape(size, color, premium);
  if (geometry === "cylinder") return createCylinderShape(size, color, premium);
  if (geometry === "capsule") return createCapsuleShape(size, color, premium);

  return createCubeShape(size, color, premium);
}

function createCubeShape(size, color, premium) {
  const root = document.createElement("div");
  root.className = "primitive-shape primitive-cube";

  Object.assign(root.style, {
    width: `${size}px`,
    height: `${size}px`,
    position: "relative",
    transformStyle: "preserve-3d",
    transform: "rotateX(-28deg) rotateY(38deg)",
    filter: premium
      ? "drop-shadow(0 16px 18px rgba(0,0,0,0.42)) drop-shadow(0 0 16px rgba(0,204,255,0.32))"
      : "drop-shadow(0 8px 10px rgba(0,0,0,0.32))"
  });

  const faceData = [
    ["front", `translateZ(${size / 2}px)`, lighten(color, 1.15)],
    ["right", `rotateY(90deg) translateZ(${size / 2}px)`, darken(color, 0.78)],
    ["top", `rotateX(90deg) translateZ(${size / 2}px)`, lighten(color, 1.35)]
  ];

  faceData.forEach(([, transform, faceColor]) => {
    const face = document.createElement("div");
    Object.assign(face.style, {
      position: "absolute",
      inset: "0",
      borderRadius: `${Math.max(4, size * 0.12)}px`,
      background: `linear-gradient(135deg, ${lighten(faceColor, 1.15)}, ${faceColor})`,
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24)",
      transform
    });
    root.appendChild(face);
  });

  return root;
}

function createSphereShape(size, color, premium) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "999px",
    background: `radial-gradient(circle at 34% 28%, #ffffff 0%, ${lighten(color, 1.35)} 18%, ${color} 58%, ${darken(color, 0.54)} 100%)`,
    boxShadow: premium
      ? "0 0 24px rgba(0,204,255,0.42), inset -10px -12px 18px rgba(0,0,0,0.24), inset 5px 5px 12px rgba(255,255,255,0.22)"
      : "inset -7px -9px 14px rgba(0,0,0,0.22)",
    filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.36))"
  });
  return el;
}

function createConeShape(size, color, premium) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "0",
    height: "0",
    borderLeft: `${size * 0.48}px solid transparent`,
    borderRight: `${size * 0.48}px solid transparent`,
    borderBottom: `${size}px solid ${color}`,
    filter: premium
      ? "drop-shadow(0 14px 16px rgba(0,0,0,0.42)) drop-shadow(0 0 18px rgba(0,204,255,0.36))"
      : "drop-shadow(0 8px 10px rgba(0,0,0,0.34))",
    transform: "rotateX(10deg)"
  });
  return el;
}

function createCylinderShape(size, color, premium) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: `${size * 0.72}px`,
    height: `${size}px`,
    borderRadius: `${size * 0.18}px / ${size * 0.5}px`,
    background: `linear-gradient(90deg, ${darken(color, 0.62)} 0%, ${lighten(color, 1.3)} 42%, ${color} 68%, ${darken(color, 0.52)} 100%)`,
    boxShadow: premium
      ? "0 0 22px rgba(0,204,255,0.34), inset 0 0 14px rgba(255,255,255,0.17)"
      : "inset 0 0 10px rgba(255,255,255,0.12)",
    filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.36))",
    transform: "rotateZ(-8deg)"
  });
  return el;
}

function createCapsuleShape(size, color, premium) {
  const el = createCylinderShape(size, color, premium);
  el.style.borderRadius = "999px";
  el.style.width = `${size * 0.64}px`;
  el.style.height = `${size * 1.16}px`;
  return el;
}

function renderItemGrid({ grid, ids, catalog, activeId, state, onSelect }) {
  applyGridStyle(grid, state);
  grid.innerHTML = "";

  ids.forEach(id => {
    const def = catalog?.[id];
    if (!def) return;

    const btn = makeCell(state, id === activeId);

    const img = document.createElement("img");
    img.src = def.imageSrc;
    img.alt = def.name;
    Object.assign(img.style, {
      width: "80%",
      height: "80%",
      objectFit: "contain",
      pointerEvents: "none"
    });

    btn.appendChild(img);
    btn.onclick = () => onSelect?.(id);
    grid.appendChild(btn);
  });
}

function renderPresetGrid({ grid, presets, state }) {
  applyGridStyle(grid, state);
  grid.innerHTML = "";

  presets.forEach(preset => {
    const btn = makeCell(state);
    btn.innerHTML = `
      <div style="font-size:22px">🧩</div>
      <div style="font-size:10px;font-weight:800;opacity:.8">${preset.name}</div>
    `;
    grid.appendChild(btn);
  });
}

function applyGridStyle(grid, state) {
  const p = getParams(state);
  Object.assign(grid.style, {
    display: "grid",
    gridTemplateColumns: `repeat(${p.cellsPerRow}, 1fr)`,
    gap: `${p.cellGap}px`,
    padding: "4px",
    justifyItems: "center"
  });
}

function makeCell(state, active = false, premium = false) {
  const p = getParams(state);
  const btn = document.createElement("button");
  btn.type = "button";

  Object.assign(btn.style, {
    width: `${p.cellSize}px`,
    height: `${p.cellSize}px`,
    borderRadius: `${p.cellRadius}px`,
    border: active
      ? `2px solid ${p.activeBorderColor}`
      : "1px solid rgba(255,255,255,0.16)",
    boxShadow: active
      ? `0 0 ${p.activeGlow}px ${p.activeBorderColor}`
      : premium
        ? "0 0 18px rgba(0,204,255,0.12), inset 0 1px 0 rgba(255,255,255,0.12)"
        : "none",
    background: premium
      ? "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.045))"
      : "rgba(255,255,255,0.055)",
    color: "#fff",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    touchAction: premium ? "none" : "pan-y",
    transition: "transform .14s ease, filter .14s ease, box-shadow .14s ease, border-color .14s ease",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    WebkitUserSelect: "none"
  });

  btn.onpointerdown = () => pressButton(btn, true);
  btn.onpointerup = btn.onpointerleave = () => pressButton(btn, false);

  return btn;
}

function pressButton(btn, pressed) {
  if (!btn) return;

  btn.style.transform = pressed ? "scale(.94) translateY(1px)" : "scale(1) translateY(0)";
  btn.style.filter = pressed ? "brightness(0.92)" : "none";
  btn.style.borderColor = pressed ? "rgba(0,204,255,0.72)" : "rgba(255,255,255,0.16)";
  btn.style.boxShadow = pressed
    ? "0 0 22px rgba(0,204,255,0.28), inset 0 2px 8px rgba(0,0,0,0.28)"
    : "0 0 18px rgba(0,204,255,0.12), inset 0 1px 0 rgba(255,255,255,0.12)";
}

function makeTitle(text) {
  const el = document.createElement("div");
  el.textContent = text;
  Object.assign(el.style, {
    flex: "0 0 auto",
    fontSize: "20px",
    fontWeight: "800",
    padding: "10px 12px 6px",
    opacity: "0.95"
  });
  return el;
}

function makeSectionTitle(text) {
  const el = document.createElement("div");
  el.textContent = text;
  Object.assign(el.style, {
    fontSize: "15px",
    fontWeight: "800",
    opacity: "0.8",
    padding: "4px 6px 0"
  });
  return el;
}

function getParams(state) {
  return {
    cellSize: state.params.cellSize ?? 72,
    cellsPerRow: state.params.cellsPerRow ?? 5,
    cellGap: state.params.cellGap ?? 10,
    cellRadius: state.params.cellRadius ?? 14,
    activeBorderColor: state.params.activeBorderColor ?? "#00ccff",
    activeGlow: state.params.activeGlow ?? 12,
    longPressMs: state.params.longPressMs ?? 360,
    dragCancelThreshold: state.params.dragCancelThreshold ?? 14,
    ghostSize: state.params.ghostSize ?? 86,
    ghostGlow: state.params.ghostGlow ?? 34
  };
}

function ensurePremiumDragStyle() {
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
  let h = String(hex || "#00ccff").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(ch => ch + ch).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "00ccff";

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

function checkImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// CHANGELOG v8:
// • Ghost теперь строится по primitiveCatalog: cube/sphere/cone/cylinder/capsule.
// • Ячейки фигур тоже используют mini-shape вместо простой иконки.
// • Исправлен баг исчезновения ghost при резком вертикальном движении.
// • На время активного drag блокируются touchAction/userSelect/overscroll документа.
// • Pointercancel/lostpointercapture теперь завершают drag через drop, а не просто убивают ghost.
// • Для primitive-кнопок включён touchAction:none, чтобы WebView не перехватывал вертикальный жест.
// • Сохранены tap-to-center и long-press placement flow.