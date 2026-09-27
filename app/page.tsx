import { gate } from "@/lib/gate";
import Gate from "@/components/Gate";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Gate initial={gate()} />;
}
