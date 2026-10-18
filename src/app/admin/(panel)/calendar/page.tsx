import { asc, desc, eq } from "drizzle-orm";

import BookingCalendar from "@/components/admin/BookingCalendar";
import PageHeader from "@/components/admin/PageHeader";
import { db } from "@/db";
import { appointments, leads } from "@/db/schema";
import type { AppointmentDTO, LeadDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [rows, leadRows] = await Promise.all([
    db
      .select({ appointment: appointments, leadName: leads.contactName })
      .from(appointments)
      .leftJoin(leads, eq(appointments.leadId, leads.id))
      .orderBy(asc(appointments.scheduledFor)),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(100),
  ]);

  const initialAppointments: AppointmentDTO[] = rows.map(({ appointment, leadName }) => ({
    id: appointment.id,
    leadId: appointment.leadId,
    leadName,
    title: appointment.title,
    kind: appointment.kind,
    scheduledFor: appointment.scheduledFor.toISOString(),
    durationMinutes: appointment.durationMinutes,
    crew: appointment.crew,
    location: appointment.location,
    status: appointment.status,
    dispatchedAt: appointment.dispatchedAt ? appointment.dispatchedAt.toISOString() : null,
    notes: appointment.notes,
  }));

  const leadOptions: LeadDTO[] = leadRows.map((row) => ({
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
        eyebrow="Scheduling"
        title="Booking calendar"
        description="Audit → crew dispatch. Dispatch posts to CREW_DISPATCH_WEBHOOK_URL when configured."
      />
      <BookingCalendar initialAppointments={initialAppointments} leads={leadOptions} />
    </div>
  );
}
