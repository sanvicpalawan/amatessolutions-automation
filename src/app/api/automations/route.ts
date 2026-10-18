import { getSessionUser } from "@/lib/auth";
import {
  RULES,
  ensureAutomationRules,
  listRules,
  recentLog,
  scheduledSweep,
  setRuleEnabled,
} from "@/lib/automation";

export const dynamic = "force-dynamic";

/** GET /api/automations — rules + recent activity. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [rules, log] = await Promise.all([listRules(), recentLog(30)]);
  return Response.json({ rules, log });
}

/** PUT /api/automations — toggle a rule: { key, enabled }. */
export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { key?: string; enabled?: boolean };
  const rule = RULES.find((item) => item.key === body.key);
  if (!rule) return Response.json({ error: "Unknown rule" }, { status: 422 });
  if (typeof body.enabled !== "boolean") {
    return Response.json({ error: "`enabled` must be a boolean" }, { status: 422 });
  }

  await setRuleEnabled(rule.key, body.enabled);
  const rules = await listRules();
  return Response.json({ ok: true, rules });
}

/** POST /api/automations — manually run the scheduled sweep. */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureAutomationRules();
  const result = await scheduledSweep();
  const log = await recentLog(30);
  return Response.json({ ok: true, ...result, log });
}
