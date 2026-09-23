// Storage layer: Netlify Blobs in production, in-memory fallback otherwise.
// This keeps local dev working with zero setup while persisting on Netlify.

const KEY = "portfolio.json";
const STORE_NAME = "portfolio-data";

let memoryCache = null;
let cachedStore = null;
let lastError = "";

function getLastError() {
  return lastError;
}

function errMsg(err) {
  return err && err.message ? err.message : String(err);
}

// Resolve a Blobs store through a fallback chain:
// 1. automatic environment (works on most Netlify Functions runtimes)
// 2. Lambda-compatibility handshake (runtimes that need connectLambda)
// 3. explicit credentials from env (always works when set)
async function getStore(event) {
  if (cachedStore) return cachedStore;
  const errors = [];
  let lib = null;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    lib = require("@netlify/blobs");
  } catch (err) {
    errors.push(`require: ${errMsg(err)}`);
    try {
      lib = await import("@netlify/blobs");
    } catch (err2) {
      errors.push(`import: ${errMsg(err2)}`);
      lastError = errors.join(" | ");
      console.warn("Blobs unavailable:", lastError);
      return null;
    }
  }

  try {
    cachedStore = lib.getStore(STORE_NAME);
    return cachedStore;
  } catch (err) {
    errors.push(`auto: ${errMsg(err)}`);
  }

  if (event && typeof lib.connectLambda === "function") {
    try {
      lib.connectLambda(event);
      cachedStore = lib.getStore(STORE_NAME);
      return cachedStore;
    } catch (err) {
      errors.push(`lambda: ${errMsg(err)}`);
    }
  }

  const siteID = process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID || "";
  const token = process.env.BLOBS_TOKEN || process.env.NETLIFY_BLOBS_TOKEN || "";
  if (siteID && token) {
    try {
      cachedStore = lib.getStore({ name: STORE_NAME, siteID, token });
      return cachedStore;
    } catch (err) {
      errors.push(`explicit: ${errMsg(err)}`);
    }
  } else {
    errors.push("explicit: skipped (set BLOBS_SITE_ID + BLOBS_TOKEN env vars)");
  }

  lastError = errors.join(" | ");
  console.warn("Blobs unavailable:", lastError);
  return null;
}

async function loadPortfolio(fallbackData, event) {
  const store = await getStore(event);
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

async function savePortfolio(data, event) {
  const raw = JSON.stringify(data);
  const store = await getStore(event);
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
