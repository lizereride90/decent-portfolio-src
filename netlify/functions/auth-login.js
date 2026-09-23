const auth = require("../../lib/auth");

// POST /.netlify/functions/auth-login  { password: "..." }
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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(event), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return auth.json(405, { error: "Method not allowed" });
  }

  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const secret = auth.getSecret();
  if (!adminPassword || !secret) {
    return auth.json(500, {
      error: "Server not configured. Set ADMIN_PASSWORD and SESSION_SECRET in Netlify environment variables.",
    });
  }

  const ip = auth.getClientIp(event);
  if (rateLimited(ip)) {
    return auth.json(429, { error: "Too many attempts. Try again in a few minutes." });
  }

  let password = "";
  try {
    const body = JSON.parse(event.body || "{}");
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return auth.json(400, { error: "Invalid request body" });
  }

  if (!password || !auth.safeEqual(password, adminPassword)) {
    // Generic message — do not reveal whether the server is misconfigured.
    await new Promise((r) => setTimeout(r, 350));
    return auth.json(401, { error: "Incorrect password" });
  }

  const token = auth.createSessionToken(secret);
  return auth.json(
    200,
    { ok: true },
    { "Set-Cookie": auth.sessionCookie(token, event, { maxAge: auth.SESSION_TTL_SECONDS }) }
  );
};

function corsHeaders() {
  return {};
}
