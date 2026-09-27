import { gate, session, privateHeaders } from "@/lib/gate";
import story from "@/content/story.json";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!gate().open)
    return Response.json(
      { error: "ARCHIVE SEALED" },
      { status: 423, headers: privateHeaders },
    );
  await session(true);
  return Response.json(story, { headers: privateHeaders });
}
