// ======================================
// Dain_Coin — TRAY BUTTON: INVENTORY (v5)
// Universal Asset Browser + primitives drag
// ======================================

import { defineTrayButton } from "./defineTrayButton.js";
import { itemCatalog } from "../../gameplay/data/itemCatalog.js";
import { primitiveCatalog } from "../../entity/data/primitiveCatalog.js";

const ICON_PATH = "../../assets/tray/trayButtons1/trayIconInventory.png";

export const registerTrayButtonInventoryModule = defineTrayButton({
  key: "__trayButtonInventoryModule",
  name: "Инвентарь / Assets",

  id: "inventory",
  order: 5,
  icon: "🎒",
  iconSize: 28,
  preferImg: false,

  inspector: {
    "Размер ячейки (px)": { param: "cellSize", type: "range", min: 48, max: 120, step: 2, value: 72 },
    "Ячеек в ряду": { param: "cellsPerRow", type: "range", min: 3, max: 8, step: 1, value: 5 },
    "Отступ между ячейками": { param: "cellGap", type: "range", min: 4, max: 20, step: 1, value: 10 },
    "Скругление ячейки": { param: "cellRadius", type: "range", min: 6, max: 24, step: 1, value: 14 },
    "Цвет активной рамки": { param: "activeBorderColor", type: "color", value: "#00ccff" },
    "Glow активной ячейки": { param: "activeGlow", type: "range", min: 0, max: 30, step: 1, value: 12 }
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
      __rerender: null
    };
  },

  onParam({ param, value, state }) {
    state.params[param] = value;
    state.__rerender?.();
  },

  panel({ container, store, bus, state }) {
    state.cleanup?.();

    const root = document.createElement("div");
    Object.assign(root.style, {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      padding: "6px",
      color: "#fff"
    });

    const title = makeTitle("Инвентарь / Asset Browser");
    const primitiveTitle = makeSectionTitle("Фигуры");
    const primitiveGrid = document.createElement("div");

    const avatarTitle = makeSectionTitle("Аватары");
    const avatarGrid = document.createElement("div");

    const skinTitle = makeSectionTitle("Скины");
    const skinGrid = document.createElement("div");

    const presetTitle = makeSectionTitle("Сохранённые пресеты");
    const presetGrid = document.createElement("div");

    root.append(
      title,
      primitiveTitle,
      primitiveGrid,
      avatarTitle,
      avatarGrid,
      skinTitle,
      skinGrid,
      presetTitle,
      presetGrid
    );

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

    const unsubInv = store.subscribe("inventory", render);
    const unsubEq = store.subscribe("equipment", render);
    const unsubPresets = store.subscribe("customEntityPresets", render);

    state.cleanup = () => {
      try { unsubInv?.(); } catch (_) {}
      try { unsubEq?.(); } catch (_) {}
      try { unsubPresets?.(); } catch (_) {}
      try { state.ghost?.remove(); } catch (_) {}
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

function makeTitle(text) {
  const el = document.createElement("div");
  el.textContent = text;
  Object.assign(el.style, {
    fontSize: "20px",
    fontWeight: "800",
    padding: "4px 6px",
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

function renderPrimitiveGrid({ grid, items, state, bus }) {
  applyGridStyle(grid, state);
  grid.innerHTML = "";

  items.forEach(def => {
    const btn = makeCell(state);
    btn.innerHTML = `
      <div style="font-size:26px;line-height:1">${def.icon || "◆"}</div>
      <div style="font-size:11px;font-weight:800;opacity:.9">${def.name}</div>
    `;

    btn.onclick = () => {
      bus.emit("entityEditor:addPrimitive", { primitiveId: def.id });
    };

    btn.onpointerdown = e => {
      e.preventDefault();
      startGhostDrag({ e, state, bus, item: def });
    };

    grid.appendChild(btn);
  });
}

function startGhostDrag({ e, state, bus, item }) {
  const ghost = document.createElement("div");
  ghost.textContent = item.icon || "◆";

  Object.assign(ghost.style, {
    position: "fixed",
    left: `${e.clientX - 28}px`,
    top: `${e.clientY - 28}px`,
    width: "56px",
    height: "56px",
    borderRadius: "18px",
    background: "rgba(0,204,255,0.18)",
    border: "1px solid rgba(0,204,255,0.55)",
    boxShadow: "0 0 24px rgba(0,204,255,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "30px",
    zIndex: "20000",
    pointerEvents: "none",
    backdropFilter: "blur(10px)"
  });

  document.body.appendChild(ghost);
  state.ghost = ghost;

  const move = ev => {
    ghost.style.left = `${ev.clientX - 28}px`;
    ghost.style.top = `${ev.clientY - 28}px`;
  };

  const up = ev => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);

    ghost.remove();
    state.ghost = null;

    bus.emit("ui:assetDragEnd", {
      kind: "primitive",
      id: item.id,
      clientX: ev.clientX,
      clientY: ev.clientY
    });
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
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

function makeCell(state, active = false) {
  const p = getParams(state);
  const btn = document.createElement("button");
  btn.type = "button";

  Object.assign(btn.style, {
    width: `${p.cellSize}px`,
    height: `${p.cellSize}px`,
    borderRadius: `${p.cellRadius}px`,
    border: active
      ? `2px solid ${p.activeBorderColor}`
      : "1px solid rgba(255,255,255,0.14)",
    boxShadow: active
      ? `0 0 ${p.activeGlow}px ${p.activeBorderColor}`
      : "none",
    background: "rgba(255,255,255,0.055)",
    color: "#fff",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    touchAction: "none",
    transition: "transform .14s ease, filter .14s ease"
  });

  btn.onpointerdown = () => {
    btn.style.transform = "scale(.96)";
    btn.style.filter = "brightness(.9)";
  };

  btn.onpointerup = btn.onpointerleave = () => {
    btn.style.transform = "scale(1)";
    btn.style.filter = "none";
  };

  return btn;
}

function getParams(state) {
  return {
    cellSize: state.params.cellSize ?? 72,
    cellsPerRow: state.params.cellsPerRow ?? 5,
    cellGap: state.params.cellGap ?? 10,
    cellRadius: state.params.cellRadius ?? 14,
    activeBorderColor: state.params.activeBorderColor ?? "#00ccff",
    activeGlow: state.params.activeGlow ?? 12
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

// CHANGELOG v5:
// • Inventory стал универсальным Asset Browser
// • Добавлена секция “Фигуры”
// • Добавлен drag primitive → 3D stage
// • Сохранены avatars / skins
// • Добавлена секция customEntityPresets
