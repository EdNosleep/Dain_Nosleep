// ======================================
// Dain_Coin — CONSOLE VIP SKIN (v5)
// Inner Log Scroll Restore
// ======================================

export function createConsoleVipSkin(options = {}) {
  const accent = options.accent || "0,204,255";

  return {
    applyRoot(root) {
      Object.assign(root.style, {
        display: "flex",
        flexDirection: "column",
        padding: "8px",
        color: "#fff",
        height: "100%",
        maxHeight: "100%",
        minHeight: "0",
        boxSizing: "border-box",
        overflow: "hidden"
      });
    },

    applyShell(shell) {
      Object.assign(shell.style, {
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: "0",
        maxHeight: "100%",
        overflow: "hidden",
        gap: "9px",
        padding: "10px",
        borderRadius: "22px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.105), rgba(255,255,255,0.045))",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)"
      });
    },

    applyHeader(header) {
      Object.assign(header.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        flex: "0 0 auto"
      });
    },

    applyTitleWrap(titleWrap) {
      Object.assign(titleWrap.style, {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: "0"
      });
    },

    applyTitle(title) {
      Object.assign(title.style, {
        fontSize: "19px",
        fontWeight: "900",
        letterSpacing: "-0.03em",
        opacity: "0.98",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      });
    },

    applySubtitle(subtitle) {
      Object.assign(subtitle.style, {
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: `rgba(${accent},0.78)`
      });
    },

    applyActions(actions) {
      Object.assign(actions.style, {
        display: "flex",
        gap: "7px",
        flexShrink: "0"
      });
    },

    applyFilters(filters) {
      Object.assign(filters.style, {
        display: "flex",
        gap: "6px",
        flexWrap: "wrap",
        flex: "0 0 auto"
      });
    },

    applyStats(stats) {
      Object.assign(stats.style, {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "8px",
        flex: "0 0 auto",
        padding: "7px 9px",
        borderRadius: "14px",
        background: "rgba(0,0,0,0.18)",
        border: "1px solid rgba(255,255,255,0.075)",
        color: "rgba(255,255,255,0.68)",
        fontSize: "10px",
        fontWeight: "800"
      });
    },

    applyList(list, params = {}) {
      const minLogHeight = params.minLogHeight ?? 82;

      Object.assign(list.style, {
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: `${minLogHeight}px`,
        maxHeight: "100%",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehavior: "contain",
        gap: "7px",
        padding: "5px",
        marginBottom: "0",
        borderRadius: "18px",
        background: `radial-gradient(circle at 50% 0%, rgba(${accent},0.10), transparent 38%), rgba(0,0,0,0.24)`,
        border: "1px solid rgba(255,255,255,0.08)",
        WebkitOverflowScrolling: "touch"
      });
    },

    applyEmpty(empty) {
      Object.assign(empty.style, {
        padding: "16px 12px",
        textAlign: "center",
        borderRadius: "14px",
        color: "rgba(255,255,255,0.42)",
        fontSize: "12px",
        fontWeight: "800",
        background: "rgba(255,255,255,0.035)",
        border: "1px dashed rgba(255,255,255,0.10)"
      });
    },

    applyRow(row, { entry, tag, fontSize }) {
      Object.assign(row.style, {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: `${fontSize}px`,
        lineHeight: "1.34",
        padding: "7px 8px",
        borderRadius: "13px",
        background: getLevelBackground(entry.level),
        border: `1px solid ${getTagBorder(tag)}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.055)",
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        flex: "0 0 auto"
      });
    },

    applyButton(btn, variant = "ghost") {
      Object.assign(btn.style, {
        position: "relative",
        overflow: "hidden",
        transform: "translateY(0) scale(1)",
        transition: "transform 90ms ease, box-shadow 120ms ease, background 120ms ease, border-color 120ms ease, opacity 120ms ease",
        border: variant === "primary"
          ? `1px solid rgba(${accent},0.46)`
          : "1px solid rgba(255,255,255,0.13)",
        background: variant === "primary"
          ? `linear-gradient(180deg, rgba(${accent},0.22), rgba(${accent},0.075))`
          : "linear-gradient(180deg, rgba(255,255,255,0.095), rgba(255,255,255,0.045))",
        color: "#fff",
        borderRadius: "999px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: "900",
        letterSpacing: "-0.01em",
        cursor: "pointer",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent"
      });
    },

    applyFilterButton(btn, active) {
      btn.style.opacity = active ? "1" : "0.58";
      btn.style.borderColor = active ? `rgba(${accent},0.72)` : "rgba(255,255,255,0.13)";
      btn.style.background = active
        ? `linear-gradient(180deg, rgba(${accent},0.24), rgba(${accent},0.10))`
        : "linear-gradient(180deg, rgba(255,255,255,0.095), rgba(255,255,255,0.045))";
      btn.style.boxShadow = active
        ? `0 0 18px rgba(${accent},0.25), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -8px 14px rgba(0,0,0,0.10)`
        : "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -8px 14px rgba(0,0,0,0.12)";
    }
  };
}

function getLevelBackground(level) {
  if (level === "error") return "linear-gradient(180deg, rgba(255,60,80,0.18), rgba(255,60,80,0.09))";
  if (level === "warn") return "linear-gradient(180deg, rgba(255,190,70,0.16), rgba(255,190,70,0.08))";
  if (level === "event") return "linear-gradient(180deg, rgba(0,204,255,0.15), rgba(0,204,255,0.07))";
  if (level === "debug") return "linear-gradient(180deg, rgba(180,120,255,0.15), rgba(180,120,255,0.07))";
  return "rgba(255,255,255,0.055)";
}

function getTagBorder(tag) {
  if (tag === "ERROR") return "rgba(255,80,100,0.48)";
  if (tag === "ENGINE") return "rgba(0,204,255,0.38)";
  if (tag === "STORE") return "rgba(80,255,170,0.34)";
  if (tag === "EVENTBUS") return "rgba(255,210,80,0.36)";
  if (tag === "UI") return "rgba(170,140,255,0.36)";
  if (tag === "ENTITY") return "rgba(255,130,220,0.34)";
  if (tag === "COIN") return "rgba(255,255,120,0.36)";
  return "rgba(255,255,255,0.10)";
}

// CHANGELOG v5:
// • Восстановлен внутренний scroll списка логов.
// • applyList больше не растягивает консоль по длине лога.
// • shell/list получили maxHeight 100%.
// • Сохранён текущий VIP-визуал.