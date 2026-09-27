import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isReleased, previewAllowed, releaseTime } from "./release";
export function gate() {
  const preview = previewAllowed(
    process.env.NODE_ENV,
    process.env.ARCHIVE_DEV_PREVIEW,
  );
  return {
    open: preview || isReleased(Date.now(), process.env.ARCHIVE_UNLOCK_AT),
    preview,
    unlockAt: releaseTime(process.env.ARCHIVE_UNLOCK_AT),
    now: Date.now(),
  };
}
function secret() {
  const key = process.env.ARCHIVE_SESSION_SECRET;
  if (!key && process.env.NODE_ENV === "production" && process.env.CONVEX_URL)
    throw new Error("Set ARCHIVE_SESSION_SECRET before connecting Convex.");
  return key || "development-only-local-archive-session";
}
function sign(id: string) {
  return createHmac("sha256", secret()).update(id).digest("hex");
}
export async function session(create = false) {
  const jar = await cookies();
  const value = jar.get("archive_session")?.value;
  if (value) {
    const [id, signature] = value.split(".");
    if (
      /^[a-f0-9]{64}$/.test(id || "") &&
      /^[a-f0-9]{64}$/.test(signature || "") &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)))
    )
      return sign("convex:" + id);
  }
  if (!create) return null;
  const id = randomBytes(32).toString("hex");
  jar.set("archive_session", `${id}.${sign(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return sign("convex:" + id);
}
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
};
