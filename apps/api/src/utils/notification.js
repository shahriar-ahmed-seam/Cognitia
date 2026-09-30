import { prisma } from "../lib/database.js";
import { publishNotification } from "./queue.js";

function publish(notification) {
  publishNotification({
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    createdAt: notification.createdAt,
    isRead: notification.isRead,
  });
}

export async function createAndSendNotification({ userId, type, title, message, link = null }) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link },
  });
  publish(notification);
  return notification;
}

/**
 * Create many notifications in one query and push each one to connected clients.
 * @param {{ userId: string, type: string, title: string, message: string, link?: string|null }[]} rows
 */
export async function createNotifications(rows) {
  if (!rows.length) return [];
  const notifications = await prisma.notification.createManyAndReturn({
    data: rows.map(({ userId, type, title, message, link = null }) => ({ userId, type, title, message, link })),
  });
  notifications.forEach(publish);
  return notifications;
}
