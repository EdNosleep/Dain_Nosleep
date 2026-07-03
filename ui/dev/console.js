// ======================================
// Dain_Coin — TRAY BUTTON: CONSOLE (v3)
// Project Map Module Import
// ======================================

import { defineTrayButton } from "../tray/defineTrayButton.js";
import { createConsoleVipSkin } from "./consoleVipSkin.js";
import PROJECT_TREE from "./projectTree.js";

const ICON_PATH = "./assets/tray/trayButtons1/trayIcon4.png";
const MODULE_KEY = "__consoleModule";
const BRIDGE_KEY = "__dainLogConsoleBridge";
const ORIGINAL_CONSOLE_KEY = "__dainOriginalConsole";
const EARLY_LOGS_KEY = "__dainEarlyLogs";

const FILTERS = ["all", "log", "warn", "error", "event", "debug"];

const vipSkin = createConsoleVipSkin();

export const registerConsoleModule = defineTrayButton({
  key: MODULE_KEY,
  name: "Кнопка: Console",

  id: "console",
  order: 6,
  icon: "⚡",
  iconSize: 28,
  preferImg: false,

  inspector: {
    "Перехват console": { param: "captureConsole", type: "toggle", value: true },
    "Макс. строк": { param: "maxEntries", type: "range", min: 50, max: 500, step: 10, value: 160 },
    "Размер шрифта": { param: "fontSize", type: "range", min: 10, max: 16, step: 1, value: 12 },
    "Мин. высота логов": { param: "minLogHeight", type: "range", min: 60, max: 220, step: 5, value: 82 },
    "Цвет карты": { param: "mapColor", type: "color", value: "#ff9500" },
    "Автоскролл": { param: "autoScroll", type: "toggle", value: true },
    "Показывать debug": { param: "showDebug", type: "toggle", value: true },
    "Фильтр при открытии": {
      param: "defaultFilter",
      type: "select",
      options: ["event", "all", "log", "warn", "error", "debug"],
      value: "all"
    }
  },

  async resolveIcon() {
    const ok = await checkImage(ICON_PATH);
    return {
      iconSrc: ok ? ICON_PATH : null,
      icon: ok ? null : "⚡"
    };
  },

  createState() {
    return {
      params: {},
      cleanup: null,
      bridge: null,
      unsubscribeBridge: null,
      unsubscribeBus: null,
      restoreConsole: null,
      activeFilter: "event",
      root: null,
      list: null,
      stats: null,
      filters: null,
      renderQueued: false
    };
  },

  onStart({ state, bus }) {
    state.bridge = ensureLogBridge();

    const addFromBus = payload => {
      state.bridge.add({
        level: normalizeLevel(payload?.level || "event"),
        source: payload?.source || "EventBus",
        tag: payload?.tag || detectTag(payload?.source || "EventBus", payload?.message),
        message: payload?.message ?? payload,
        time: Date.now()
      });
    };

    try {
      const off = bus.on("log:add", addFromBus, { moduleKey: MODULE_KEY });
      if (typeof off === "function") state.unsubscribeBus = off;
    } catch (_) {}

    syncConsoleCapture(state);

    state.bridge.add({
      level: "event",
      source: "Console",
      tag: "ENGINE",
      message: "Premium mobile console started",
      time: Date.now()
    });
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (param === "captureConsole") {
      state.bridge = state.bridge || ensureLogBridge();
      syncConsoleCapture(state);
    }

    if (param === "defaultFilter" && !FILTERS.includes(value)) {
      state.params.defaultFilter = "event";
    }

    if (param === "minLogHeight" && state.list) {
      vipSkin.applyList(state.list, getParams(state));
    }

    trimEntries(state);
    queueRender(state);
  },

  panel({ container, state }) {
    state.cleanup?.();

    state.bridge = state.bridge || ensureLogBridge();
    state.activeFilter = getDefaultFilter(state);

    const root = document.createElement("div");
    const shell = document.createElement("div");
    const header = document.createElement("div");
    const titleWrap = document.createElement("div");
    const title = document.createElement("div");
    const subtitle = document.createElement("div");
    const actions = document.createElement("div");
    const mapBtn = makeSmallButton("Map", "ghost");
    const clearBtn = makeSmallButton("Clear", "ghost");
    const copyBtn = makeSmallButton("Copy", "primary");
    const filters = document.createElement("div");
    const stats = document.createElement("div");
    const list = document.createElement("div");

    state.root = root;
    state.list = list;
    state.stats = stats;
    state.filters = filters;

    title.textContent = "Console";
    subtitle.textContent = "Event-first diagnostics";

    const p = getParams(state);

    vipSkin.applyRoot(root);
    vipSkin.applyShell(shell);
    vipSkin.applyHeader(header);
    vipSkin.applyTitleWrap(titleWrap);
    vipSkin.applyTitle(title);
    vipSkin.applySubtitle(subtitle);
    vipSkin.applyActions(actions);
    vipSkin.applyFilters(filters);
    vipSkin.applyStats(stats);
    vipSkin.applyList(list, p);

    FILTERS.forEach(filter => {
      const btn = makeSmallButton(filter, filter === "event" ? "primary" : "ghost");
      btn.onclick = () => {
        state.activeFilter = filter;
        renderFilters(state);
        renderList(state);
      };
      btn.dataset.filter = filter;
      filters.appendChild(btn);
    });

    mapBtn.onclick = () => {
      const text = String(PROJECT_TREE || "").trim()
        ? PROJECT_TREE
        : "Карта проекта не обнаружена.";

      state.bridge.add({
        level: String(PROJECT_TREE || "").trim() ? "event" : "warn",
        source: "Console",
        tag: "MAP",
        kind: "project-map",
        message: text,
        time: Date.now()
      });
    };

    clearBtn.onclick = () => {
      state.bridge.clear();
      renderList(state);
    };

    copyBtn.onclick = async () => {
      const text = state.bridge.entries
        .map(e => `[${formatTime(e.time)}] ${e.level.toUpperCase()} [${e.tag || detectTag(e.source, e.message)}] ${e.source}: ${formatMessage(e.message)}`)
        .join("\n");

      try {
        await navigator.clipboard?.writeText(text);
        state.bridge.add({
          level: "event",
          source: "Console",
          tag: "ENGINE",
          message: "Log copied to clipboard",
          time: Date.now()
        });
      } catch (_) {
        state.bridge.add({
          level: "warn",
          source: "Console",
          tag: "UI",
          message: "Clipboard is not available",
          time: Date.now()
        });
      }
    };

    actions.append(mapBtn, clearBtn, copyBtn);
    titleWrap.append(title, subtitle);
    header.append(titleWrap, actions);
    shell.append(header, filters, stats, list);
    root.appendChild(shell);
    container.appendChild(root);

    renderFilters(state);

    state.unsubscribeBridge = state.bridge.subscribe(() => {
      trimEntries(state);
      queueRender(state);
    });

    renderList(state);

    state.cleanup = () => {
      try { state.unsubscribeBridge?.(); } catch (_) {}
      state.unsubscribeBridge = null;
      state.renderQueued = false;
      root.remove();
      state.root = null;
      state.list = null;
      state.stats = null;
      state.filters = null;
    };

    return state.cleanup;
  },

  onDisable({ state }) {
    state.cleanup?.();
    state.cleanup = null;

    try { state.unsubscribeBus?.(); } catch (_) {}
    state.unsubscribeBus = null;

    try { state.restoreConsole?.(); } catch (_) {}
    state.restoreConsole = null;

    state.bridge?.add({
      level: "event",
      source: "Console",
      tag: "ENGINE",
      message: "Premium mobile console disabled",
      time: Date.now()
    });
  }
});

function ensureLogBridge() {
  if (window[BRIDGE_KEY]) return window[BRIDGE_KEY];

  const original =
    window[ORIGINAL_CONSOLE_KEY] || {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: (console.debug || console.log).bind(console)
    };

  window[ORIGINAL_CONSOLE_KEY] = original;

  const bridge = {
    entries: [],
    listeners: new Set(),
    captureOwners: new Set(),
    installed: false,
    original,

    add(entry) {
      const safe = {
        level: normalizeLevel(entry?.level || "log"),
        source: entry?.source || "console",
        tag: entry?.tag || detectTag(entry?.source, entry?.message),
        kind: entry?.kind || null,
        message: entry?.message,
        time: entry?.time || Date.now()
      };

      this.entries.push(safe);
      if (this.entries.length > 600) this.entries.splice(0, this.entries.length - 600);

      this.listeners.forEach(fn => {
        try { fn(safe); } catch (_) {}
      });
    },

    clear() {
      this.entries.length = 0;
      this.listeners.forEach(fn => {
        try { fn(null); } catch (_) {}
      });
    },

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    },

    installConsoleCapture(owner = MODULE_KEY) {
      this.captureOwners.add(owner);

      if (!this.installed) {
        this.installed = true;

        ["log", "warn", "error", "debug"].forEach(level => {
          console[level] = (...args) => {
            this.original[level](...args);
            this.add({
              level,
              source: "console",
              tag: detectTag("console", args),
              message: args,
              time: Date.now()
            });
          };
        });

        window.addEventListener("error", this.onWindowError);
        window.addEventListener("unhandledrejection", this.onUnhandledRejection);
      }

      return () => this.releaseConsoleCapture(owner);
    },

    releaseConsoleCapture(owner = MODULE_KEY) {
      this.captureOwners.delete(owner);
      if (this.captureOwners.size > 0) return;
      this.restoreConsole();
    },

    restoreConsole() {
      if (!this.installed) return;

      console.log = this.original.log;
      console.warn = this.original.warn;
      console.error = this.original.error;
      console.debug = this.original.debug;

      window.removeEventListener("error", this.onWindowError);
      window.removeEventListener("unhandledrejection", this.onUnhandledRejection);

      this.installed = false;
      this.captureOwners.clear();
    },

    onWindowError(event) {
      bridge.add({
        level: "error",
        source: "window",
        tag: "ERROR",
        message: event?.message || event?.error || "Unknown window error",
        time: Date.now()
      });
    },

    onUnhandledRejection(event) {
      bridge.add({
        level: "error",
        source: "promise",
        tag: "ERROR",
        message: event?.reason || "Unhandled promise rejection",
        time: Date.now()
      });
    }
  };

  if (Array.isArray(window[EARLY_LOGS_KEY])) {
    window[EARLY_LOGS_KEY].forEach(entry => bridge.add({
      ...entry,
      tag: entry?.tag || detectTag(entry?.source, entry?.message)
    }));
    window[EARLY_LOGS_KEY].length = 0;
  }

  window[BRIDGE_KEY] = bridge;
  return bridge;
}

function syncConsoleCapture(state) {
  const p = getParams(state);

  if (!state.bridge) state.bridge = ensureLogBridge();

  if (p.captureConsole) {
    if (!state.restoreConsole) {
      state.restoreConsole = state.bridge.installConsoleCapture(MODULE_KEY);
    }
  } else {
    try { state.restoreConsole?.(); } catch (_) {}
    state.restoreConsole = null;
  }
}

function queueRender(state) {
  if (!state.list || state.renderQueued) return;

  state.renderQueued = true;
  requestAnimationFrame(() => {
    state.renderQueued = false;
    renderList(state);
  });
}

function renderList(state) {
  if (!state.list || !state.bridge) return;

  const p = getParams(state);
  vipSkin.applyList(state.list, p);

  const visible = getVisibleEntries(state, p);

  state.list.innerHTML = "";

  if (visible.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = `No ${state.activeFilter} entries yet`;
    vipSkin.applyEmpty(empty);
    state.list.appendChild(empty);
  } else {
    visible.forEach(entry => {
      const row = document.createElement("div");
      const tag = entry.tag || detectTag(entry.source, entry.message);

      vipSkin.applyRow(row, {
        entry,
        tag,
        fontSize: p.fontSize
      });

      if (entry.kind === "project-map") {
        row.style.color = p.mapColor;
        row.style.textShadow = `0 0 14px ${hexToRgba(p.mapColor, 0.22)}`;
        row.style.borderColor = hexToRgba(p.mapColor, 0.42);
      }

      row.textContent = `[${formatTime(entry.time)}] ${entry.level.toUpperCase()} [${tag}] ${entry.source}: ${formatMessage(entry.message)}`;
      state.list.appendChild(row);
    });
  }

  renderStats(state, visible.length);
  renderFilters(state);

  if (p.autoScroll) state.list.scrollTop = state.list.scrollHeight;
}

function renderStats(state, visibleCount) {
  if (!state.stats || !state.bridge) return;

  const total = state.bridge.entries.length;
  const errors = state.bridge.entries.filter(e => e.level === "error").length;
  const warns = state.bridge.entries.filter(e => e.level === "warn").length;

  state.stats.textContent =
    `${visibleCount}/${total} visible  ·  ${errors} errors  ·  ${warns} warns`;
}

function renderFilters(state) {
  if (!state.filters) return;

  [...state.filters.children].forEach(btn => {
    const active = btn.dataset.filter === state.activeFilter;
    vipSkin.applyFilterButton(btn, active);
  });
}

function makeSmallButton(text, variant = "ghost") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = text;
  vipSkin.applyButton(btn, variant);
  return btn;
}

function getVisibleEntries(state, params) {
  return state.bridge.entries.filter(entry => {
    if (!params.showDebug && entry.level === "debug") return false;
    if (state.activeFilter === "all") return true;
    return entry.level === state.activeFilter;
  });
}

function trimEntries(state) {
  if (!state.bridge) return;
  const max = getParams(state).maxEntries;
  if (state.bridge.entries.length > max) {
    state.bridge.entries.splice(0, state.bridge.entries.length - max);
  }
}

function getParams(state) {
  return {
    captureConsole: state.params.captureConsole ?? true,
    maxEntries: state.params.maxEntries ?? 160,
    fontSize: state.params.fontSize ?? 12,
    minLogHeight: state.params.minLogHeight ?? 82,
    mapColor: state.params.mapColor ?? "#ff9500",
    autoScroll: state.params.autoScroll ?? true,
    showDebug: state.params.showDebug ?? true,
    defaultFilter: FILTERS.includes(state.params.defaultFilter)
      ? state.params.defaultFilter
      : "event"
  };
}

function getDefaultFilter(state) {
  return getParams(state).defaultFilter || "event";
}

function normalizeLevel(level) {
  const value = String(level || "log").toLowerCase();
  return FILTERS.includes(value) && value !== "all" ? value : "log";
}

function detectTag(source, message) {
  const text = `${source || ""} ${formatMessage(message || "")}`.toLowerCase();

  if (text.includes("error") || text.includes("exception") || text.includes("unhandled")) return "ERROR";
  if (text.includes("modulefactory") || text.includes("core") || text.includes("bootstrap")) return "ENGINE";
  if (text.includes("store")) return "STORE";
  if (text.includes("eventbus") || text.includes("event") || text.includes("bus.emit") || text.includes("bus.on")) return "EVENTBUS";
  if (text.includes("tray") || text.includes("panel") || text.includes("ui") || text.includes("button")) return "UI";
  if (text.includes("entity") || text.includes("gizmo") || text.includes("stage3d")) return "ENTITY";
  if (text.includes("coin")) return "COIN";

  return "GENERAL";
}

function formatTime(time) {
  const d = new Date(time || Date.now());
  return [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0")
  ].join(":");
}

function formatMessage(message) {
  if (Array.isArray(message)) return message.map(formatMessage).join(" ");

  if (isErrorLike(message)) {
    return `${message.name || "Error"}: ${message.message || String(message)}`;
  }

  if (typeof message === "string") return message;
  if (typeof message === "number" || typeof message === "boolean" || message == null) {
    return String(message);
  }

  try {
    return JSON.stringify(message, null, 2);
  } catch (_) {
    try { return String(message); } catch (_) { return "[Unformattable message]"; }
  }
}

function isErrorLike(value) {
  return !!value &&
    typeof value === "object" &&
    (value instanceof Error || typeof value.message === "string") &&
    (typeof value.name === "string" || typeof value.stack === "string");
}

function hexToRgba(hex, alpha = 1) {
  const safe = String(hex || "#ff9500").trim();
  const raw = safe.startsWith("#") ? safe.slice(1) : safe;
  const full = raw.length === 3
    ? raw.split("").map(ch => ch + ch).join("")
    : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return `rgba(255,149,0,${alpha})`;
  }

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

function checkImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// CHANGELOG console.js v3:
// • Убран fetch projectTree.txt, который не работает в file:// окружении Android/WebView.
// • Добавлен импорт PROJECT_TREE из "./projectTree.js".
// • Кнопка Map теперь выводит карту из отдельного JS-файла.
// • Если карта пустая, выводится "Карта проекта не обнаружена.".
// • Сохранён Inspector-параметр "Цвет карты".
// • Удалена диагностическая логика LOAD/STATUS.
// • consoleVipSkin.js не изменялся.