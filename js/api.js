/* API layer — all server communication lives here. No secrets in this file. */
window.PortfolioAPI = (() => {
  const FN = (name) => `/.netlify/functions/${name}`;

  async function request(path, options = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        ...(options.headers || {}),
      },
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    async getPortfolio() {
      try {
        return await request(FN("portfolio-get"), { headers: {} });
      } catch {
        return null; // offline / local file:// — caller falls back to defaults
      }
    },
    async checkSession() {
      try {
        const r = await request(FN("auth-session"), { headers: {} });
        return { authenticated: !!r.authenticated, configured: r.configured !== false };
      } catch {
        return { authenticated: false, configured: true };
      }
    },
    async login(password) {
      return request(FN("auth-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    },
    async logout() {
      return request(FN("auth-logout"), { method: "POST" });
    },
    async savePortfolio(data) {
      return request(FN("portfolio-save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
    },
  };
})();
