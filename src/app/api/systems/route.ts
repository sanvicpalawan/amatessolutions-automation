import { getSessionUser } from "@/lib/auth";
import { fleetSummary, listMonitoredSystems } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const fleet = await listMonitoredSystems();
  return Response.json({ summary: fleetSummary(fleet), systems: fleet });
}
