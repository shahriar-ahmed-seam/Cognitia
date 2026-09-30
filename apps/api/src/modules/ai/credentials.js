// Organizers' own AI keys, and which AI a contest grades with.
import { prisma } from "../../lib/database.js";
import { badRequest, conflict, notFound } from "../../lib/httpError.js";
import { decryptSecret, encryptSecret, keyStorageReady } from "./crypto.js";
import { PROVIDERS, assertSafeBaseUrl, chatCompletion } from "./providers.js";
import { logUsage, platformConfig, platformStatus, platformUsedToday } from "./platform.js";

const MAX_CREDENTIALS = 10;

export function credentialView(credential, usedBy = 0) {
  return {
    id: credential.id,
    label: credential.label,
    provider: credential.provider,
    providerLabel: PROVIDERS[credential.provider]?.label ?? credential.provider,
    baseUrl: credential.baseUrl,
    model: credential.model,
    keyLast4: credential.keyLast4,
    lastUsedAt: credential.lastUsedAt?.toISOString() ?? null,
    lastTestedAt: credential.lastTestedAt?.toISOString() ?? null,
    lastTestOk: credential.lastTestOk,
    createdAt: credential.createdAt.toISOString(),
    usedBy,
  };
}

export async function listCredentials(user) {
  const rows = await prisma.aiCredential.findMany({
    where: { ownerId: user.id },
    include: { _count: { select: { contests: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => credentialView(row, row._count.contests));
}

export async function aiStatus(user) {
  return {
    platform: await platformStatus(user.id),
    keyStorage: keyStorageReady(),
    providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label, baseUrl: p.baseUrl, defaultModel: p.defaultModel })),
    credentials: await listCredentials(user),
  };
}

async function resolveEndpoint(provider, baseUrl, model) {
  const preset = PROVIDERS[provider];
  if (!preset) throw badRequest("Unknown AI provider");
  const url = preset.baseUrl ?? (baseUrl ? await assertSafeBaseUrl(baseUrl) : null);
  if (!url) throw badRequest("Enter the provider's API URL", { code: "AI_BASE_URL" });
  const resolvedModel = (model ?? "").trim() || preset.defaultModel;
  if (!resolvedModel) throw badRequest("Enter the model name to use", { code: "AI_MODEL" });
  return { baseUrl: url, model: resolvedModel };
}

export async function createCredential(user, { label, provider, baseUrl, model, apiKey }) {
  const count = await prisma.aiCredential.count({ where: { ownerId: user.id } });
  if (count >= MAX_CREDENTIALS) throw conflict(`You can save up to ${MAX_CREDENTIALS} AI keys`);
  const endpoint = await resolveEndpoint(provider, baseUrl, model);
  const credential = await prisma.aiCredential.create({
    data: {
      ownerId: user.id,
      label,
      provider,
      ...endpoint,
      keyCiphertext: encryptSecret(apiKey),
      keyLast4: apiKey.slice(-4),
    },
  });
  return credentialView(credential);
}

async function ownCredential(user, id) {
  const credential = await prisma.aiCredential.findFirst({ where: { id, ownerId: user.id } });
  if (!credential) throw notFound("AI key not found");
  return credential;
}

export async function updateCredential(user, id, input) {
  const existing = await ownCredential(user, id);
  const provider = existing.provider;
  const endpoint =
    input.baseUrl !== undefined || input.model !== undefined
      ? await resolveEndpoint(provider, input.baseUrl ?? existing.baseUrl, input.model ?? existing.model)
      : {};
  const credential = await prisma.aiCredential.update({
    where: { id },
    data: {
      ...(input.label && { label: input.label }),
      ...endpoint,
      ...(input.apiKey && { keyCiphertext: encryptSecret(input.apiKey), keyLast4: input.apiKey.slice(-4), lastTestOk: null, lastTestedAt: null }),
    },
    include: { _count: { select: { contests: true } } },
  });
  return credentialView(credential, credential._count.contests);
}

export async function deleteCredential(user, id) {
  await ownCredential(user, id);
  // Contests using it fall back to "no key selected" (FK is SET NULL)
  await prisma.aiCredential.delete({ where: { id } });
  return { deleted: true };
}

function decryptKey(credential) {
  try {
    return decryptSecret(credential.keyCiphertext);
  } catch {
    return null;
  }
}

/** Send a tiny request to check the key, URL and model work. */
export async function testCredential(user, id) {
  const credential = await ownCredential(user, id);
  const apiKey = decryptKey(credential);
  if (!apiKey) throw conflict("This key can't be read anymore. Delete it and add it again.", { code: "AI_KEY_UNREADABLE" });
  const started = Date.now();
  let ok = true;
  let error = null;
  let usage = null;
  try {
    const result = await chatCompletion({
      baseUrl: credential.baseUrl,
      apiKey,
      model: credential.model,
      messages: [{ role: "user", content: "Reply with the single word OK." }],
      maxTokens: 64,
      timeoutMs: 30_000,
    });
    usage = result.usage;
  } catch (err) {
    ok = false;
    error = err.message;
  }
  await Promise.all([
    prisma.aiCredential.update({ where: { id }, data: { lastTestedAt: new Date(), lastTestOk: ok } }),
    logUsage({ userId: user.id, credentialId: id, purpose: "KEY_TEST", model: credential.model, usage, success: ok, error }),
  ]);
  return { ok, error, latencyMs: Date.now() - started, model: credential.model };
}

/** A credential id the acting user may attach to a contest. */
export async function assertUsableCredential(user, credentialId) {
  if (!credentialId) return null;
  const credential = await prisma.aiCredential.findFirst({ where: { id: credentialId, ownerId: user.id } });
  if (!credential) throw badRequest("Choose one of your own saved AI keys", { code: "AI_CREDENTIAL" });
  return credential;
}

/** Who a contest's platform AI usage is charged to: its owner, else its creator. */
async function contestOwnerId(contest) {
  const owner = await prisma.contestOrganizer.findFirst({ where: { contestId: contest.id, role: "OWNER" }, select: { userId: true } });
  return owner?.userId ?? contest.createdById ?? null;
}

/**
 * The AI a contest grades with.
 * @returns {{ ok: true, endpoint, credentialId, chargeTo, remaining } | { ok: false, reason, manual? }}
 */
export async function resolveContestAi(contest) {
  if (contest.writtenGrading === "MANUAL") return { ok: false, manual: true, reason: null };
  if (contest.aiSource === "OWN_KEY") {
    if (!contest.aiCredentialId) return { ok: false, reason: "No AI key is selected for this contest" };
    const credential = await prisma.aiCredential.findUnique({ where: { id: contest.aiCredentialId } });
    if (!credential) return { ok: false, reason: "The AI key for this contest was deleted" };
    const apiKey = decryptKey(credential);
    if (!apiKey) return { ok: false, reason: "The AI key for this contest can't be read. Add it again." };
    return {
      ok: true,
      endpoint: { baseUrl: credential.baseUrl, apiKey, model: credential.model },
      credentialId: credential.id,
      chargeTo: credential.ownerId,
      remaining: Infinity,
    };
  }
  const config = platformConfig();
  if (!config.enabled) return { ok: false, reason: "Cognitia AI isn't set up on this server" };
  const chargeTo = await contestOwnerId(contest);
  const used = chargeTo ? await platformUsedToday(chargeTo) : 0;
  return {
    ok: true,
    endpoint: { baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model },
    credentialId: null,
    chargeTo,
    remaining: Math.max(0, config.dailyLimit - used),
  };
}

/** Short status of a contest's AI setup, for the organizer console. */
export async function contestAiSummary(contest) {
  const credential = contest.aiCredentialId
    ? await prisma.aiCredential.findUnique({ where: { id: contest.aiCredentialId } })
    : null;
  const chargeTo = contest.aiSource === "PLATFORM" ? await contestOwnerId(contest) : null;
  const platform = await platformStatus(chargeTo);
  let ready = contest.writtenGrading === "MANUAL";
  let problem = null;
  if (!ready) {
    if (contest.aiSource === "OWN_KEY") {
      ready = Boolean(credential);
      problem = credential ? null : "Choose an AI key, or switch to Cognitia AI";
    } else {
      ready = platform.enabled;
      problem = platform.enabled ? null : "Cognitia AI isn't set up on this server";
    }
  }
  return {
    ready,
    problem,
    source: contest.aiSource,
    platform,
    credential: credential
      ? { id: credential.id, label: credential.label, provider: credential.provider, model: credential.model, keyLast4: credential.keyLast4, ownerId: credential.ownerId }
      : null,
  };
}
