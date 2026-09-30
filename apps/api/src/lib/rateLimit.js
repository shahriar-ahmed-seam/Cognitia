// Small in-memory rate limiter for per-user actions (posts, replies, uploads).
// Good enough for one API process; move to Redis if the API is scaled out.
import { HttpError } from "./httpError.js";

const buckets = new Map();
let lastSweep = Date.now();

function sweep(now) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, times] of buckets) {
    if (!times.length || now - times[times.length - 1] > 24 * 60 * 60_000) buckets.delete(key);
  }
}

/**
 * Record one action for `key` and throw 429 if more than `limit` happened within `windowMs`.
 * @param {string} key e.g. "post:<userId>"
 */
export function takeToken(key, { limit, windowMs, message = "You're doing that too often. Try again in a little while." }) {
  if (process.env.NODE_ENV === "test" && !process.env.RATE_LIMIT_IN_TESTS) return;
  const now = Date.now();
  sweep(now);
  const times = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - times[0])) / 1000);
    throw new HttpError(429, message, { code: "RATE_LIMITED", details: { retryAfter } });
  }
  times.push(now);
  buckets.set(key, times);
}

export function resetRateLimits() {
  buckets.clear();
}
