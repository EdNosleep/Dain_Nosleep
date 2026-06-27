// ======================================
// NOSLEEP_ENGINE — TRAY BUTTON 3 (v4)
// Shared TrayPanelLayout
// ======================================

import { defineTrayButton } from "./defineTrayButton.js";
import { createTrayPanelLayout } from "./trayPanelLayout.js";

const ICON_PATH = "./assets/tray/trayButtons1/trayIcon3.png";

export const registerTrayButton3Module = defineTrayButton({
  key: "__trayButton3Module",
  name: "Кнопка: Кнопка 3",

  id: "trayButton3",
  order: 5,
  icon: "🪙",
  iconSize: 28,
  preferImg: false,

  async resolveIcon() {
    const ok = await checkImage(ICON_PATH);
    return {
      iconSrc: ok ? ICON_PATH : null,
      icon: ok ? null : "🪙"
    };
  },

  panel({ container }) {
    const layout = createTrayPanelLayout({
      title: "Коллекция",
      bodyPadding: "8px 8px 14px",
      bodyGap: "12px",
      maskEnabled: true,
      maskTopPx: 28,
      maskBottomPx: 34
    });

    const hint = document.createElement("div");
    hint.textContent = "Здесь будет что-то ещё.";

    Object.assign(hint.style, {
      minHeight: "40vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      fontSize: "14px",
      opacity: "0.75",
      lineHeight: "1.35",
      padding: "12px",
      boxSizing: "border-box"
    });

    layout.body.appendChild(hint);
    container.appendChild(layout.root);

    return () => layout.destroy();
  }
});

function checkImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// CHANGELOG v4:
// • Панель кнопки 3 переведена на общий trayPanelLayout.
// • Заголовок стал фиксированным.
// • Scroll-body получил общий transparent mask.
// • Заглушка сохранена, но приведена к общему UI-контракту.
// • Сохранены icon/resolveIcon/defineTrayButton-контракт.