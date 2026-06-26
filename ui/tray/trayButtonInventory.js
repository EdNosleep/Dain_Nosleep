// ======================================
// NosleepEngine — TRAY BUTTON: INVENTORY (v13)
// Shared TrayPanelLayout + Stable Ghost
// ======================================

import { defineTrayButton } from "./defineTrayButton.js";
import { createTrayPanelLayout } from "./trayPanelLayout.js";
import { itemCatalog } from "../../gameplay/data/itemCatalog.js";
import { primitiveCatalog } from "../../entity/data/primitiveCatalog.js";

import {
  ensureInventoryVisualStyle,
  createPrimitivePreview,
  createPrimitiveGhost,
  movePrimitiveGhost,
  clearPrimitiveGhost,
  normalizeColor
} from "./trayButtonInventoryVisuals.js";

const ICON_PATH = "./assets/tray/trayButtons1/trayIconInventory.png";

export const registerTrayButtonInventoryModule = defineTrayButton({
  key: "__trayButtonInventoryModule",
  name: "Инвентарь / Assets",

  id: "inventory",
  order: 4,
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

    "Цвет фигур Inventory": { param: "primitivePreviewColor", type: "color", value: "#ffd36a" },
    "Размер фигур Inventory (px)": { param: "primitivePreviewSize", type: "range", min: 24, max: 70, step: 2, value: 38 },
    "Цвет ghost фигуры": { param: "primitiveGhostColor", type: "color", value: "#ffd36a" },

    "Long press drag (мс)": { param: "longPressMs", type: "range", min: 180, max: 700, step: 20, value: 360 },
    "Порог отмены drag (px)": { param: "dragCancelThreshold", type: "range", min: 6, max: 28, step: 1, value: 14 },
    "Размер ghost (px)": { param: "ghostSize", type: "range", min: 48, max: 140, step: 2, value: 86 },
    "Glow ghost": { param: "ghostGlow", type: "range", min: 0, max: 60, step: 1, value: 34 }
  },

  async resolveIcon() {
    const ok = await checkImage(ICON_PATH);
    return { iconSrc: ok ? ICON_PATH : null, icon: ok ? null : "🎒" };
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
    ensureInventoryVisualStyle();

    const layout = createTrayPanelLayout({
      title: "Инвентарь / Asset Browser",
      bodyGap: "14px",
      bodyPadding: "6px",
      maskEnabled: true,
      maskTopPx: 28,
      maskBottomPx: 34
    });

    const scroller = layout.scroller;

    const primitiveTitle = makeSectionTitle("Фигуры");
    const primitiveGrid = document.createElement("div");

    const avatarTitle = makeSectionTitle("Аватары");
    const avatarGrid = document.createElement("div");

    const skinTitle = makeSectionTitle("Скины");
    const skinGrid = document.createElement("div");

    const presetTitle = makeSectionTitle("Сохранённые пресеты");
    const presetGrid = document.createElement("div");

    layout.body.append(
      primitiveTitle,
      primitiveGrid,
      avatarTitle,
      avatarGrid,
      skinTitle,
      skinGrid,
      presetTitle,
      presetGrid
    );

    container.appendChild(layout.root);

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

      renderPresetGrid({ grid: presetGrid, presets, state });
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

      clearPrimitiveGhost(state);
      unlockDocumentDrag(state);

      layout.destroy();
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

  const p = getParams(state);

  items.forEach(def => {
    const btn = makeCell(state, false, true);
    const shape = createPrimitivePreview(def, p.primitivePreviewSize, p.primitivePreviewColor, false);

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

  cancelActivePress(state);

  const p = getParams(state);
  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;

  let dragging = false;
  let cancelled = false;
  let finished = false;
  let lastX = startX;
  let lastY = startY;

  pressButton(button, true);

  const longPressTimer = setTimeout(() => {
    if (cancelled || finished) return;

    dragging = true;
    button.style.touchAction = "none";

    try { button.setPointerCapture?.(pointerId); } catch (_) {}

    lockDocumentDrag(state);

    button.style.transform = "scale(1)";
    button.style.filter = "none";

    bus.emit("tray:setPanelLevel", { level: 0 });

    createPrimitiveGhost({
      state,
      item,
      x: lastX,
      y: lastY,
      params: getParams(state)
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

    movePrimitiveGhost(state, ev.clientX, ev.clientY, getParams(state));

    bus.emit("ui:assetDragMove", {
      kind: "primitive",
      id: item.id,
      primitiveId: item.id,
      clientX: ev.clientX,
      clientY: ev.clientY
    });
  };

  const finish = ev => {
    if (finished) return;
    finished = true;

    clearTimeout(longPressTimer);
    removeDragListeners(move, finish, cancel);
    restoreButtonAfterPress(button);

    if (!dragging && !cancelled) {
      bus.emit("entityEditor:addPrimitive", { primitiveId: item.id });
      clearPrimitiveGhost(state);
      unlockDocumentDrag(state);
      state.activePress = null;
      return;
    }

    if (dragging) {
      bus.emit("ui:assetDragEnd", {
        kind: "primitive",
        id: item.id,
        primitiveId: item.id,
        clientX: ev?.clientX ?? lastX,
        clientY: ev?.clientY ?? lastY
      });
    }

    clearPrimitiveGhost(state);
    unlockDocumentDrag(state);
    state.activePress = null;
  };

  const cancel = ev => {
    if (finished) return;

    if (dragging && ev?.type === "lostpointercapture") {
      return;
    }

    finished = true;

    clearTimeout(longPressTimer);
    removeDragListeners(move, finish, cancel);
    restoreButtonAfterPress(button);

    if (dragging) {
      bus.emit("ui:assetDragEnd", {
        kind: "primitive",
        id: item.id,
        primitiveId: item.id,
        clientX: ev?.clientX ?? lastX,
        clientY: ev?.clientY ?? lastY
      });
    }

    clearPrimitiveGhost(state);
    unlockDocumentDrag(state);
    state.activePress = null;
  };

  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", finish, { once: true, passive: false });
  window.addEventListener("pointercancel", cancel, { once: true, passive: false });
  window.addEventListener("lostpointercapture", cancel, { passive: false });

  state.activePress = { cancel, timer: longPressTimer };
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

  const blockTouchMove = ev => {
    if (ev.cancelable) ev.preventDefault();
  };

  html.style.touchAction = "none";
  body.style.touchAction = "none";
  body.style.userSelect = "none";
  body.style.webkitUserSelect = "none";
  body.style.overscrollBehavior = "none";

  window.addEventListener("touchmove", blockTouchMove, {
    passive: false,
    capture: true
  });

  state.dragLockRestore = () => {
    html.style.touchAction = prev.htmlTouchAction;
    body.style.touchAction = prev.bodyTouchAction;
    body.style.userSelect = prev.bodyUserSelect;
    body.style.webkitUserSelect = prev.bodyWebkitUserSelect;
    body.style.overscrollBehavior = prev.bodyOverscroll;

    window.removeEventListener("touchmove", blockTouchMove, {
      capture: true
    });
  };
}

function unlockDocumentDrag(state) {
  try { state.dragLockRestore?.(); } catch (_) {}
  state.dragLockRestore = null;
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
    border: active ? `2px solid ${p.activeBorderColor}` : "1px solid rgba(255,255,255,0.16)",
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
    touchAction: "pan-y",
    transition: "transform .14s ease, filter .14s ease, box-shadow .14s ease, border-color .14s ease",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    WebkitUserSelect: "none"
  });

  btn.onpointerdown = () => pressButton(btn, true);
  btn.onpointerup = btn.onpointerleave = () => restoreButtonAfterPress(btn);

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

function restoreButtonAfterPress(btn) {
  if (!btn) return;
  btn.style.touchAction = "pan-y";
  pressButton(btn, false);
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
    cellSize: state.params.cellSize ?? 60,
    cellsPerRow: state.params.cellsPerRow ?? 5,
    cellGap: state.params.cellGap ?? 10,
    cellRadius: state.params.cellRadius ?? 14,
    activeBorderColor: state.params.activeBorderColor ?? "#00ccff",
    activeGlow: state.params.activeGlow ?? 12,

    primitivePreviewColor: normalizeColor(state.params.primitivePreviewColor, "#ffd36a"),
    primitivePreviewSize: state.params.primitivePreviewSize ?? 38,
    primitiveGhostColor: normalizeColor(state.params.primitiveGhostColor, "#ffd36a"),

    longPressMs: state.params.longPressMs ?? 360,
    dragCancelThreshold: state.params.dragCancelThreshold ?? 14,
    ghostSize: state.params.ghostSize ?? 86,
    ghostGlow: state.params.ghostGlow ?? 34
  };
}

function checkImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// CHANGELOG v13:
// • Inventory переведён на общий trayPanelLayout helper.
// • Заголовок снова фиксированный и не участвует в scroll.
// • Transparent mask теперь применяется только к scroll viewport под заголовком.
// • Убрано локальное создание root/title/scroller.
// • Логика inventory, ghost drag, Store-подписки и scroll restore сохранены.
// • Подготовлена база для перевода Inspector и будущих tray-панелей на единый layout.