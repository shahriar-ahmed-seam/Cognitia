// Uploads for posts, replies, video posters, profile covers and space images. Files are checked
// by content (not name), size-limited per kind, and stored on disk.
import fsp from "node:fs/promises";
import multer from "multer";
import { fileTypeFromFile } from "file-type";
import { prisma } from "../../lib/database.js";
import { badRequest, forbidden, notFound } from "../../lib/httpError.js";
import { takeToken } from "../../lib/rateLimit.js";
import { deleteStored, newMediaId, removeTemp, sendStored, storageKeyFor, storeTempFile, tempDir, verifyMediaSignature } from "../../lib/storage.js";
import * as engine from "./engine.js";
import { mediaView, publicMediaUrl } from "./serializers.js";

const MB = 1024 * 1024;
export const MEDIA_TYPES = {
  IMAGE: { mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"], max: 8 * MB },
  VIDEO: { mimes: ["video/mp4", "video/webm", "video/quicktime"], max: 60 * MB },
  DOCUMENT: {
    mimes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
    ],
    max: 25 * MB,
  },
};
const PURPOSE_KINDS = { POST: ["IMAGE", "VIDEO", "DOCUMENT"], REPLY: ["IMAGE"], POSTER: ["IMAGE"], COVER: ["IMAGE"], SPACE_ICON: ["IMAGE"], SPACE_COVER: ["IMAGE"] };
const PUBLIC_PURPOSES = new Set(["COVER", "SPACE_ICON", "SPACE_COVER"]);

export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fsp.mkdir(tempDir(), { recursive: true }).then(() => cb(null, tempDir()), cb);
    },
    filename: (req, file, cb) => cb(null, `${newMediaId()}.upload`),
  }),
  limits: { fileSize: MEDIA_TYPES.VIDEO.max, files: 1, fields: 12 },
});

const kindOf = (mime) => Object.entries(MEDIA_TYPES).find(([, t]) => t.mimes.includes(mime))?.[0] ?? null;
const clampInt = (value, max) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : null;
};

/** Store one upload; returns what the client attaches to a post (by id). */
export async function uploadMedia(ctx, file, fields) {
  try {
    if (!file) throw badRequest("Choose a file to upload", { code: "NO_FILE" });
    takeToken(`upload:${ctx.user.id}`, { limit: 60, windowMs: 60 * 60 * 1000, message: "You've uploaded a lot in the last hour. Try again later." });
    const purpose = String(fields.purpose ?? "POST").toUpperCase();
    if (!PURPOSE_KINDS[purpose]) throw badRequest("Unknown upload type");
    const detected = await fileTypeFromFile(file.path);
    const mime = detected?.mime ?? null;
    const kind = kindOf(mime);
    if (!kind) {
      throw badRequest("This file type isn't supported. Use JPEG, PNG, WebP or GIF images, MP4 or WebM video, or PDF, Word, PowerPoint or Excel documents.", { code: "FILE_TYPE" });
    }
    if (!PURPOSE_KINDS[purpose].includes(kind)) throw badRequest(purpose === "REPLY" ? "Replies take images only" : "Upload an image here", { code: "FILE_TYPE" });
    if (file.size > MEDIA_TYPES[kind].max) {
      throw badRequest(`${kind === "IMAGE" ? "Images" : kind === "VIDEO" ? "Videos" : "Documents"} can be at most ${MEDIA_TYPES[kind].max / MB} MB`, { code: "FILE_TOO_LARGE" });
    }
    if (kind === "VIDEO" && !engine.canUploadVideo(ctx.user, { moderatesSomewhere: ctx.moderatedSpaceIds.length > 0 })) {
      throw forbidden(`Posting videos needs ${engine.PRIVILEGES.uploadVideo} reputation. Answer a few questions first, or share a link.`, { code: "PRIVILEGE" });
    }
    let posterId = null;
    if (kind === "VIDEO" && fields.posterId) {
      const poster = await prisma.mediaFile.findUnique({ where: { id: String(fields.posterId) } });
      if (poster?.ownerId === ctx.user.id && poster.purpose === "POSTER") posterId = poster.id;
    }
    const id = newMediaId();
    const key = storageKeyFor(id, detected.ext);
    await storeTempFile(file.path, key);
    const originalName = String(file.originalname || "").replace(/[\\/]/g, "_").slice(0, 140) || `${kind.toLowerCase()}.${detected.ext}`;
    const media = await prisma.mediaFile.create({
      data: {
        id,
        ownerId: ctx.user.id,
        kind,
        purpose,
        mimeType: mime,
        size: file.size,
        storageKey: key,
        fileName: originalName,
        width: kind !== "DOCUMENT" ? clampInt(fields.width, 20_000) : null,
        height: kind !== "DOCUMENT" ? clampInt(fields.height, 20_000) : null,
        durationSec: kind === "VIDEO" ? clampInt(fields.durationSec, 24 * 3600) : null,
        posterId,
      },
    });
    return { ...mediaView(media), ...(PUBLIC_PURPOSES.has(purpose) && { url: publicMediaUrl(media.id) }) };
  } finally {
    await removeTemp(file?.path);
  }
}

/** Remove an upload that isn't attached to anything yet (e.g. the student took it out of the composer). */
export async function deleteMedia(ctx, id) {
  const media = await prisma.mediaFile.findUnique({ where: { id } });
  if (!media || media.ownerId !== ctx.user.id) throw notFound("File not found");
  if (media.postId || media.replyId) throw badRequest("Remove it from the post instead");
  await deleteStored(media.storageKey);
  await prisma.mediaFile.delete({ where: { id } });
  return { deleted: true };
}

/** GET /api/media/:id?e=&s= : a signed link, checked here (the signature was issued with access). */
export async function serveSignedMedia(req, res) {
  const { id } = req.params;
  if (!verifyMediaSignature(id, req.query.e, req.query.s)) return res.status(403).json({ error: "This link has expired. Reload the page." });
  const media = await prisma.mediaFile.findUnique({ where: { id } });
  if (!media) return res.status(404).json({ error: "File not found" });
  const secondsLeft = Math.max(60, Number(req.query.e) - Math.floor(Date.now() / 1000));
  return sendStored(req, res, {
    key: media.storageKey,
    mimeType: media.mimeType,
    size: media.size,
    fileName: media.fileName,
    download: req.query.download === "1" || (media.kind === "DOCUMENT" && media.mimeType !== "application/pdf"),
    cache: `private, max-age=${secondsLeft}, immutable`,
  });
}

/** GET /api/public/media/:id : covers and space images only. */
export async function servePublicMedia(req, res) {
  const media = await prisma.mediaFile.findUnique({ where: { id: req.params.id } });
  if (!media || !PUBLIC_PURPOSES.has(media.purpose)) return res.status(404).json({ error: "File not found" });
  return sendStored(req, res, { key: media.storageKey, mimeType: media.mimeType, size: media.size, fileName: media.fileName, cache: "public, max-age=31536000, immutable" });
}
