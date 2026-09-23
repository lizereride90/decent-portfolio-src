/* Public boot: load data, render, handle discreet admin entry + login modal. */
(() => {
  const $ = (id) => document.getElementById(id);
  let portfolioData = null;
  let isAdmin = false;

  async function boot() {
    // 1. Data: server first, defaults as fallback (works on local file preview too).
    let data = null;
    try {
      data = await window.PortfolioAPI.getPortfolio();
    } catch { data = null; }
    if (!data || typeof data !== "object" || !data.site) {
      data = structuredClone(window.DEFAULT_PORTFOLIO);
    }
    portfolioData = data;
    window.__portfolioData = data;
    window.PortfolioRender.render(data);

    // Appearance toggle is visitor-local only (does not change saved theme).
    const saved = safeGet("portfolio-appearance");
    if (saved && data.theme) {
      window.PortfolioTheme.applyTheme({ ...data.theme, appearance: saved });
    }
    $("appearanceToggle").addEventListener("click", () => {
      const next = window.PortfolioTheme.currentAppearance() === "light" ? "dark" : "light";
      window.PortfolioTheme.applyTheme({ ...(window.__portfolioData?.theme || {}), appearance: next });
    });

    $("menuBtn").addEventListener("click", () => {
      const mm = $("mobileMenu");
      mm.hidden = !mm.hidden;
      $("menuBtn").setAttribute("aria-expanded", String(!mm.hidden));
    });

    setupAdminEntry();
    setupLogin();
    setupFab();

    // 2. Session check decides whether the editor entry exists at all.
    try {
      const s = await window.PortfolioAPI.checkSession();
      isAdmin = !!s.authenticated;
      if (!s.configured) {
        const note = $("serverConfigNote");
        if (note) note.textContent = "Server env vars are not set yet — see README.";
      }
    } catch { isAdmin = false; }
    window.__isAdmin = isAdmin;
    $("adminFab").hidden = !isAdmin;

    // Deep entry points (?edit / #admin) prompt login rather than exposing anything.
    const params = new URLSearchParams(location.search);
    if (params.get("edit") !== null || location.hash === "#admin") {
      if (isAdmin) window.PortfolioEditor?.open();
      else openLogin();
    }
  }

  function safeGet(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  }

  // Discreet entry: footer dot x5, Ctrl/Cmd+Shift+E, or triple-press "e".
  function setupAdminEntry() {
    let taps = 0, tapTimer = null;
    $("footerDot").addEventListener("click", () => {
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => (taps = 0), 1200);
      if (taps >= 5) { taps = 0; isAdmin ? window.PortfolioEditor?.open() : openLogin(); }
    });
    let eCount = 0, eTimer = null;
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        isAdmin ? window.PortfolioEditor?.open() : openLogin();
        return;
      }
      if (e.key.toLowerCase() === "e" && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        eCount++;
        clearTimeout(eTimer);
        eTimer = setTimeout(() => (eCount = 0), 900);
        if (eCount >= 3) { eCount = 0; isAdmin ? window.PortfolioEditor?.open() : openLogin(); }
      }
    });
  }

  function setupFab() {
    $("adminFab").addEventListener("click", () => window.PortfolioEditor?.open());
  }

  // ---- Login modal ----
  function setupLogin() {
    $("loginClose").addEventListener("click", closeLogin);
    $("loginBackdrop").addEventListener("click", (e) => { if (e.target === $("loginBackdrop")) closeLogin(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeLogin(); window.PortfolioEditor?.close(); } });
    $("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("loginError");
      const btn = $("loginSubmit");
      err.hidden = true;
      btn.disabled = true;
      try {
        await window.PortfolioAPI.login($("loginPassword").value);
        $("loginPassword").value = "";
        closeLogin();
        isAdmin = true;
        window.__isAdmin = true;
        $("adminFab").hidden = false;
        window.PortfolioEditor?.open();
      } catch (ex) {
        err.textContent = ex.message || "Sign in failed.";
        err.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  }

  function openLogin() { $("loginBackdrop").hidden = false; setTimeout(() => $("loginPassword").focus(), 50); }
  function closeLogin() { $("loginBackdrop").hidden = true; }

  window.__getPortfolio = () => portfolioData;
  window.__setAdmin = (v) => { isAdmin = !!v; window.__isAdmin = isAdmin; $("adminFab").hidden = !isAdmin; };
  window.__openLogin = openLogin;

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
