// Every minute: event reminders, cleanup of uploads nobody attached, and the AI answer queue.
import { prisma } from "../../lib/database.js";
import { deleteStored } from "../../lib/storage.js";
import { links, notify } from "./access.js";
import { processAiQueue } from "./ai.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });
/** "Today at 5:00 pm" or "Tomorrow at 10:00 am", in Bangladesh time. */
function when(start, at) {
  const day = dayKey.format(start) === dayKey.format(at) ? "Today" : "Tomorrow";
  return `${day} at ${timeFormat.format(start)}`;
}

async function sendReminders(at) {
  // A day ahead (for events more than an hour away), then an hour ahead
  const dayRows = await prisma.eventRsvp.findMany({
    where: { remindedDayAt: null, post: { status: "PUBLISHED", eventStartsAt: { gt: new Date(at.getTime() + HOUR), lte: new Date(at.getTime() + 24 * HOUR) } } },
    take: 300,
    include: { post: { select: { id: true, title: true, eventStartsAt: true, eventLocation: true } } },
  });
  const hourRows = await prisma.eventRsvp.findMany({
    where: { remindedHourAt: null, post: { status: "PUBLISHED", eventStartsAt: { gt: at, lte: new Date(at.getTime() + HOUR) } } },
    take: 300,
    include: { post: { select: { id: true, title: true, eventStartsAt: true, eventLocation: true } } },
  });
  const rows = [];
  for (const r of dayRows) {
    rows.push({ userId: r.userId, type: "COMMUNITY_EVENT", title: `${when(r.post.eventStartsAt, at)}: ${r.post.title}`, message: `${r.post.eventLocation ? r.post.eventLocation : "Open the event for details"}`, link: links.post(r.post.id) });
  }
  for (const r of hourRows) {
    const minutes = Math.max(1, Math.round((r.post.eventStartsAt - at) / MINUTE));
    rows.push({ userId: r.userId, type: "COMMUNITY_EVENT", title: `Starting in ${minutes} min: ${r.post.title}`, message: r.post.eventLocation ?? "Open the event for the link.", link: links.post(r.post.id) });
  }
  // notify() skips duplicates per user, so send day and hour reminders separately
  if (dayRows.length) {
    await prisma.eventRsvp.updateMany({ where: { OR: dayRows.map((r) => ({ postId: r.postId, userId: r.userId })) }, data: { remindedDayAt: at } });
    for (const row of rows.slice(0, dayRows.length)) await notify([row]);
  }
  if (hourRows.length) {
    await prisma.eventRsvp.updateMany({ where: { OR: hourRows.map((r) => ({ postId: r.postId, userId: r.userId })) }, data: { remindedHourAt: at, remindedDayAt: at } });
    for (const row of rows.slice(dayRows.length)) await notify([row]);
  }
}

/** Uploads that never made it into a post (or were taken out of one) go after a day. */
async function cleanupMedia(at) {
  const orphans = await prisma.mediaFile.findMany({
    where: { postId: null, replyId: null, purpose: { in: ["POST", "REPLY", "POSTER"] }, createdAt: { lt: new Date(at.getTime() - 24 * HOUR) } },
    take: 100,
  });
  // Posters of attached videos are attached too; this only catches abandoned ones
  for (const media of orphans) {
    await deleteStored(media.storageKey).catch((error) => console.error("Couldn't delete upload:", error.message));
    await prisma.mediaFile.delete({ where: { id: media.id } }).catch(() => undefined);
  }
  return orphans.length;
}

let running = false;

export async function runCommunityLifecycle(at = new Date()) {
  if (running) return;
  running = true;
  try {
    await sendReminders(at);
    await cleanupMedia(at);
  } finally {
    running = false;
  }
  processAiQueue().catch((error) => console.error("Community AI queue failed:", error));
}
