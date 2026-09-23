const auth = require("../lib/auth");
const { savePortfolio } = require("../lib/store");
const { sanitizePortfolio } = require("../lib/validate");

// POST /.netlify/functions/portfolio-save — admin only.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return auth.json(405, { error: "Method not allowed" });
  }
  if (!auth.getSecret() || !process.env.ADMIN_PASSWORD) {
    return auth.json(500, { error: "Server not configured." });
  }
  if (!auth.isAuthenticated(event)) {
    return auth.json(401, { error: "Not authenticated" });
  }
  if (!auth.csrfCheck(event)) {
    return auth.json(403, { error: "Forbidden (CSRF check failed)" });
  }
  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return auth.json(400, { error: "Invalid JSON" });
  }
  let clean;
  try {
    clean = sanitizePortfolio(input && input.data ? input.data : input);
  } catch (err) {
    return auth.json(400, { error: err.message || "Invalid portfolio data" });
  }
  try {
    const result = await savePortfolio(clean);
    return auth.json(200, { ok: true, updatedAt: clean.updatedAt, storage: result.backend });
  } catch (err) {
    console.error("save failed", err);
    return auth.json(500, { error: "Could not save portfolio" });
  }
};
