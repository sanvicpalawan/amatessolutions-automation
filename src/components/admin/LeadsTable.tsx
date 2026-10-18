"use client";

import { useEffect, useMemo, useState } from "react";

import { GRID_STATES, LEAD_STATUSES, PROPERTY_TYPES } from "@/lib/knowledge";
import { renderMarkdown } from "@/lib/markdown";
import type { LeadDTO, ProposalDTO } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-sky-100 text-sky-800",
  contacted: "bg-amber-100 text-amber-800",
  audit_booked: "bg-violet-100 text-violet-800",
  proposal_sent: "bg-indigo-100 text-indigo-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-slate-200 text-slate-600",
};

const label = (value: string) => value.replaceAll("_", " ");
const propertyLabel = (value: string) =>
  PROPERTY_TYPES.find((p) => p.value === value)?.label ?? label(value);
const gridLabel = (value: string) =>
  GRID_STATES.find((g) => g.value === value)?.label ?? label(value);

export default function LeadsTable({ initialLeads }: { initialLeads: LeadDTO[] }) {
  const [leads, setLeads] = useState<LeadDTO[]>(initialLeads);
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [active, setActive] = useState<LeadDTO | null>(null);
  const [proposals, setProposals] = useState<ProposalDTO[]>([]);
  const [generating, setGenerating] = useState(false);
  const [agentNote, setAgentNote] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ status, channel, q: query });
      const response = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { leads: LeadDTO[] };
        setLeads(payload.leads);
      }
      setLoading(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [status, channel, query]);

  async function openLead(lead: LeadDTO) {
    setActive(lead);
    setAgentNote(null);
    setProposals([]);
    const response = await fetch(`/api/leads/${lead.id}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { proposals: ProposalDTO[] };
      setProposals(payload.proposals);
    }
  }

  async function changeStatus(lead: LeadDTO, next: string) {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: next } : l)));
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  async function generateProposal() {
    if (!active) return;
    setGenerating(true);
    setAgentNote(null);
    try {
      const response = await fetch("/api/quote/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: active.id }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setAgentNote(payload.error ?? "Agent failed");
        return;
      }
      setAgentNote(
        payload.engine === "openrouter"
          ? `Generated with ${payload.model} via OpenRouter.`
          : `OpenRouter unavailable (${payload.warning ?? "no key"}). Used the deterministic ROI engine.`,
      );
      const refreshed = await fetch(`/api/leads/${active.id}`, { cache: "no-store" });
      if (refreshed.ok) {
        const data = (await refreshed.json()) as { proposals: ProposalDTO[]; lead: LeadDTO };
        setProposals(data.proposals);
        setLeads((prev) =>
          prev.map((l) => (l.id === active.id ? { ...l, status: data.lead.status } : l)),
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((lead) => {
      map[lead.status] = (map[lead.status] ?? 0) + 1;
    });
    return map;
  }, [leads]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, location, WhatsApp, email…"
          className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-solar-400 focus:ring-4 focus:ring-solar-400/15"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
        >
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value}>
              {label(value)} {counts[value] ? `(${counts[value]})` : ""}
            </option>
          ))}
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
        >
          <option value="all">All channels</option>
          <option value="web_form">Web form</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <span className="text-xs text-slate-500">
          {loading ? "Loading…" : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Leads table, scroll horizontally on small screens">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Segment</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Grid</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="transition hover:bg-solar-50/50">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-navy-900">{lead.contactName}</p>
                    <p className="text-xs text-slate-500">{lead.contactWhatsapp}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {propertyLabel(lead.propertyType)}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{lead.location}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {lead.energyUsageKwh ? `${Number(lead.energyUsageKwh).toFixed(0)} kWh` : "—"}
                    {lead.monthlyBillPhp ? (
                      <span className="block text-[11px] text-slate-400">
                        ₱{Number(lead.monthlyBillPhp).toLocaleString("en-PH")}/mo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5 text-xs capitalize text-slate-600">
                    {label(lead.gridState)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-20 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-1.5 rounded-full bg-gradient-to-r from-solar-300 to-solar-500"
                          style={{ width: `${lead.leadScore}%` }}
                        />
                      </span>
                      <span className="text-xs font-bold text-navy-900">{lead.leadScore}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        lead.sourceChannel === "whatsapp"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {label(lead.sourceChannel)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={lead.status}
                      onChange={(e) => changeStatus(lead, e.target.value)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        STATUS_STYLES[lead.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {LEAD_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {label(value)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => openLead(lead)}
                      className="rounded-full border border-slate-300 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:border-solar-400 hover:bg-solar-50"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-500">
                    No leads match those filters yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <h3 className="text-lg font-bold text-navy-900">{active.contactName}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {propertyLabel(active.propertyType)} · {active.location} ·{" "}
                  {gridLabel(active.gridState)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {active.contactWhatsapp}
                  {active.contactEmail ? ` · ${active.contactEmail}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-6">
              {active.notes ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{active.notes}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={generateProposal}
                  disabled={generating}
                  className="rounded-full bg-solar-400 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300 disabled:opacity-60"
                >
                  {generating ? "Agent working…" : "Generate AI proposal + ROI"}
                </button>
                <a
                  href={`https://wa.me/${active.contactWhatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-slate-50"
                >
                  Reply on WhatsApp
                </a>
              </div>

              {agentNote ? (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">{agentNote}</p>
              ) : null}

              {proposals.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No proposals yet. Run the agent to build a grounded proposal with ROI.
                </p>
              ) : (
                proposals.map((proposal) => (
                  <article key={proposal.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-solar-700">
                        {proposal.summary}
                      </p>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        {proposal.engine} · {proposal.model} ·{" "}
                        {new Date(proposal.createdAt).toLocaleString("en-PH")}
                      </span>
                    </div>
                    <div
                      className="proposal-body mt-3 text-sm text-slate-700"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(proposal.content) }}
                    />
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
