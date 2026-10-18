import { getSessionUser, loginWithPasskey, logout, passkeyStatus } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  return Response.json({ authenticated: Boolean(session), user: session });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { passkey?: string };

  if (!body.passkey) {
    return Response.json({ error: "Passkey is required" }, { status: 400 });
  }

  const result = await loginWithPasskey(body.passkey);
  if (!result.ok) {
    const status = await passkeyStatus();
    return Response.json({ error: result.error, locked: status.locked }, { status: 401 });
  }

  return Response.json({ ok: true, user: result.user });
}

export async function DELETE() {
  await logout();
  return Response.json({ ok: true });
}
