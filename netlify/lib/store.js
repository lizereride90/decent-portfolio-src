// Storage layer: Netlify Blobs in production, in-memory fallback otherwise.
// This keeps local dev working with zero setup while persisting on Netlify.

const KEY = "portfolio.json";
const STORE_NAME = "portfolio-data";

let memoryCache = null;
let blobsAvailable = null;
let lastError = "";

function getLastError() {
  return lastError;
}

function getStore() {
  if (blobsAvailable === false) return null;
  try {
    // Optional dependency — declared in package.json for Netlify builds.
    // eslint-disable-next-line global-require, import/no-unresolved
    const { getStore } = require("@netlify/blobs");
    blobsAvailable = true;
    return getStore(STORE_NAME);
  } catch (err) {
    blobsAvailable = false;
    return null;
  }
}

async function loadPortfolio(fallbackData) {
  const store = getStore();
  if (store) {
    try {
      const raw = await store.get(KEY, { type: "text" });
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (err) {
      // Fall through to fallback (e.g. brand-new site, nothing stored yet).
      lastError = `read: ${err && err.message ? err.message : err}`;
      console.warn("Blobs read failed, using fallback:", lastError);
    }
  }
  if (memoryCache) return memoryCache;
  return fallbackData;
}

async function savePortfolio(data) {
  const raw = JSON.stringify(data);
  const store = getStore();
  if (store) {
    try {
      await store.set(KEY, raw, { contentType: "application/json" });
      // Verify the write actually landed before claiming persistence.
      const check = await store.get(KEY, { type: "text" });
      if (!check) throw new Error("write verification failed (empty read-back)");
      return { persisted: true, backend: "netlify-blobs" };
    } catch (err) {
      lastError = `write: ${err && err.message ? err.message : err}`;
      console.warn("Blobs write failed, using memory fallback:", lastError);
    }
  }
  memoryCache = data;
  return { persisted: false, backend: "memory-fallback", error: lastError };
}

module.exports = { loadPortfolio, savePortfolio, getLastError, STORE_NAME, KEY };
