// Encryption at rest for organizers' AI provider keys (AES-256-GCM).
// The key comes from AI_KEY_ENCRYPTION_SECRET; rotating it makes saved keys unreadable,
// so organizers would need to add them again.
import crypto from "node:crypto";
import { HttpError } from "../../lib/httpError.js";

const VERSION = "v1";
const MIN_SECRET_LENGTH = 32;

export const keyStorageReady = () => (process.env.AI_KEY_ENCRYPTION_SECRET ?? "").length >= MIN_SECRET_LENGTH;

function encryptionKey() {
  if (!keyStorageReady()) {
    throw new HttpError(503, "Saving AI keys isn't set up on this server yet", { code: "AI_KEYS_DISABLED" });
  }
  return crypto.createHash("sha256").update(process.env.AI_KEY_ENCRYPTION_SECRET).digest();
}

export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(payload) {
  const [version, iv, tag, ciphertext] = String(payload).split(":");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("Unknown key format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}
