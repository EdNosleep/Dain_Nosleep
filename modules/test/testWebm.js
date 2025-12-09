// ======================================================
// TEST WEBM MODULE (v1)
// Показывает персонажа по центру и проигрывает webm-анимацию
// ======================================================

import { defineModule } from "../../moduleFactory.js";
export const registerTestWebmModule = defineModule({
  key: "__testWebmModule",
  name: "Test Character WebM",

  inspector: {
    "Размер персонажа (px)": {
      type: "slider",
      min: 50,
      max: 600,
      step: 1,
      value: 300,
      param: "charSize"
    },

    "Скорость анимации": {
      type: "slider",
      min: 0.1,
      max: 3.0,
      step: 0.1,
      value: 1.0,
      param: "playbackRate"
    }
  },

  dependencies: [],

  createState() {
    return {
      params: {
        charSize: 250,
        playbackRate: 1.0
      },

      layer: null,
      img: null,
      video: null,
      playing: false
    };
  },

  onStart({ ctx, state }) {
    const p = state.params;

    // === слой по центру ===
    const layer = document.createElement("div");
    Object.assign(layer.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: p.charSize + "px",
      height: p.charSize + "px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "auto",
      zIndex: 50
    });
    ctx.container.appendChild(layer);
    state.layer = layer;

    // === PNG персонажа ===
    const img = document.createElement("img");
    img.src = "./assets/character/char1.png";
    Object.assign(img.style, {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      pointerEvents: "auto",
      cursor: "pointer"
    });
    layer.appendChild(img);
    state.img = img;

    // === WEBM-анимация (скрыта до клика) ===
    const video = document.createElement("video");
    video.src = "./assets/character/anim1.webm";
    video.loop = false;
    video.preload = "auto";
    video.style.position = "absolute";
    video.style.inset = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "contain";
    video.style.display = "none";
    layer.appendChild(video);
    state.video = video;

    video.playbackRate = p.playbackRate;

    // === Логика клика ===
    img.onclick = () => playAnimation(state);
    video.onclick = () => playAnimation(state);
  },

  onDisable({ state }) {
    if (state.layer?.parentNode) state.layer.remove();
    state.layer = null;
    state.img = null;
    state.video = null;
  },

  onParam({ param, value, state }) {
    const p = state.params;
    p[param] = value;

    switch (param) {
      case "charSize":
        if (state.layer) {
          state.layer.style.width = value + "px";
          state.layer.style.height = value + "px";
        }
        break;

      case "playbackRate":
        if (state.video) {
          state.video.playbackRate = value;
        }
        break;
    }
  }
});

// ======================================================
// ЛОГИКА ПРОИГРЫВАНИЯ
// ======================================================
function playAnimation(state) {
  const { img, video } = state;

  if (!video) return;

  // Переключаем видимость
  img.style.display = "none";
  video.style.display = "block";

  video.currentTime = 0;
  video.play();

  // После завершения возвращаем PNG
  video.onended = () => {
    video.style.display = "none";
    img.style.display = "block";
  };
}

