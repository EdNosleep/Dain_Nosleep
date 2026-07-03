// ======================================
// NOSLEEP_ENGINE — TRAY BUTTON 1 (v5)
// Панель характеристик персонажа + Shared TrayPanelLayout
// ======================================

import { defineTrayButton } from "./defineTrayButton.js";
import { createTrayPanelLayout } from "./trayPanelLayout.js";

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

    const layout = createTrayPanelLayout({
      title: "Характеристики персонажа",
      bodyPadding: "8px 8px 14px",
      bodyGap: "12px",
      maskEnabled: true,
      maskTopPx: 28,
      maskBottomPx: 34
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
    layout.body.appendChild(card);
    container.appendChild(layout.root);

    const render = () => {
      const stats = store.get("playerStats") || {};
      const strength = stats.strength ?? "—";
      const health = stats.health ?? "—";

      strengthLine.textContent = `Сила персонажа = ${strength}`;
      healthLine.textContent = `Здоровье персонажа = ${health}`;
    };

    render();

    const unsub = store.subscribe("playerStats", render);

    const off = bus.on(
      "player:statsUpdated",
      render,
      { moduleKey: "__trayButton1Module" }
    );

    state.cleanup = () => {
      try { unsub?.(); } catch (_) {}
      try { off?.(); } catch (_) {}
      layout.destroy();
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

// CHANGELOG v5:
// • Панель характеристик переведена на общий trayPanelLayout.
// • Заголовок стал фиксированным.
// • Scroll-body получил общий transparent mask.
// • Отображение playerStats сохранено без изменения логики.
// • Store subscribe и player:statsUpdated сохранены.
// • Архитектура SRP сохранена: кнопка только отображает данные.