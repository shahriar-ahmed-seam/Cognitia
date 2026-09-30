// Shapes the community API returns. Users never carry emails, hashes or avatar bytes here.
import { signedMediaUrl } from "../../lib/storage.js";

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** User fields safe to show other students. */
export const publicUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUpdatedAt: true,
  headline: true,
  reputation: true,
  role: true,
  institution: true,
  major: true,
  grade: true,
};

export function avatarUrl(user) {
  if (!user?.avatarUpdatedAt) return null;
  return `/api/public/avatars/${user.id}?v=${new Date(user.avatarUpdatedAt).getTime().toString(36)}`;
}

/** Public URL for profile covers and space images (not private post media). */
export const publicMediaUrl = (id) => (id ? `/api/public/media/${id}` : null);

export function userMini(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? null,
    avatarUrl: avatarUrl(user),
    headline: user.headline ?? null,
    reputation: user.reputation ?? 0,
    role: user.role ?? "STUDENT",
    institution: user.institution ?? null,
    major: user.major ?? null,
    grade: user.grade ?? null,
  };
}

export const spaceMiniSelect = {
  id: true,
  slug: true,
  name: true,
  kind: true,
  color: true,
  visibility: true,
  isOfficial: true,
  iconId: true,
  institution: true,
  courseCode: true,
  allowAnonymous: true,
};

export function spaceMini(space) {
  if (!space) return null;
  return {
    id: space.id,
    slug: space.slug,
    name: space.name,
    kind: space.kind,
    color: space.color,
    visibility: space.visibility,
    isOfficial: space.isOfficial,
    iconUrl: publicMediaUrl(space.iconId),
    institution: space.institution ?? null,
    courseCode: space.courseCode ?? null,
  };
}

export function mediaView(media) {
  return {
    id: media.id,
    kind: media.kind,
    mimeType: media.mimeType,
    size: media.size,
    fileName: media.fileName ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
    durationSec: media.durationSec ?? null,
    url: signedMediaUrl(media.id),
    posterUrl: media.posterId ? signedMediaUrl(media.posterId) : null,
  };
}

export { iso };
