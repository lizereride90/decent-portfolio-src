const auth = require("../lib/auth");
const { toEvent, send } = require("../lib/vercel");
const { savePortfolio } = require("../lib/store-vercel");
const { sanitizePortfolio } = require("../lib/validate");

// POST /api/portfolio-save — admin only.
module.exports = async (req, res) => {
  const event = toEvent(req);
  if (event.httpMethod !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }
  if (!auth.getSecret() || !process.env.ADMIN_PASSWORD) {
    return send(res, 500, { error: "Server not configured." });
  }
  if (!auth.isAuthenticated(event)) {
    return send(res, 401, { error: "Not authenticated" });
  }
  if (!auth.csrfCheck(event)) {
    return send(res, 403, { error: "Forbidden (CSRF check failed)" });
  }
  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return send(res, 400, { error: "Invalid JSON" });
  }
  let clean;
  try {
    clean = sanitizePortfolio(input && input.data ? input.data : input);
  } catch (err) {
    return send(res, 400, { error: err.message || "Invalid portfolio data" });
  }
  try {
    const result = await savePortfolio(clean);
    return send(res, 200, {
      ok: true,
      updatedAt: clean.updatedAt,
      storage: result.backend,
      persisted: result.persisted !== false,
      storageError: result.persisted === false ? String(result.error || "unknown storage error").slice(0, 400) : undefined,
    });
  } catch (err) {
    console.error("save failed", err);
    return send(res, 500, { error: "Could not save portfolio" });
  }
};
