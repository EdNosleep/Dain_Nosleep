// ======================================
// NOSLEEP_ENGINE — TRAY BUTTON 3 (v5)
// JS-generated icon helper
// ======================================

import { defineTrayButton } from "./defineTrayButton.js";
import { createTrayPanelLayout } from "./trayPanelLayout.js";
import { createTrayIcon3DataUrl } from "./trayIcon3.js";

export const registerTrayButton3Module = defineTrayButton({
  key: "__trayButton3Module",
  name: "Кнопка: Кнопка 3",

  id: "trayButton3",
  order: 5,
  icon: "🪙",
  iconSize: 28,
  preferImg: true,

  async resolveIcon() {
    return {
      iconSrc: createTrayIcon3DataUrl({
        stroke: "#ffffff",
        strokeWidth: 4.8,
        glow: true
      }),
      icon: null
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

// CHANGELOG v5:
// • PNG trayIcon3.png заменён на JS/SVG helper.
// • Убран ICON_PATH и проверка загрузки изображения.
// • Кнопка теперь получает iconSrc через createTrayIcon3DataUrl().
// • Новый helper не является модулем и не регистрируется в main.js.
// • Сохранён defineTrayButton-контракт и панель кнопки.