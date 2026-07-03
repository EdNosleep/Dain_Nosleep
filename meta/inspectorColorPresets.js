// ============================================
// Dain_Coin — Inspector Color Presets (v2)
// ============================================
//
// CHANGELOG v2:
// • Удалён жёлтый цвет из пресетов
// • Добавлен persistent input[type=color]
//   — стабильно работает в iOS / Telegram WebView
// • Custom (🌈) всегда открывает системный color picker
// • Поведение Inspector и storage не ломается
//
// Пресеты (8):
// white, red, orange, green, cyan, purple, black, custom
//
// ============================================

import { defineModule } from "../engine/moduleFactory.js";

export const registerInspectorColorPresetsModule = defineModule({
  key: "__inspectorColorPresetsModule",
  name: "Inspector: Color Presets",
  inspector: {},
  dependencies: ["__inspectorModule"],

  createState() {
    return {
      presets: [
        { key: "white",  value: "#ffffff" },
        { key: "red",    value: "#ff3b30" },
        { key: "orange", value: "#ff9500" },
        { key: "green",  value: "#34c759" },
        { key: "cyan",   value: "#00cfff" },
        { key: "purple", value: "#af52de" },
        { key: "black",  value: "#000000" },
        { key: "custom", value: "custom" }
      ],

      // persistent native color input
      colorInput: null
    };
  },

  onStart({ bus, state }) {
    if (!bus) return;

    // === persistent color input (WebView-safe) ===
    const input = document.createElement("input");
    input.type = "color";
    Object.assign(input.style, {
      position: "fixed",
      left: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      opacity: "0.01",          // ❗ важно: не 0
      pointerEvents: "none",
      zIndex: "100000"
    });

    document.body.appendChild(input);
    state.colorInput = input;

    bus.on(
      "inspector:renderControl",
      (payload) => {
        try {
          if (!payload || payload.handled?.value) return;
          if (payload.type !== "color") return;

          const ui = renderColorPresetRow({
            presets: state.presets,
            value: payload.value,
            onChange: payload.onChange,
            colorInput: state.colorInput
          });

          payload.mount(ui);
          payload.handled.value = true;
        } catch (e) {
          console.warn("[InspectorColorPresets v2] error", e);
        }
      },
      { moduleKey: "__inspectorColorPresetsModule", priority: 100 }
    );
  },

  onDisable({ state }) {
    if (state.colorInput) {
      try { state.colorInput.remove(); } catch {}
      state.colorInput = null;
    }
  },

  onParam() {}
});

// =======================================================
// UI
// =======================================================

function renderColorPresetRow({ presets, value, onChange, colorInput }) {
  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%"
  });

  const norm = (v) => String(v || "").trim().toLowerCase();
  const current = norm(value);

  let activeKey = "custom";
  for (const p of presets) {
    if (p.value !== "custom" && norm(p.value) === current) {
      activeKey = p.key;
      break;
    }
  }

  presets.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.key = p.key;

    Object.assign(btn.style, {
      width: "28px",
      height: "28px",
      minWidth: "28px",
      minHeight: "28px",
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.25)",
      padding: "0",
      outline: "none",
      background:
        p.key === "custom"
          ? "linear-gradient(45deg, #ff3b30, #ff9500, #34c759, #00cfff, #0a84ff, #af52de)"
          : p.value,
      boxShadow: "none",
      cursor: "pointer",
      transition:
        "transform 0.12s ease, box-shadow 0.12s ease, border 0.12s ease"
    });

    // белый — внутренняя кайма
    if (p.key === "white") {
      btn.style.boxShadow = "inset 0 0 0 1px rgba(0,0,0,0.35)";
    }

    btn.onpointerdown = () => (btn.style.transform = "scale(0.92)");
    btn.onpointerup = () => (btn.style.transform = "scale(1)");
    btn.onpointercancel = () => (btn.style.transform = "scale(1)");
    btn.onmouseleave = () => (btn.style.transform = "scale(1)");

    btn.onclick = () => {
      if (p.key === "custom") {
        openPersistentColorPicker(colorInput, value, (picked) => {
          if (!picked) return;
          onChange(picked);
          setActive("custom");
        });
        return;
      }

      onChange(p.value);
      setActive(p.key);
    };

    row.appendChild(btn);
  });

  setActive(activeKey);

  function setActive(key) {
    [...row.querySelectorAll("button")].forEach((b) => {
      const active = b.dataset.key === key;
      b.style.border = active
        ? "2px solid rgba(255,255,255,0.95)"
        : "2px solid rgba(255,255,255,0.25)";
      b.style.boxShadow = active
        ? "0 0 10px rgba(255,255,255,0.35)"
        : (b.dataset.key === "white"
          ? "inset 0 0 0 1px rgba(0,0,0,0.35)"
          : "none");
    });
  }

  return row;
}

// =======================================================
// Native picker (persistent)
// =======================================================

function openPersistentColorPicker(input, current, onPick) {
  if (!input) return;

  let used = false;
  input.value = current || "#ffffff";

  const handler = () => {
    if (used) return;
    used = true;
    input.removeEventListener("input", handler);
    onPick(input.value);
  };

  input.addEventListener("input", handler, { once: true });

  // ❗ синхронно, внутри пользовательского клика
  input.click();
}