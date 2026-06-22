// ===============================
// Dain_Coin — COIN MODULE (v41)
// Полный ремастер монетки + Hook-Events
// ===============================
//
// CHANGELOG v41:
// • Всё поведение v40 сохранено 1:1.
// • Добавлены hook-события для расширения монетки через EventBus:
//   - "__coinModule:beforeSpin"     — перед стартом броска (можно cancel).
//   - "__coinModule:beforeDecision" — перед выбором стороны (можно менять chance).
//   - "__coinModule:afterDecision"  — после выбора результата.
//   - "__coinModule:beforeBoost"    — перед фазой буста.
//   - "__coinModule:beforeSlowdown" — перед замедлением.
//   - "__coinModule:beforeFinalize" — перед финальной фиксацией угла.
//   - "__coinModule:afterSpin"      — после полного завершения цикла.
// • Старые события coin:spinStart / coin:spinEnd сохранены.
// ===============================

import { defineModule } from "../../engine/moduleFactory.js";

// ====== INSPECTOR ПАРАМЕТРЫ ======

export const coinInspector = {
  "Размер монеты (px)": {
    min: 100,
    max: 250,
    step: 1,
    value: 170,
    param: "coinSize",
    type: "slider"
  },
  "Скорость вращения": {
    min: 40,
    max: 300,
    step: 1,
    value: 75,
    param: "baseSpeed",
    type: "slider"
  },
  "Высота прыжка (px)": {
    min: 30,
    max: 300,
    step: 1,
    value: 70,
    param: "jumpHeight",
    type: "slider"
  },
  "Длительность прыжка (сек)": {
    min: 0.05,
    max: 0.3,
    step: 0.01,
    value: 0.13,
    param: "jumpDuration",
    type: "slider"
  },
  "Длительность буста (сек)": {
    min: 0.1,
    max: 2.5,
    step: 0.05,
    value: 0.6,
    param: "spinDuration",
    type: "slider"
  },
  "Скорость буста": {
    min: 800,
    max: 2400,
    step: 50,
    value: 1600,
    param: "boostSpeed",
    type: "slider"
  },
  "Оборотов при замедлении": {
    min: 1,
    max: 10,
    step: 1,
    value: 3,
    param: "slowSpins",
    type: "slider"
  },
  "Пауза перед восстановлением": {
    min: 0.2,
    max: 1.0,
    step: 0.05,
    value: 0.5,
    param: "pauseDuration",
    type: "slider"
  },
  "Шанс аверса (%)": {
    min: 0,
    max: 100,
    step: 1,
    value: 50,
    param: "headsChance",
    type: "slider"
  },
  "Масштаб при нажатии (%)": {
    // на сколько % уменьшается монета при тапе
    min: 0,
    max: 40,
    step: 1,
    value: 18,
    param: "pressScale",
    type: "slider"
  },
  "Глубина проваливания (px)": {
    min: 0,
    max: 120,
    step: 1,
    value: 45,
    param: "sinkDepth",
    type: "slider"
  }
};

// ====== РЕГИСТРАЦИЯ МОДУЛЯ ======

export const registerCoinModule = defineModule({
  key: "__coinModule",
  name: "Монетка",
  inspector: coinInspector,
  dependencies: [],

  createState() {
    return {
      // Параметры монетки (инициализация по инспектору)
      params: {
        coinSize: coinInspector["Размер монеты (px)"].value,
        baseSpeed: coinInspector["Скорость вращения"].value,
        jumpHeight: coinInspector["Высота прыжка (px)"].value,
        jumpDuration: coinInspector["Длительность прыжка (сек)"].value,
        spinDuration: coinInspector["Длительность буста (сек)"].value,
        boostSpeed: coinInspector["Скорость буста"].value,
        slowSpins: coinInspector["Оборотов при замедлении"].value,
        pauseDuration:
          coinInspector["Пауза перед восстановлением"].value,
        headsChance:
          coinInspector["Шанс аверса (%)"].value / 100,
        pressScale:
          coinInspector["Масштаб при нажатии (%)"].value,
        sinkDepth:
          coinInspector["Глубина проваливания (px)"].value,

        edgeWidth: 0.1 // толщина ребра в долях косинуса
      },

      // DOM
      layer: null,   // фулл-слой в сцене
      wrap: null,    // контейнер для scale (нажатие)
      motion: null,  // контейнер для translateY (прыжок/отскок)
      obv: null,
      rev: null,
      edge: null,

      // Состояние анимаций
      angle: 0,
      spinSpeed: 0,
      rafId: null,
      running: false,
      lastTime: 0,

      // Управление фазами
      activeAnim: null, // токен текущей последовательности
      animationId: 0,
      phase: "idle",    // idle | boost | slowdown | pause | return
      lastResult: null  // "avers" | "revers"
    };
  },

  onStart({ ctx, state, bus }) {
    const p = state.params;

    state.angle = 0;
    state.spinSpeed = p.baseSpeed;

    // === LAYER — общий центрированный слой ===
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
    (ctx.container || document.body).appendChild(layer);
    state.layer = layer;

    // === WRAP — отвечает за SCALE (эффект нажатия) ===
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position: "relative",
      width: p.coinSize + "px",
      height: p.coinSize + "px",
      cursor: "pointer",
      pointerEvents: "auto",
      transition: "transform 0.12s ease-out",
      transformOrigin: "center center"
    });
    layer.appendChild(wrap);
    state.wrap = wrap;

    // === MOTION — отвечает за вертикальное движение ===
    const motion = document.createElement("div");
    Object.assign(motion.style, {
      position: "relative",
      width: "100%",
      height: "100%",
      transform: "translateY(0px)",
      transformOrigin: "center center"
    });
    wrap.appendChild(motion);
    state.motion = motion;

    // === СЛОИ МОНЕТЫ ===
    state.obv = createSide("./assets/coin/coin8/coin_avers.png");
    state.rev = createSide("./assets/coin/coin8/coin_revers.png");
    state.edge = createSide("./assets/coin/coin8/coin_edge.png");
    motion.append(state.obv, state.rev, state.edge);

    // === ЭФФЕКТ НАЖАТИЯ (SCALE) ===
    const pressDown = () => {
      const s = 1 - state.params.pressScale / 100;
      state.wrap.style.transform = `scale(${s})`;
    };
    const pressUp = () => {
      state.wrap.style.transform = "scale(1)";
    };

    wrap.addEventListener("mousedown", pressDown);
    wrap.addEventListener("touchstart", pressDown);
    wrap.addEventListener("mouseup", pressUp);
    wrap.addEventListener("mouseleave", pressUp);
    wrap.addEventListener("touchend", pressUp);
    wrap.addEventListener("touchcancel", pressUp);

    // === КЛИК — ЗАПУСК БРОСКА ===
    wrap.addEventListener("click", () => {
      // отменяем старую анимацию, если шла
      if (state.activeAnim) {
        state.activeAnim.cancelled = true;
        state.activeAnim = null;
      }
      state.animationId++;

      // 🔥 HOOK: перед стартом броска
      const hookPayload = { state, cancel: false };
      bus.emit("__coinModule:beforeSpin", hookPayload);
      if (hookPayload.cancel) {
        return;
      }

      // моментальный переход в режим буста (стадия 4)
      state.phase = "boost";
      state.spinSpeed = p.boostSpeed;
      updateVisuals(state);

      // запускаем новую последовательность
      spinSequence(state, bus);
    });

    // === ОСНОВНОЕ ПОСТОЯННОЕ ВРАЩЕНИЕ ===
    state.running = true;
    state.rafId = requestAnimationFrame((t) => loop(t, state));
  },

  onDisable({ state }) {
    // остановка rAF
    state.running = false;
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    // отмена активной анимации
    if (state.activeAnim) {
      state.activeAnim.cancelled = true;
      state.activeAnim = null;
    }

    // удаление DOM
    if (state.layer?.parentNode) state.layer.remove();

    state.layer = null;
    state.wrap = null;
    state.motion = null;
    state.obv = null;
    state.rev = null;
    state.edge = null;
  },

  onParam({ param, value, state }) {
    const p = state.params;

    switch (param) {
      case "coinSize":
        p.coinSize = value;
        if (state.wrap) {
          state.wrap.style.width = value + "px";
          state.wrap.style.height = value + "px";
        }
        break;

      case "baseSpeed":
        p.baseSpeed = value;
        if (!state.activeAnim) state.spinSpeed = value;
        break;

      case "headsChance":
        p.headsChance = value / 100;
        break;

      case "pressScale":
        p.pressScale = value;
        break;

      case "sinkDepth":
        p.sinkDepth = value;
        break;

      default:
        p[param] = value;
        break;
    }
  }
});

// =========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================

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

// ====== ГЛАВНЫЙ LOOP — СТАДИЯ 1 + вращение во всех фазах ======

function loop(now, state) {
  if (!state.running) return;

  if (!state.lastTime) state.lastTime = now;
  const dt = (now - state.lastTime) / 1000;
  state.lastTime = now;

  state.angle =
    (state.angle +
      state.spinSpeed * (Math.PI / 180) * dt) %
    (Math.PI * 2);
  updateVisuals(state);

  state.rafId = requestAnimationFrame((t) => loop(t, state));
}

// ====== РЕНДЕР 3D-ИЛЛЮЗИИ ======

function updateVisuals(state) {
  if (!state.obv || !state.rev || !state.edge) return;

  const p = state.params;
  const c = Math.cos(state.angle);
  const absC = Math.abs(c);

  // показываем ребро, когда монета "узкая"
  if (absC < p.edgeWidth) {
    state.edge.style.opacity = 1 - absC / p.edgeWidth;
    state.obv.style.opacity = 0;
    state.rev.style.opacity = 0;
  } else {
    state.edge.style.opacity = 0;
    state.obv.style.opacity = c >= 0 ? 1 : 0;
    state.rev.style.opacity = c < 0 ? 1 : 0;
  }

  // "сплющивание" по X для иллюзии толщины
  const scaleX = Math.max(absC, 0.04);
  state.obv.style.transform = `scaleX(${scaleX})`;
  state.rev.style.transform = `scaleX(${scaleX})`;
}

// =========================
// ОСНОВНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ БРОСКА
// =========================

async function spinSequence(state, bus) {
  const p = state.params;
  const token = { cancelled: false };
  state.activeAnim = token;

  const id = ++state.animationId;

  // 🔥 HOOK: перед выбором стороны
  let chance = p.headsChance;
  const beforeDecisionPayload = { chance, state };
  bus.emit("__coinModule:beforeDecision", beforeDecisionPayload);
  if (typeof beforeDecisionPayload.chance === "number") {
    chance = beforeDecisionPayload.chance;
  }

  // 1) Выбираем сторону СРАЗУ при клике
  const heads = Math.random() < chance;
  const target = heads ? 0 : Math.PI;
  state.lastResult = heads ? "avers" : "revers";

  // 🔥 HOOK: после выбора стороны
  bus.emit("__coinModule:afterDecision", {
    side: state.lastResult,
    state
  });

  // даём знать другим модулям (эффекты, экономика и т.п.)
  bus.emit("coin:spinStart", {
    side: state.lastResult
  });

  // 2–3) Прыжок вверх → вниз + лёгкий "bounce"
  state.phase = "boost";
  await jumpUp(state, token, id);
  await jumpDown(state, token, id);
  await bounce(state, token, id);
  if (token.cancelled) return;

  // 🔥 HOOK: перед фазой буста
  bus.emit("__coinModule:beforeBoost", { state });

  // 4) Буст — просто держим высокую скорость
  await animate(
    p.spinDuration,
    () => {
      state.spinSpeed = p.boostSpeed;
    },
    token,
    id
  );
  if (token.cancelled) return;

  // 🔥 HOOK: перед замедлением
  bus.emit("__coinModule:beforeSlowdown", { state });

  // 5) Замедление до целевой стороны с учётом slowSpins
  state.phase = "slowdown";
  await slowDown(state, target, token, id);
  if (token.cancelled) return;

  // Финальное положение
  state.spinSpeed = 0;
  state.angle = target;
  updateVisuals(state);

  // 🔥 HOOK: перед финальной фиксацией и событием spinEnd
  bus.emit("__coinModule:beforeFinalize", {
    side: state.lastResult,
    state
  });

  // Событие завершения броска
  bus.emit("coin:spinEnd", {
    side: state.lastResult
  });

  // 6) Пауза
  state.phase = "pause";
  await wait(p.pauseDuration, token);
  if (token.cancelled) return;

  // 7) Возвращение к плавному вращению (разгон до baseSpeed)
  state.phase = "return";
  await animate(
    0.6,
    (t) => {
      state.spinSpeed = lerp(
        0,
        p.baseSpeed,
        easeOutCubic(t)
      );
    },
    token,
    id
  );

  if (!token.cancelled) {
    state.phase = "idle";
    state.activeAnim = null;

    // 🔥 HOOK: полный конец цикла
    bus.emit("__coinModule:afterSpin", {
      side: state.lastResult,
      state
    });
  }
}

// =========================
// АНИМАЦИИ ПРЫЖКА / ОТСКОКА
// =========================

function jumpUp(state, token, id) {
  const p = state.params;
  return animate(
    p.jumpDuration,
    (t) => {
      if (!state.motion) return;
      const y =
        -p.jumpHeight *
        Math.sin((t * Math.PI) / 2); // мягкий выход вверх
      state.motion.style.transform = `translateY(${y}px)`;
    },
    token,
    id
  );
}

function jumpDown(state, token, id) {
  const p = state.params;
  return animate(
    p.jumpDuration,
    (t) => {
      if (!state.motion) return;
      const y =
        -p.jumpHeight *
        Math.cos((t * Math.PI) / 2); // возвращение к 0
      state.motion.style.transform = `translateY(${y}px)`;
    },
    token,
    id
  );
}

function bounce(state, token, id) {
  const p = state.params;
  const d = p.sinkDepth;
  return animate(
    0.18,
    (t) => {
      if (!state.motion) return;
      // лёгкий провал вниз и возврат
      const phase = Math.sin(t * Math.PI);
      const y = d * phase * 0.6; // мягкий bounce
      state.motion.style.transform = `translateY(${y}px)`;
    },
    token,
    id
  );
}

// =========================
// ЗАМЕДЛЕНИЕ С ФИКСИРОВАННЫМ КОЛИЧЕСТВОМ ОБОРОТОВ
// =========================

function slowDown(state, target, token, id) {
  const p = state.params;

  const startAngle = state.angle % (Math.PI * 2);
  const delta =
    (target - startAngle + Math.PI * 2) %
    (Math.PI * 2);
  const totalRot = delta + Math.PI * 2 * p.slowSpins;

  const omega0 = Math.max(
    state.spinSpeed * (Math.PI / 180),
    0.001
  );

  // подбираем реальную длительность замедления из физики:
  // чем больше оборотов и скорость — тем дольше.
  const slowDuration = Math.min(
    Math.max((totalRot * 3) / omega0, 0.25),
    6
  );

  const initial = state.spinSpeed;

  return animate(
    slowDuration,
    (t) => {
      // энергия "выдувается" по кривой
      const e = easeOutEnergy(t, 1);
      state.spinSpeed = lerp(initial, 0, e);
      state.angle = startAngle + totalRot * e;
    },
    token,
    id
  );
}

// =========================
// УТИЛИТЫ АНИМАЦИИ
// =========================

function animate(duration, cb, token, id) {
  return new Promise((resolve) => {
    const start = performance.now();

    const frame = (now) => {
      if (token.cancelled || token.id !== id) {
        return resolve();
      }

      let t =
        (now - start) / (duration * 1000);
      if (t > 1) t = 1;

      cb(t);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    };

    token.id = id;
    requestAnimationFrame(frame);
  });
}

function wait(sec, token) {
  return new Promise((resolve) => {
    const end =
      performance.now() + sec * 1000;
    const frame = (now) => {
      if (token.cancelled) return resolve();
      if (now < end) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

// =========================
// МАТЕМАТИКА КРИВЫХ
// =========================

const lerp = (a, b, t) => a + (b - a) * t;
const easeOutQuad = (x) =>
  1 - (1 - x) ** 2;
const easeOutCubic = (x) =>
  1 - (1 - x) ** 3;
const easeOutEnergy = (x, k = 1) =>
  1 - (1 - x) ** (2 + k);