import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpError } from "./errors";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(serverRoot, "uploads");
export const PUBLIC_UPLOADS = path.join(UPLOADS_ROOT, "public");
export const PRIVATE_UPLOADS = path.join(UPLOADS_ROOT, "private");

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

function decodeBase64(data: string): { buffer: Buffer; contentType: string | null } {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.*)$/s.exec(data);
  const payload = match ? match[2] : data;
  const contentType = match ? match[1] : null;
  const buffer = Buffer.from(payload, "base64");
  if (buffer.length === 0) throw new HttpError(400, "Empty upload", "empty_upload");
  return { buffer, contentType };
}

export async function saveUpload(
  data: string,
  opts: { visibility: "public" | "private"; contentType?: string; kind: "image" | "video" },
): Promise<{ path: string; contentType: string; url: string }> {
  const { buffer, contentType: embedded } = decodeBase64(data);
  const contentType = opts.contentType ?? embedded ?? (opts.kind === "video" ? "video/mp4" : "image/jpeg");
  const limit = opts.kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (buffer.length > limit) throw new HttpError(413, "Upload too large", "too_large");
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) throw new HttpError(400, `Unsupported file type ${contentType}`, "unsupported_type");
  const dir = opts.visibility === "public" ? PUBLIC_UPLOADS : PRIVATE_UPLOADS;
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return {
    path: filename,
    contentType,
    url: opts.visibility === "public" ? `/uploads/${filename}` : filename,
  };
}

export async function removeUpload(filename: string, visibility: "public" | "private"): Promise<void> {
  const dir = visibility === "public" ? PUBLIC_UPLOADS : PRIVATE_UPLOADS;
  try {
    await unlink(path.join(dir, path.basename(filename)));
  } catch {
    // already gone
  }
}

export function publicUrl(filename: string): string {
  return `/uploads/${path.basename(filename)}`;
}

export function privatePath(filename: string): string {
  return path.join(PRIVATE_UPLOADS, path.basename(filename));
}
