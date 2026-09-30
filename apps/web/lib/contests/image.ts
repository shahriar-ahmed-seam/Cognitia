// Client-side photo shrinking before upload: phone photos are often 4-8 MB, and a 1600 px JPEG
// is plenty for reading handwriting (the AI downsizes to about 1300 px anyway).

const MAX_DIMENSION = 1600
const QUALITY = 0.82
const PASS_THROUGH_BYTES = 600 * 1024
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024

export class ImageError extends Error {}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // Respect EXIF rotation from phone cameras
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      // Fall through to <img>, which some browsers decode more formats with
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = "async"
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new ImageError("This photo format isn't supported here. Take the photo as JPEG, or take a screenshot of it.")
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Returns a JPEG no larger than 1600 px on its long side, or the original if it's already small. */
export async function prepareImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new ImageError("Choose an image file (JPEG, PNG or WebP)")
  }
  if (ACCEPTED.includes(file.type) && file.size <= PASS_THROUGH_BYTES) return { blob: file, name: file.name }

  const bitmap = await decode(file)
  const width = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width
  const height = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new ImageError("Couldn't process this photo")
  ctx.fillStyle = "#ffffff" // transparent PNGs become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  if ("close" in bitmap) bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY))
  if (!blob) throw new ImageError("Couldn't process this photo")
  if (blob.size > MAX_UPLOAD_BYTES) throw new ImageError("This photo is too large even after compressing. Try a closer crop.")
  return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" }
}
