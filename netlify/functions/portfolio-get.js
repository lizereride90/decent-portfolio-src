const auth = require("../lib/auth");
const { loadPortfolio } = require("../lib/store");

// GET /.netlify/functions/portfolio-get — public read of portfolio content.
exports.handler = async (event) => {
  const fallback = require("./default-data");
  const data = await loadPortfolio(fallback, event);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      // Never cache: the owner must see published changes on the very next refresh.
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(data),
  };
};
