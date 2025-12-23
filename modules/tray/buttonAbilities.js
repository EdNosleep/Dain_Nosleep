// ======================================
// Dain_Coin — TRAY BUTTON: ABILITIES (v3)
// ======================================

import { defineTrayButton } from "../../defineTrayButton.js";

const ICON_PATH = "./assets/tray/iconAbility.png";

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
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "40vh",
      textAlign: "center"
    });

    const title = document.createElement("div");
    title.textContent = "Способности";
    Object.assign(title.style, {
      fontSize: "22px",
      fontWeight: "700",
      opacity: "0.95"
    });

    const hint = document.createElement("div");
    hint.textContent = "Здесь будет дерево навыков и апгрейды.";
    Object.assign(hint.style, {
      fontSize: "14px",
      opacity: "0.75",
      lineHeight: "1.35",
      maxWidth: "320px"
    });

    wrap.append(title, hint);
    container.appendChild(wrap);
    return () => wrap.remove();
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