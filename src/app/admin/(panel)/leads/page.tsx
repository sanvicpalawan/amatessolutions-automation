import { desc } from "drizzle-orm";

import LeadsTable from "@/components/admin/LeadsTable";
import PageHeader from "@/components/admin/PageHeader";
import ModelStatus from "@/components/admin/ModelStatus";
import { db } from "@/db";
import { leads } from "@/db/schema";
import type { LeadDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(200);

  const initialLeads: LeadDTO[] = rows.map((row) => ({
    id: row.id,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactWhatsapp: row.contactWhatsapp,
    propertyType: row.propertyType,
    location: row.location,
    energyUsageKwh: row.energyUsageKwh,
    monthlyBillPhp: row.monthlyBillPhp,
    gridState: row.gridState,
    timeline: row.timeline,
    notes: row.notes,
    sourceChannel: row.sourceChannel,
    status: row.status,
    leadScore: row.leadScore,
    leadTier: row.leadTier,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Leads CRM"
        description="Unified intake from the website form and the WhatsApp webhook."
        action={<ModelStatus compact />}
      />
      <LeadsTable initialLeads={initialLeads} />
    </div>
  );
}
