// OpenAI-compatible chat completions for DeepSeek, OpenAI and other compatible providers.
import dns from "node:dns/promises";
import net from "node:net";
import { badRequest } from "../../lib/httpError.js";

export const PROVIDERS = {
  DEEPSEEK: { label: "DeepSeek", baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-flash" },
  OPENAI: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: null },
  // Any provider with an OpenAI-style /chat/completions endpoint, e.g. OpenRouter or Groq
  OPENAI_COMPATIBLE: { label: "OpenAI-compatible", baseUrl: null, defaultModel: null },
};

/** A failed AI request. `retryable` is false for errors that won't fix themselves (bad key, bad model). */
export class AiError extends Error {
  constructor(message, { status = null, retryable = true } = {}) {
    super(message);
    this.name = "AiError";
    this.status = status;
    this.retryable = retryable;
  }
}

// ---------------------------------------------------------------------------
// Custom base URLs must be public https endpoints (no localhost or private networks)
// ---------------------------------------------------------------------------

function isPrivateIPv4(ip) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isPrivateAddress(address) {
  if (net.isIPv4(address)) return isPrivateIPv4(address);
  const ip = address.toLowerCase();
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return ip === "::" || ip === "::1" || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^ff/.test(ip);
}

/** Validate and normalize a custom API base URL. Throws a 400 if it isn't a public https URL. */
export async function assertSafeBaseUrl(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    throw badRequest("Enter a valid API URL, like https://api.example.com/v1", { code: "AI_BASE_URL" });
  }
  if (url.protocol !== "https:") throw badRequest("The API URL must start with https://", { code: "AI_BASE_URL" });
  if (url.username || url.password || url.search || url.hash) {
    throw badRequest("Use a plain API URL without credentials or query parameters", { code: "AI_BASE_URL" });
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || /\.(localhost|local|internal|lan|home)$/.test(host)) {
    throw badRequest("The API URL must point to a public server", { code: "AI_BASE_URL" });
  }
  let addresses;
  if (net.isIP(host)) addresses = [host];
  else {
    try {
      addresses = (await dns.lookup(host, { all: true })).map((a) => a.address);
    } catch {
      throw badRequest("We couldn't reach that API host. Check the URL.", { code: "AI_BASE_URL" });
    }
  }
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw badRequest("The API URL must point to a public server", { code: "AI_BASE_URL" });
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

/** Provider error text, trimmed and with the key scrubbed in case a provider echoes it. */
function cleanError(message, apiKey) {
  let text = String(message ?? "").replace(/\s+/g, " ").trim();
  if (apiKey) text = text.split(apiKey).join("[key]");
  return text.length > 300 ? `${text.slice(0, 297)}...` : text;
}

/**
 * POST {baseUrl}/chat/completions.
 * @returns {{ content: string, model: string, usage: { prompt: number, completion: number } }}
 */
export async function chatCompletion({ baseUrl, apiKey, model, messages, maxTokens = 1500, json = false, timeoutMs = 90_000 }) {
  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0,
        ...(json && { response_format: { type: "json_object" } }),
      }),
      signal: AbortSignal.timeout(timeoutMs),
      // A redirect could point at an internal address; providers don't redirect API calls
      redirect: "error",
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new AiError(timedOut ? "The AI took too long to respond" : "Couldn't reach the AI provider", { retryable: true });
  }

  const raw = await response.text();
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch {
    // handled below
  }
  if (!response.ok) {
    const detail = cleanError(body?.error?.message ?? body?.message ?? raw, apiKey) || response.statusText;
    const status = response.status;
    const retryable = status === 408 || status === 409 || status === 429 || status >= 500;
    const prefix = status === 401 || status === 403 ? "The AI provider rejected the key" : status === 402 ? "The AI account is out of credit" : `AI request failed (${status})`;
    throw new AiError(`${prefix}: ${detail}`, { status, retryable });
  }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new AiError("The AI returned an empty response", { retryable: true });
  return {
    content,
    model: body.model ?? model,
    usage: { prompt: body.usage?.prompt_tokens ?? 0, completion: body.usage?.completion_tokens ?? 0 },
  };
}
