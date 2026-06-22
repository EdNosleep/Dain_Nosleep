// ======================================
// Dain_Coin — TRAY BUTTON 1 (v4)
// Панель характеристик персонажа
// ======================================
//
// CHANGELOG v4:
// • Панель теперь отображает характеристики игрока
// • Читает store.playerStats (strength / health)
// • Авто-обновление при изменении статов
// • Архитектура SRP: кнопка не считает, только отображает
//
// ======================================

import { defineTrayButton } from "./defineTrayButton.js";

const ICON_PATH = "./assets/tray/trayButtons1/trayIcon1.png";

export const registerTrayButton1Module = defineTrayButton({
  key: "__trayButton1Module",
  name: "Кнопка: Характеристики",

  id: "trayButton1",
  order: 3,
  icon: "🎒",
  iconSize: 28,
  preferImg: false,

  async resolveIcon() {
    const ok = await checkImage(ICON_PATH);
    return {
      iconSrc: ok ? ICON_PATH : null,
      icon: ok ? null : "🎒"
    };
  },

  createState() {
    return {
      cleanup: null
    };
  },

  panel({ container, store, bus, state }) {
    if (state.cleanup) {
      try { state.cleanup(); } catch (_) {}
    }

    // ===== UI ROOT =====
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      padding: "10px 6px",
      color: "#fff"
    });

    const title = document.createElement("div");
    title.textContent = "Характеристики персонажа";
    Object.assign(title.style, {
      fontSize: "22px",
      fontWeight: "700",
      opacity: "0.95"
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "16px",
      padding: "14px",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    });

    const strengthLine = mkLine();
    const healthLine = mkLine();

    card.append(strengthLine, healthLine);
    wrap.append(title, card);
    container.appendChild(wrap);

    // ===== RENDER =====
    const render = () => {
      const stats = store.get("playerStats") || {};
      const strength = stats.strength ?? "—";
      const health = stats.health ?? "—";

      strengthLine.textContent = `Сила персонажа = ${strength}`;
      healthLine.textContent = `Здоровье персонажа = ${health}`;
    };

    render();

    // ===== SUBSCRIPTIONS =====
    const unsub = store.subscribe("playerStats", render);

    const off = bus.on(
      "player:statsUpdated",
      render,
      { moduleKey: "__trayButton1Module" }
    );

    state.cleanup = () => {
      try { unsub?.(); } catch (_) {}
      try { off?.(); } catch (_) {}
      wrap.remove();
    };

    return state.cleanup;
  },

  onDisable({ state }) {
    if (state.cleanup) {
      try { state.cleanup(); } catch (_) {}
    }
    state.cleanup = null;
  }
});

// ===== helpers =====

function mkLine() {
  const el = document.createElement("div");
  Object.assign(el.style, {
    fontSize: "16px",
    fontWeight: "700",
    opacity: "0.95"
  });
  return el;
}

function checkImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}