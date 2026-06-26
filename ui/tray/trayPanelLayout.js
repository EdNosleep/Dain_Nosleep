// ======================================
// Dain_Coin — trayPanelLayout.js (v2)
// Shared fixed-header + actions + masked-scroll layout helper
// ======================================

export function createTrayPanelLayout(options = {}) {
  const {
    title = "",
    headerPadding = "10px 12px 6px",
    bodyPadding = "6px",
    bodyGap = "14px",
    maskEnabled = true,
    maskTopPx = 28,
    maskBottomPx = 34
  } = options;

  const root = document.createElement("div");
  Object.assign(root.style, {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    maxHeight: "100%",
    minHeight: "0",
    overflow: "hidden",
    color: "#fff",
    boxSizing: "border-box"
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: headerPadding,
    boxSizing: "border-box"
  });

  const titleEl = document.createElement("div");
  titleEl.textContent = title;
  Object.assign(titleEl.style, {
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "20px",
    fontWeight: "800",
    opacity: "0.95"
  });

  const actions = document.createElement("div");
  Object.assign(actions.style, {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px"
  });

  const viewport = document.createElement("div");
  Object.assign(viewport.style, {
    flex: "1 1 auto",
    minHeight: "0",
    overflow: "hidden",
    boxSizing: "border-box"
  });

  const body = document.createElement("div");
  Object.assign(body.style, {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: "0",
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
    touchAction: "pan-y",
    gap: bodyGap,
    padding: bodyPadding,
    boxSizing: "border-box"
  });

  header.append(titleEl, actions);
  viewport.appendChild(body);
  root.append(header, viewport);

  applyMask(viewport, { maskEnabled, maskTopPx, maskBottomPx });

  return {
    root,
    header,
    title: titleEl,
    titleEl,
    actions,
    viewport,
    body,
    scroller: body,

    setTitle(nextTitle) {
      titleEl.textContent = String(nextTitle || "");
    },

    setMask(next = {}) {
      applyMask(viewport, {
        maskEnabled: next.maskEnabled ?? maskEnabled,
        maskTopPx: next.maskTopPx ?? maskTopPx,
        maskBottomPx: next.maskBottomPx ?? maskBottomPx
      });
    },

    destroy() {
      root.remove();
    }
  };
}

function applyMask(el, params) {
  if (!el) return;

  const enabled = !!params.maskEnabled;
  const top = clamp(params.maskTopPx, 0, 160);
  const bottom = clamp(params.maskBottomPx, 0, 180);

  if (!enabled || (top <= 0 && bottom <= 0)) {
    el.style.maskImage = "none";
    el.style.webkitMaskImage = "none";
    return;
  }

  const mask = `linear-gradient(
    to bottom,
    transparent 0px,
    #000 ${top}px,
    #000 calc(100% - ${bottom}px),
    transparent 100%
  )`;

  el.style.maskImage = mask;
  el.style.webkitMaskImage = mask;
  el.style.maskSize = "100% 100%";
  el.style.webkitMaskSize = "100% 100%";
  el.style.maskRepeat = "no-repeat";
  el.style.webkitMaskRepeat = "no-repeat";
}

function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// CHANGELOG v2:
// • Header стал полноценным контейнером: title + actions.
// • Добавлен layout.actions для кнопок Reset/Search/Filter.
// • Сохранена совместимость с Inventory v13.
// • Маска по-прежнему применяется только к scroll viewport.
// • Helper остаётся чистым UI-helper без Store/EventBus/core.