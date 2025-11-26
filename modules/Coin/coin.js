// ===============================
// Dain_Coin — COIN MODULE (v44)
// Особенности:
// ✓ Буст начинается мгновенно (до прыжков)
// ✓ Угол смещается прямо при клике → нет freeze
// ✓ Повторный клик в slowDown мгновенно перезапускает спин
// ✓ Прыжки больше не тормозят обновление вращения
// ✓ coinEffects получает spinEnd только в конце настоящего slowDown
// ===============================

import { defineModule } from "../../moduleFactory.js";

export const coinInspector = {
  "Размер монеты (px)":         { min: 100, max: 250, step: 1,   value: 170,  param: "coinSize",      type: "slider" },
  "Скорость вращения":          { min: 40,  max: 300, step: 1,   value: 75,   param: "baseSpeed",     type: "slider" },
  "Высота прыжка (px)":         { min: 30,  max: 300, step: 1,   value: 70,   param: "jumpHeight",    type: "slider" },
  "Длительность прыжка (сек)":  { min: 0.05,max: 0.3, step: 0.01,value: 0.13, param: "jumpDuration",  type: "slider" },
  "Длительность буста (сек)":   { min: 0.1, max: 2.5, step: 0.05,value: 0.6,  param: "spinDuration",  type: "slider" },
  "Скорость буста":             { min: 800, max: 2400,step: 50,  value: 1600, param: "boostSpeed",    type: "slider" },
  "Оборотов при замедлении":    { min: 1,   max: 10,  step: 1,   value: 3,    param: "slowSpins",     type: "slider" },
  "Пауза перед восстановлением":{ min: 0.2, max: 1.0, step: 0.05,value: 0.5,  param: "pauseDuration", type: "slider" },
  "Шанс аверса (%)":            { min: 0,   max: 100, step: 1,   value: 50,   param: "headsChance",   type: "slider" }
};

export const registerCoinModule = defineModule({
  key: "__coinModule",
  name: "Монетка",
  inspector: coinInspector,
  dependencies: [],

  createState() {
    return {
      params: {
        coinSize:      coinInspector["Размер монеты (px)"].value,
        baseSpeed:     coinInspector["Скорость вращения"].value,
        jumpHeight:    coinInspector["Высота прыжка (px)"].value,
        jumpDuration:  coinInspector["Длительность прыжка (сек)"].value,
        spinDuration:  coinInspector["Длительность буста (сек)"].value,
        boostSpeed:    coinInspector["Скорость буста"].value,
        slowSpins:     coinInspector["Оборотов при замедлении"].value,
        pauseDuration: coinInspector["Пауза перед восстановлением"].value,
        headsChance:   coinInspector["Шанс аверса (%)"].value / 100,
        edgeWidth:     0.1,
        pressScale:    5
      },

      layer: null,
      wrapTranslate: null,
      wrapScale: null,
      wrapSpin: null,

      obv: null,
      rev: null,
      edge: null,

      angle: 0,
      spinSpeed: 0,
      rafId: null,
      running: false,
      activeAnim: null,
      animationId: 0
    };
  },

  onStart({ ctx, state, bus }) {
    const p = state.params;

    // === Общий слой ===
    const layer = document.createElement("div");
    Object.assign(layer.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none"
    });
    ctx.container.appendChild(layer);
    state.layer = layer;

    // === Трёхуровневый wrap ===
    const wrapTranslate = document.createElement("div");
    Object.assign(wrapTranslate.style, {
      position: "relative",
      width: p.coinSize + "px",
      height: p.coinSize + "px",
    });

    const wrapScale = document.createElement("div");
    Object.assign(wrapScale.style, {
      width: "100%",
      height: "100%",
      transition: "transform 0.15s ease-out",
      pointerEvents: "auto"
    });

    const wrapSpin = document.createElement("div");
    Object.assign(wrapSpin.style, {
      width: "100%",
      height: "100%",
      position: "relative",
      pointerEvents: "none"
    });

    layer.appendChild(wrapTranslate);
    wrapTranslate.appendChild(wrapScale);
    wrapScale.appendChild(wrapSpin);

    state.wrapTranslate = wrapTranslate;
    state.wrapScale = wrapScale;
    state.wrapSpin = wrapSpin;

    // === Стороны монеты ===
    state.obv = createSide("./assets/coin/coin_avers.png");
    state.rev = createSide("./assets/coin/coin_revers.png");
    state.edge = createSide("./assets/coin/coin_edge.png");

    wrapSpin.append(state.obv, state.rev, state.edge);


    // === Эффект нажатия ===
    const press = () => {
      const s = 1 - p.pressScale / 100;
      state.wrapScale.style.transform = `scale(${s})`;
      setTimeout(() => {
        if (state.wrapScale) state.wrapScale.style.transform = "scale(1)";
      }, 150);
    };

    state.wrapScale.addEventListener("mousedown", press);
    state.wrapScale.addEventListener("touchstart", press);

    // === Клик → мгновенный буст + смещение угла + старт спина ===
    state.wrapScale.addEventListener("click", () => {

      // отменяем текущую анимацию
      if (state.activeAnim) state.activeAnim.cancelled = true;
      state.animationId++;

      // ⭐ КРИТИЧЕСКОЕ: смещаем угол СРАЗУ, чтобы избежать freeze
      state.angle += Math.PI * 0.25; // 45°
      state.angle %= Math.PI * 2;

      // мгновенный буст (до прыжка!)
      state.spinSpeed = p.boostSpeed;

      // моментальный кадр
      updateVisuals(state);

      // запускаем новую последовательность
      spinSequence(state, bus);
    });

    // === Основной цикл ===
    state.running = true;
    state.rafId = requestAnimationFrame((t) => loop(t, state));
  },

  onDisable({ state }) {
    state.running = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.activeAnim) state.activeAnim.cancelled = true;

    if (state.layer?.parentNode) state.layer.remove();
    state.layer = state.wrapTranslate = state.wrapScale = state.wrapSpin = null;
    state.obv = state.rev = state.edge = null;
  },

  onParam({ param, value, state }) {
    const p = state.params;

    switch (param) {
      case "coinSize":
        p.coinSize = value;
        if (state.wrapTranslate) {
          state.wrapTranslate.style.width = value + "px";
          state.wrapTranslate.style.height = value + "px";
        }
        break;

      case "baseSpeed":
        p.baseSpeed = value;
        if (!state.activeAnim) state.spinSpeed = value;
        break;

      case "headsChance":
        p.headsChance = value / 100;
        break;

      default:
        p[param] = value;
    }
  }
});

// =======================================
// Вспомогательные функции
// =======================================

function createSide(src) {
  const img = document.createElement("img");
  img.src = src;
  Object.assign(img.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    objectFit: "contain",
    pointerEvents: "none",
    backfaceVisibility: "hidden",
    transformStyle: "preserve-3d"
  });
  return img;
}

function loop(now, state) {
  if (!state.running) return;

  if (!state.lastTime) state.lastTime = now;
  const dt = (now - state.lastTime) / 1000;
  state.lastTime = now;

  state.angle = (state.angle + state.spinSpeed * (Math.PI / 180) * dt) % (Math.PI * 2);

  updateVisuals(state);

  state.rafId = requestAnimationFrame((t) => loop(t, state));
}

function updateVisuals(state) {
  if (!state.obv || !state.rev) return;

  const p = state.params;
  const c = Math.cos(state.angle);
  const absC = Math.abs(c);

  if (absC < p.edgeWidth) {
    state.edge.style.opacity = 1 - absC / p.edgeWidth;
    state.obv.style.opacity = 0;
    state.rev.style.opacity = 0;
  } else {
    state.edge.style.opacity = 0;
    state.obv.style.opacity = c >= 0 ? 1 : 0;
    state.rev.style.opacity = c < 0 ? 1 : 0;
  }

  const scaleX = Math.max(absC, 0.04);
  state.obv.style.transform = `scaleX(${scaleX})`;
  state.rev.style.transform = `scaleX(${scaleX})`;
}

// =======================================
// Анимации
// =======================================

async function spinSequence(state, bus) {
  const p = state.params;
  const token = { cancelled: false };
  state.activeAnim = token;

  const id = ++state.animationId;
  const heads = Math.random() < p.headsChance;
  const target = heads ? 0 : Math.PI;

  // === Прыжки — параллельно вращению ===
  await jumpUp(state, token, id);
  await jumpDown(state, token, id);
  await bounce(state, token, id);

  if (token.cancelled) return;

  // === Период буста (скорость уже boostSpeed) ===
  await animate(p.spinDuration, () => {
    updateVisuals(state);
  }, token, id);

  if (token.cancelled) return;

  // === Замедление ===
  await slowDown(state, target, token, id);

  state.spinSpeed = 0;
  state.angle = target;
  updateVisuals(state);

  bus.emit("coin:spinEnd", { side: heads ? "avers" : "revers" });

  await wait(p.pauseDuration, token);

  // === Возвращаемся к базовой скорости ===
  await animate(0.6, (t) => {
    state.spinSpeed = lerp(0, p.baseSpeed, easeOutCubic(t));
    updateVisuals(state);
  }, token, id);

  if (!token.cancelled) state.activeAnim = null;
}

// == Прыжки (все обновляют визуал, чтобы не было freeze)

function jumpUp(state, token, id) {
  const p = state.params;
  return animate(p.jumpDuration, (t) => {
    state.wrapTranslate.style.transform =
      `translateY(${-p.jumpHeight * Math.sin(t * Math.PI / 2)}px)`;
    updateVisuals(state);
  }, token, id);
}

function jumpDown(state, token, id) {
  const p = state.params;
  return animate(p.jumpDuration, (t) => {
    state.wrapTranslate.style.transform =
      `translateY(${-p.jumpHeight * Math.cos(t * Math.PI / 2)}px)`;
    updateVisuals(state);
  }, token, id);
}

function bounce(state, token, id) {
  const p = state.params;
  return animate(p.jumpDuration * 0.4, (t) => {
    state.wrapTranslate.style.transform =
      `translateY(${45 * easeOutCubic(t)}px)`;
    updateVisuals(state);
  }, token, id).then(() =>
    animate(p.jumpDuration * 0.6, (t) => {
      state.wrapTranslate.style.transform =
        `translateY(${45 * (1 - easeOutQuad(t))}px)`;
      updateVisuals(state);
    }, token, id)
  );
}

// === Замедление ===

function slowDown(state, target, token, id) {
  const p = state.params;

  const startAngle = state.angle % (Math.PI * 2);
  const delta = (target - startAngle + Math.PI * 2) % (Math.PI * 2);
  const totalRot = delta + Math.PI * 2 * p.slowSpins;

  const omega0 = Math.max(state.spinSpeed * (Math.PI / 180), 0.001);
  const slowDuration = Math.min(Math.max((totalRot * 3) / omega0, 0.25), 6);

  const initial = state.spinSpeed;

  return animate(slowDuration, (t) => {
    const e = easeOutEnergy(t, 1);
    state.spinSpeed = lerp(initial, 0, e);
    state.angle = startAngle + totalRot * e;
    updateVisuals(state);
  }, token, id);
}

// === Helpers ===
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutQuad = (x) => 1 - (1 - x) ** 2;
const easeOutCubic = (x) => 1 - (1 - x) ** 3;
const easeOutEnergy = (x, k = 1) => 1 - (1 - x) ** (2 + k);

function animate(duration, cb, token, id) {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      if (token.cancelled || token.id !== id) return resolve();
      let t = (now - start) / (duration * 1000);
      if (t > 1) t = 1;
      cb(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    token.id = id;
    requestAnimationFrame(frame);
  });
}

function wait(sec, token) {
  return new Promise((resolve) => {
    const end = performance.now() + sec * 1000;
    const frame = (now) => {
      if (token.cancelled) return resolve();
      if (now < end) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}