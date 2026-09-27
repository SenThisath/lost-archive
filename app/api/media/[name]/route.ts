import { gate, privateHeaders } from "@/lib/gate";
import { readFile } from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const types: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
};
export async function GET(
  _: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (!gate().open)
    return new Response("ARCHIVE SEALED", {
      status: 423,
      headers: privateHeaders,
    });
  const { name } = await params;
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|mp3|m4a|wav|ogg|webm)$/.test(name))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "private-media", name),
    );
    return new Response(bytes, {
      headers: { ...privateHeaders, "Content-Type": types[path.extname(name)] },
    });
  } catch {
    return new Response("Fragment missing", {
      status: 404,
      headers: privateHeaders,
    });
  }
}
