const auth = require("../lib/auth");
const { toEvent, send } = require("../lib/vercel");

// GET /api/auth-session — returns { authenticated: true/false }.
module.exports = async (req, res) => {
  const event = toEvent(req);
  if (event.httpMethod !== "GET") {
    return send(res, 405, { error: "Method not allowed" });
  }
  return send(res, 200, {
    authenticated: auth.isAuthenticated(event),
    configured: Boolean(process.env.ADMIN_PASSWORD && auth.getSecret()),
  });
};
