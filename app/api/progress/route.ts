import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { gate, privateHeaders, session } from "@/lib/gate";
export const dynamic = "force-dynamic";
const getProgress = makeFunctionReference<"query">("archive:progress");
const restore = makeFunctionReference<"mutation">("archive:restore");
function client() {
  const url = process.env.CONVEX_URL;
  return url && process.env.ARCHIVE_BACKEND_KEY
    ? new ConvexHttpClient(url)
    : null;
}
export async function GET() {
  if (!gate().open)
    return Response.json(
      { error: "SEALED" },
      { status: 423, headers: privateHeaders },
    );
  const id = await session();
  if (!id) return Response.json({ error: "No session" }, { status: 401 });
  const c = client();
  if (!c || gate().preview)
    return Response.json({ mode: "local" }, { headers: privateHeaders });
  try {
    return Response.json(
      {
        mode: "cloud",
        ...(await c.query(getProgress, {
          key: process.env.ARCHIVE_BACKEND_KEY,
          session: id,
        })),
      },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { mode: "offline" },
      { status: 503, headers: privateHeaders },
    );
  }
}
export async function POST(request: Request) {
  if (!gate().open) return Response.json({ error: "SEALED" }, { status: 423 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const id = await session();
  if (!id) return Response.json({ error: "No session" }, { status: 401 });
  try {
    const body = await request.json();
    if (
      !Number.isInteger(body.completed) ||
      body.completed < 0 ||
      body.completed > 5 ||
      typeof body.candleLit !== "boolean"
    )
      return Response.json({ error: "Invalid progress" }, { status: 400 });
    const c = client();
    if (!c || gate().preview)
      return Response.json({ mode: "local" }, { headers: privateHeaders });
    return Response.json(
      {
        mode: "cloud",
        ...(await c.mutation(restore, {
          key: process.env.ARCHIVE_BACKEND_KEY,
          session: id,
          completed: body.completed,
          candleLit: body.candleLit,
        })),
      },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: "Progress could not sync; your browser keeps a copy." },
      { status: 503, headers: privateHeaders },
    );
  }
}
