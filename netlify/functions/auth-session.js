const auth = require("../lib/auth");

// GET /.netlify/functions/auth-session — returns { authenticated: true/false }.
// Used by the frontend to decide whether to show the editor entry.
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return auth.json(405, { error: "Method not allowed" });
  }
  return auth.json(200, {
    authenticated: auth.isAuthenticated(event),
    configured: Boolean(process.env.ADMIN_PASSWORD && auth.getSecret()),
  });
};
