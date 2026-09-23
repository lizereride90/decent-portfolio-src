const auth = require("../lib/auth");
const { loadPortfolio } = require("../lib/store");

// GET /.netlify/functions/portfolio-get — public read of portfolio content.
exports.handler = async () => {
  const fallback = require("./default-data");
  const data = await loadPortfolio(fallback);
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
    body: JSON.stringify(data),
  };
};
