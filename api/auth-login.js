const auth = require("../lib/auth");
const { toEvent, send } = require("../lib/vercel");

// POST /api/auth-login  { password: "..." }
// Sets an HttpOnly session cookie on success. Never returns secrets.
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function rateLimited(ip) {
  const now = Date.now();
  const arr = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  attempts.set(ip, arr);
  return arr.length > MAX_ATTEMPTS;
}

module.exports = async (req, res) => {
  const event = toEvent(req);
  if (event.httpMethod !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const secret = auth.getSecret();
  if (!adminPassword || !secret) {
    return send(res, 500, {
      error: "Server not configured. Set ADMIN_PASSWORD and SESSION_SECRET in Vercel environment variables.",
    });
  }

  const ip = event.headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return send(res, 429, { error: "Too many attempts. Try again in a few minutes." });
  }

  let password = "";
  try {
    const body = JSON.parse(event.body || "{}");
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return send(res, 400, { error: "Invalid request body" });
  }

  if (!password || !auth.safeEqual(password, adminPassword)) {
    await new Promise((r) => setTimeout(r, 350));
    return send(res, 401, { error: "Incorrect password" });
  }

  const token = auth.createSessionToken(secret);
  return send(res, 200, { ok: true }, auth.sessionCookie(token, event, { maxAge: auth.SESSION_TTL_SECONDS }));
};
