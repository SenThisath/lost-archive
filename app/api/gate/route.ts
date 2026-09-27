import { gate, privateHeaders } from "@/lib/gate";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(gate(), { headers: privateHeaders });
}
