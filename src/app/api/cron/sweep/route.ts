import { ensureAutomationRules, scheduledSweep } from "@/lib/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/cron/sweep
 * Intended to be called on a schedule by Vercel Cron (see vercel.json) or any
 * external scheduler. Protected by the CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  return runSweep(request);
}

export async function POST(request: Request) {
  return runSweep(request);
}

async function runSweep(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (secret && authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAutomationRules();
  const result = await scheduledSweep();
  return Response.json({ ok: true, ...result });
}
