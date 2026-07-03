// ======================================
// NOSLEEP_ENGINE — TRAY ICON 3 HELPER (v1)
// JS/SVG generated icon, no module registration
// ======================================

export function createTrayIcon3DataUrl({
  stroke = "#ffffff",
  strokeWidth = 4.8,
  glow = true
} = {}) {
  const filter = glow
    ? `
      <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.15" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `
    : "";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <defs>${filter}</defs>
  <g filter="${glow ? "url(#softGlow)" : ""}"
     stroke="${stroke}"
     stroke-width="${strokeWidth}"
     stroke-linecap="round"
     stroke-linejoin="round">

    <!-- left cube -->
    <path d="M10 54 L28 45 L46 54 L46 74 L28 84 L10 74 Z"/>
    <path d="M28 45 L28 65 L46 74"/>
    <path d="M28 65 L10 54"/>

    <!-- right cube -->
    <path d="M50 54 L68 45 L86 54 L86 74 L68 84 L50 74 Z"/>
    <path d="M68 45 L68 65 L86 74"/>
    <path d="M68 65 L50 54"/>

    <!-- center lower connector -->
    <path d="M34 58 L48 66 L62 58 L62 78 L48 86 L34 78 Z"/>
    <path d="M48 66 L48 86"/>

    <!-- top cube -->
    <path d="M26 25 L48 14 L70 25 L70 51 L48 63 L26 51 Z"/>
    <path d="M26 25 L48 37 L70 25"/>
    <path d="M48 37 L48 63"/>
    <path d="M26 51 L48 63 L70 51"/>
  </g>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// CHANGELOG v1:
// • Добавлен JS/SVG helper вместо PNG-иконки.
// • Нет defineModule, нет регистрации в main.js.
// • Возвращает data:image/svg+xml для defineTrayButton.
// • Поддерживает stroke, strokeWidth и glow.
// • Иконка остаётся прозрачной и лёгкой.