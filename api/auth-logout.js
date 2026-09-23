const auth = require("../lib/auth");
const { toEvent, send } = require("../lib/vercel");

// POST /api/auth-logout — clears the session cookie.
module.exports = async (req, res) => {
  const event = toEvent(req);
  if (event.httpMethod !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }
  if (!auth.csrfCheck(event)) {
    return send(res, 403, { error: "Forbidden" });
  }
  return send(res, 200, { ok: true }, auth.clearSessionCookie(event));
};
