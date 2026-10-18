/** Client-safe DTOs shared between server pages and client components. */

export type LeadDTO = {
  id: number;
  contactName: string;
  contactEmail: string | null;
  contactWhatsapp: string;
  propertyType: string;
  location: string;
  energyUsageKwh: string | null;
  monthlyBillPhp: string | null;
  gridState: string;
  timeline: string;
  notes: string | null;
  sourceChannel: string;
  status: string;
  leadScore: number;
  leadTier: string;
  createdAt: string;
};

export type ProposalDTO = {
  id: number;
  leadId: number;
  model: string;
  engine: string;
  summary: string;
  content: string;
  systemSizeKw: string | null;
  estimatedCostPhp: string | null;
  monthlySavingsPhp: string | null;
  paybackYears: string | null;
  createdAt: string;
};

export type AppointmentDTO = {
  id: number;
  leadId: number | null;
  leadName: string | null;
  title: string;
  kind: string;
  scheduledFor: string;
  durationMinutes: number;
  crew: string;
  location: string;
  status: string;
  dispatchedAt: string | null;
  notes: string | null;
};
