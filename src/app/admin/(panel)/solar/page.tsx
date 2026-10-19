import PageHeader from "@/components/admin/PageHeader";
import SolarBoard from "@/components/admin/SolarBoard";
import { listSolar } from "@/lib/solar";

export const dynamic = "force-dynamic";

export default async function SolarCataloguePage() {
  const data = await listSolar();

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Hardware"
        title="Solar catalogue"
        description="Every inverter, panel and battery we can install, what it costs us, and the packages we quote from. A quote is built from these rows — nothing is invented for a customer."
      />
      <SolarBoard initialData={data} />
    </div>
  );
}
