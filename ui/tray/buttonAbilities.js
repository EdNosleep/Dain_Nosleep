// ======================================
// NOSLEEP_ENGINE — TRAY BUTTON: ABILITIES (v4)
// Shared TrayPanelLayout
// ======================================

import { defineTrayButton } from "./defineTrayButton.js";
import { createTrayPanelLayout } from "./trayPanelLayout.js";

const ICON_PATH = "./assets/tray/trayButtons1/iconAbility.png";

export const registerTrayButtonAbilitiesModule = defineTrayButton({
  key: "__trayButtonAbilitiesModule",
  name: "Кнопка: Способности",

  id: "abilities",
  order: 2,
  icon: "✨",
  iconSize: 28,
  preferImg: false,

  async resolveIcon() {
    const ok = await checkImage(ICON_PATH);
    return {
      iconSrc: ok ? ICON_PATH : null,
      icon: ok ? null : "✨"
    };
  },

  panel({ container }) {
    const layout = createTrayPanelLayout({
      title: "Способности",
      bodyPadding: "8px 8px 14px",
      bodyGap: "12px",
      maskEnabled: true,
      maskTopPx: 28,
      maskBottomPx: 34
    });

    const hint = document.createElement("div");
    hint.textContent = "Здесь будет дерево навыков и апгрейды.";

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
// • Панель способностей переведена на общий trayPanelLayout.
// • Заголовок стал фиксированным.
// • Scroll-body получил общий transparent mask.
// • Сохранены icon/resolveIcon/defineTrayButton-контракт.
// • Заглушка подготовлена под будущий skill tree.