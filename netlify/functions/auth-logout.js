const auth = require("../../lib/auth");

// POST /.netlify/functions/auth-logout — clears the session cookie.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return auth.json(405, { error: "Method not allowed" });
  }
  if (!auth.csrfCheck(event)) {
    return auth.json(403, { error: "Forbidden" });
  }
  return auth.json(200, { ok: true }, { "Set-Cookie": auth.clearSessionCookie(event) });
};
