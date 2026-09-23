const { loadPortfolio } = require("../lib/store-vercel");

// GET /api/portfolio-get — public read of portfolio content.
module.exports = async (req, res) => {
  if ((req.method || "GET") !== "GET") {
    res.setHeader("Content-Type", "application/json");
    return res.status(405).send(JSON.stringify({ error: "Method not allowed" }));
  }
  const fallback = require("../lib/default-data");
  const data = await loadPortfolio(fallback);
  res.setHeader("Content-Type", "application/json");
  // Never cache: the owner must see published changes on the next refresh.
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(JSON.stringify(data));
};
