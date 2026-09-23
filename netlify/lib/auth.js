const crypto = require("crypto");

const COOKIE_NAME = "portfolio_admin";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function getSecret() {
  return process.env.SESSION_SECRET || "";
}

function isProd(event) {
  const proto = event.headers["x-forwarded-proto"] || event.headers["X-Forwarded-Proto"] || "";
  if (String(proto).split(",")[0].trim() === "https") return true;
  const host = event.headers.host || event.headers.Host || "";
  if (/\.netlify\.app$/.test(host) || !/localhost|127\.0\.0\.1/i.test(host)) {
    if (process.env.NETLIFY === "true") return true;
  }
  return process.env.NODE_ENV === "production";
}

function b64urlEncode(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str) {
  str = String(str).replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

function sign(payloadB64, secret) {
  return b64urlEncode(crypto.createHmac("sha256", secret).update(payloadB64).digest());
}

function createSessionToken(secret) {
  const payload = JSON.stringify({
    v: 1,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    rnd: crypto.randomBytes(16).toString("hex"),
  });
  const p = b64urlEncode(payload);
  return `${p}.${sign(p, secret)}`;
}

function verifySessionToken(token, secret) {
  if (!token || !secret) return false;
  const parts = String(token).split(".");
  if (parts.length !== 2) return false;
  const [p, sig] = parts;
  if (!p || !sig) return false;
  let expected;
  try {
    expected = sign(p, secret);
  } catch {
    return false;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(b64urlDecode(p).toString("utf8"));
    if (typeof payload.exp !== "number") return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

function parseCookies(event) {
  const out = {};
  const raw = event.headers.cookie || event.headers.Cookie || "";
  if (!raw) return out;
  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function isAuthenticated(event) {
  const secret = getSecret();
  if (!secret) return false;
  const cookies = parseCookies(event);
  return verifySessionToken(cookies[COOKIE_NAME], secret);
}

function sessionCookie(token, event, opts = {}) {
  const secure = isProd(event);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

function clearSessionCookie(event) {
  const secure = isProd(event);
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

// Basic CSRF / session-abuse guard for state-changing requests.
// Requires either a same-origin Origin/Referer OR a custom header
// (browsers won't send custom headers cross-origin without preflight).
function csrfCheck(event) {
  const headers = {};
  for (const k of Object.keys(event.headers || {})) headers[k.toLowerCase()] = event.headers[k];

  const origin = headers["origin"] || "";
  const referer = headers["referer"] || "";
  const host = headers["host"] || headers["x-forwarded-host"] || "";
  const custom = headers["x-requested-with"] || headers["x-csrf-protect"];

  const sameOriginUrl = (url) => {
    try {
      const u = new URL(url, `https://${host || "localhost"}`);
      return host ? u.host === String(host).split(",")[0].trim() : true;
    } catch {
      return false;
    }
  };

  if (origin) {
    if (host && !sameOriginUrl(origin)) return false;
    return true;
  }
  if (referer) {
    if (host && !sameOriginUrl(referer)) return false;
    return true;
  }
  // No origin info (e.g. curl): require the custom header.
  return Boolean(custom);
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // Still do a timing-safe compare over same length to avoid early exit oracle.
    const len = Math.max(ab.length, bb.length);
    const pa = Buffer.alloc(len);
    const pb = Buffer.alloc(len);
    ab.copy(pa);
    bb.copy(pb);
    crypto.timingSafeEqual(pa, pb);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

function getClientIp(event) {
  return (
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    event.headers["client-ip"] ||
    "unknown"
  );
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
  getSecret,
  isProd,
  createSessionToken,
  verifySessionToken,
  parseCookies,
  isAuthenticated,
  sessionCookie,
  clearSessionCookie,
  csrfCheck,
  json,
  safeEqual,
  getClientIp,
};
