import FinanceBoard from "@/components/admin/FinanceBoard";
import PageHeader from "@/components/admin/PageHeader";
import { listFinance } from "@/lib/finance";
import { currentPeriod } from "@/lib/finance-model";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const data = await listFinance();

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Money"
        title="Finance"
        description="Subscriptions, solar job costing, marketing and monthly profit. Everything is entered by hand at first — nothing here is guessed on your behalf."
      />
      <FinanceBoard initialData={data} initialPeriod={currentPeriod()} />
    </div>
  );
}
