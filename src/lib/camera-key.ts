import { createHmac } from "crypto";

/** Share key for the co-leader camera-check link — deterministic per event,
    no DB storage needed. Signed with AUTH_SECRET. */
export function cameraCheckKey(eventId: string): string {
  const secret = process.env.AUTH_SECRET || "dev-secret";
  return createHmac("sha256", secret).update(`camera-check:${eventId}`).digest("hex").slice(0, 24);
}

export function validCameraKey(eventId: string, key: string | null): boolean {
  return !!key && key === cameraCheckKey(eventId);
}
