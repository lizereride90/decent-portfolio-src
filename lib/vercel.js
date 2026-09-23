// Adapter: present a Vercel req/res in the same shape Netlify functions use,
// so endpoint logic stays identical across platforms.
function toEvent(req) {
  const headers = {};
  for (const k of Object.keys(req.headers || {})) {
    headers[String(k).toLowerCase()] = req.headers[k];
  }
  let body = req.body;
  if (typeof body !== "string") {
    try {
      body = JSON.stringify(body ?? {});
    } catch {
      body = "{}";
    }
  }
  return { httpMethod: req.method || "GET", headers, body };
}

function send(res, statusCode, obj, cookie) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (cookie) res.setHeader("Set-Cookie", cookie);
  res.status(statusCode).send(JSON.stringify(obj));
}

module.exports = { toEvent, send };
