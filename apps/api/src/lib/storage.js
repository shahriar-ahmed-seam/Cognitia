// File storage for community media: files on local disk (UPLOAD_DIR), streamed with Range
// support so videos seek, and signed URLs so <img>/<video> tags work without an auth header
// while private files can't be opened by guessing an id.
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR || path.join(API_ROOT, "storage/uploads"));
}

/** Where multer writes uploads before they're checked and moved into place. */
export function tempDir() {
  return path.join(uploadDir(), ".tmp");
}

export async function ensureDirs() {
  await fsp.mkdir(tempDir(), { recursive: true });
}

/** A random, unguessable id (22 URL-safe characters). */
export function newMediaId() {
  return crypto.randomBytes(16).toString("base64url");
}

// Keys look like "ab/abXYZ...": two-letter folders keep directories small
function keyPath(key) {
  if (!/^[A-Za-z0-9_-]{2}\/[A-Za-z0-9_-]{8,64}(\.[a-z0-9]{1,5})?$/.test(key)) throw new Error("Invalid storage key");
  return path.join(uploadDir(), key);
}

export function storageKeyFor(id, ext = "") {
  return `${id.slice(0, 2)}/${id}${ext ? `.${ext}` : ""}`;
}

/** Move a checked temp upload into storage. */
export async function storeTempFile(tempPath, key) {
  const target = keyPath(key);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  try {
    await fsp.rename(tempPath, target);
  } catch (error) {
    if (error.code !== "EXDEV") throw error;
    await fsp.copyFile(tempPath, target);
    await fsp.unlink(tempPath);
  }
}

export async function storeBuffer(buffer, key) {
  const target = keyPath(key);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, buffer);
}

export async function deleteStored(key) {
  if (!key) return;
  await fsp.unlink(keyPath(key)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

export async function removeTemp(tempPath) {
  if (tempPath) await fsp.unlink(tempPath).catch(() => undefined);
}

/**
 * Stream a stored file, honouring a single `Range: bytes=a-b` header (video seeking).
 * @param {{ key: string, mimeType: string, size: number, fileName?: string|null, download?: boolean, cache?: string }} file
 */
export function sendStored(req, res, { key, mimeType, size, fileName, download = false, cache }) {
  const file = keyPath(key);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (cache) res.setHeader("Cache-Control", cache);
  const safeName = (fileName || "file").replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${safeName}"`);

  let start = 0;
  let end = size - 1;
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match || (match[1] === "" && match[2] === "")) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`);
      return res.end();
    }
    if (match[1] === "") {
      start = Math.max(0, size - Number(match[2]));
    } else {
      start = Number(match[1]);
      end = match[2] === "" ? size - 1 : Math.min(size - 1, Number(match[2]));
    }
    if (start > end || start >= size) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`);
      return res.end();
    }
    res.status(206).setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  res.setHeader("Content-Length", end - start + 1);
  if (req.method === "HEAD") return res.end();
  const stream = fs.createReadStream(file, { start, end });
  stream.on("error", (error) => {
    if (!res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ error: "File not found" });
    else res.destroy(error);
  });
  stream.pipe(res);
}

// ---------------------------------------------------------------------------
// Signed URLs
// ---------------------------------------------------------------------------

let secret = null;
function signingSecret() {
  if (secret) return secret;
  const configured = process.env.MEDIA_URL_SECRET || process.env.JWT_SECRET;
  if (configured) secret = configured;
  else {
    // Links stop working after a restart, which is fine for local development
    secret = crypto.randomBytes(32).toString("hex");
    if (process.env.NODE_ENV === "production") console.warn("MEDIA_URL_SECRET is not set; media links reset on every restart.");
  }
  return secret;
}

const DAY_S = 24 * 60 * 60;

/** Expiry at the end of tomorrow (UTC), so a file's URL stays the same all day and caches well. */
export function defaultExpiry(now = Date.now()) {
  const today = Math.floor(now / 1000 / DAY_S) * DAY_S;
  return today + 2 * DAY_S;
}

function signature(id, exp) {
  return crypto.createHmac("sha256", signingSecret()).update(`media:${id}:${exp}`).digest("base64url").slice(0, 32);
}

/** `/api/media/:id?e=...&s=...` */
export function signedMediaUrl(id, { exp = defaultExpiry() } = {}) {
  return `/api/media/${id}?e=${exp}&s=${signature(id, exp)}`;
}

export function verifyMediaSignature(id, exp, sig, now = Date.now()) {
  const expiry = Number(exp);
  if (!Number.isInteger(expiry) || expiry * 1000 < now || typeof sig !== "string") return false;
  const expected = Buffer.from(signature(id, expiry));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
