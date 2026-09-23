// Storage layer for Vercel: Vercel Blob (public, fixed pathname).
// Needs BLOB_READ_WRITE_TOKEN (auto-injected when a Blob store is connected
// to the project, otherwise set it manually in project env vars).

const KEY = "portfolio.json";

let memoryCache = null;

function token() {
  return process.env.BLOB_READ_WRITE_TOKEN || "";
}

async function blobLib() {
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    return require("@vercel/blob");
  } catch (err) {
    return import("@vercel/blob");
  }
}

async function findUrl(tok) {
  const { list } = await blobLib();
  const { blobs } = await list({ prefix: KEY, token: tok });
  const hit = (blobs || []).find((b) => b.pathname === KEY) || (blobs || [])[0];
  return hit ? hit.downloadUrl : null;
}

async function loadPortfolio(fallbackData) {
  const tok = token();
  if (tok) {
    try {
      const url = await findUrl(tok);
      if (url) {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const parsed = await res.json();
          if (parsed && typeof parsed === "object") return parsed;
        }
      }
    } catch (err) {
      console.warn("Blob read failed, using fallback:", err && err.message ? err.message : err);
    }
  }
  if (memoryCache) return memoryCache;
  return fallbackData;
}

async function savePortfolio(data) {
  const tok = token();
  if (!tok) {
    memoryCache = data;
    return { persisted: false, backend: "memory-fallback", error: "BLOB_READ_WRITE_TOKEN not set" };
  }
  try {
    const { put } = await blobLib();
    await put(KEY, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      token: tok,
    });
    return { persisted: true, backend: "vercel-blob" };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.warn("Blob write failed, using memory fallback:", msg);
    memoryCache = data;
    return { persisted: false, backend: "memory-fallback", error: msg };
  }
}

module.exports = { loadPortfolio, savePortfolio };
