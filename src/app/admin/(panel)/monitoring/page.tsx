import MonitoringCards from "@/components/admin/MonitoringCards";
import PageHeader from "@/components/admin/PageHeader";
import { fleetSummary, listMonitoredSystems } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const fleet = await listMonitoredSystems();
  const summary = fleetSummary(fleet);

  return (
    <div>
      <PageHeader
        eyebrow="24/7 desk"
        title="Remote monitoring"
        description="Free lifetime monitoring on Amates installs — requires site WIFI, no third-party modifications."
      />
      <MonitoringCards initialSystems={fleet} initialSummary={summary} />
    </div>
  );
}
