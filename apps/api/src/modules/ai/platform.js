// Cognitia's own AI (platform key from the environment), its per-organizer quota and usage logging.
import { prisma } from "../../lib/database.js";

const DAY_MS = 24 * 60 * 60_000;

export function platformConfig() {
  const apiKey = (process.env.AI_PLATFORM_API_KEY ?? "").trim();
  const limit = Number.parseInt(process.env.AI_PLATFORM_DAILY_LIMIT ?? "", 10);
  return {
    enabled: Boolean(apiKey) && !apiKey.startsWith("your_"),
    apiKey,
    baseUrl: (process.env.AI_PLATFORM_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, ""),
    model: process.env.AI_PLATFORM_MODEL || "deepseek-flash",
    // Requests per organizer in any 24-hour window
    dailyLimit: Number.isFinite(limit) && limit >= 0 ? limit : 300,
  };
}

/** Platform AI requests charged to a user in the last 24 hours. */
export function platformUsedToday(userId) {
  return prisma.aiUsage.count({
    where: { userId, credentialId: null, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
  });
}

export async function platformStatus(userId) {
  const config = platformConfig();
  const used = userId ? await platformUsedToday(userId) : 0;
  return {
    enabled: config.enabled,
    model: config.model,
    dailyLimit: config.dailyLimit,
    usedToday: used,
    remaining: Math.max(0, config.dailyLimit - used),
  };
}

export async function logUsage({ userId, contestId = null, credentialId = null, purpose, model, usage, success, error = null }) {
  try {
    await prisma.aiUsage.create({
      data: {
        userId: userId ?? null,
        contestId,
        credentialId,
        purpose,
        model: model ?? "unknown",
        promptTokens: usage?.prompt ?? 0,
        completionTokens: usage?.completion ?? 0,
        success,
        error: error ? String(error).slice(0, 500) : null,
      },
    });
  } catch (err) {
    console.error("Couldn't log AI usage:", err.message);
  }
}
