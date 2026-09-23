/* Theme system — applies the theme object to CSS variables + document. */
window.PortfolioTheme = (() => {
  const FONTS = {
    Inter: "'Inter', system-ui, sans-serif",
    "Space Grotesk": "'Space Grotesk', 'Inter', sans-serif",
    "IBM Plex Sans": "'IBM Plex Sans', system-ui, sans-serif",
    Fraunces: "'Fraunces', Georgia, serif",
    Georgia: "Georgia, 'Times New Roman', serif",
    System: "system-ui, -apple-system, sans-serif",
  };

  function applyTheme(theme = {}) {
    const root = document.documentElement;
    const set = (k, v) => root.style.setProperty(k, v);
    if (theme.accent) set("--accent", theme.accent);
    if (theme.accent2) set("--accent-2", theme.accent2);
    if (theme.background) set("--bg", theme.background);
    if (theme.surface) set("--surface", theme.surface);
    if (theme.text) set("--text", theme.text);
    if (theme.muted) set("--muted", theme.muted);
    if (theme.radius != null) set("--radius", `${theme.radius}px`);
    if (theme.spacing != null) set("--pad-scale", `${theme.spacing}px`);
    if (theme.headingFont && FONTS[theme.headingFont]) set("--font-heading", FONTS[theme.headingFont]);
    if (theme.bodyFont && FONTS[theme.bodyFont]) set("--font-body", FONTS[theme.bodyFont]);

    const appearance = theme.appearance === "light" ? "light" : "dark";
    document.body.dataset.appearance = appearance;
    document.body.dataset.bgfx = theme.backgroundEffect || "orbs";

    // Light mode: derive readable surface tints so custom dark colors don't break it.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", appearance === "light" ? "#f7f5ef" : theme.background || "#0b0d12");
    try {
      localStorage.setItem("portfolio-appearance", appearance);
    } catch { /* private mode */ }
  }

  function currentAppearance() {
    return document.body.dataset.appearance || "dark";
  }

  return { applyTheme, currentAppearance, FONTS: Object.keys(FONTS) };
})();
