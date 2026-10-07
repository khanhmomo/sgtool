import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// File storage: Vercel Blob in production (BLOB_READ_WRITE_TOKEN),
// local public/uploads fallback for development.

const ALLOWED: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/gpx+xml": ".gpx",
  "text/xml": ".gpx",
  "application/octet-stream": ".bin",
};

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export function validateUpload(filename: string, mime: string, size: number): string | null {
  const ext = path.extname(filename).toLowerCase();
  const okExt = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".gpx", ".xml"].includes(ext);
  const okMime = mime in ALLOWED || mime.startsWith("image/");
  if (!okExt && !okMime) {
    return `File type not supported. Allowed: PDF, JPG, PNG, WEBP, GIF, GPX.`;
  }
  if (size > MAX_SIZE) return "File is too large (max 25MB).";
  return null;
}

export interface StoredFile {
  url: string;
  filename: string;
  mime: string;
  size: number;
}

export async function storeFile(file: File): Promise<StoredFile> {
  const err = validateUpload(file.name, file.type, file.size);
  if (err) throw new Error(err);

  const safeBase =
    path
      .basename(file.name)
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(-80) || "file";
  const key = `${crypto.randomUUID()}-${safeBase}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, file, { access: "public" });
    return { url: blob.url, filename: file.name, mime: file.type, size: file.size };
  }

  // Local fallback — files land in public/uploads (gitignored).
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, key), buf);
  return {
    url: `/uploads/${key}`,
    filename: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
  };
}
