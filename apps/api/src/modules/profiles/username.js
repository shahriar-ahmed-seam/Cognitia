// Every account gets a unique @username for mentions and profile links, based on its email.
import { prisma } from "../../lib/database.js";
import { RESERVED_USERNAMES } from "../community/validation.js";

export function usernameBase(email, name) {
  const fromEmail = String(email ?? "").split("@")[0];
  let base = fromEmail.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (base.length < 3) base = String(name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (base.length < 3) base = `user${base}`;
  base = base.slice(0, 20);
  return RESERVED_USERNAMES.has(base) ? `${base}1` : base;
}

/** Give the user a username if they don't have one. Returns it. */
export async function ensureUsername(user, db = prisma) {
  if (user.username) return user.username;
  const base = usernameBase(user.email, user.name);
  for (let i = 0; i < 100; i++) {
    const candidate = i ? `${base}${i + 1}` : base;
    const taken = await db.user.findFirst({ where: { username: candidate }, select: { id: true } });
    if (taken) continue;
    try {
      await db.user.update({ where: { id: user.id }, data: { username: candidate } });
      return candidate;
    } catch (error) {
      // Someone took it at the same moment: try the next one
      if (error.code !== "P2002") throw error;
    }
  }
  const fallback = `${base}${Date.now().toString(36)}`;
  await db.user.update({ where: { id: user.id }, data: { username: fallback } });
  return fallback;
}
