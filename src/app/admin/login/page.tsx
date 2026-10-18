import { redirect } from "next/navigation";

import Logo from "@/components/site/Logo";
import PasskeyForm from "@/components/admin/PasskeyForm";
import { passkeyStatus } from "@/lib/auth";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getSessionUser();
  if (session) redirect("/admin");

  const status = await passkeyStatus();

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 px-5 py-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 animate-sun rounded-full bg-solar-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="animate-rise relative w-full max-w-md">
        <div className="mb-7 flex items-center gap-3">
          <Logo size={40} className="shrink-0 text-white" squareClassName="fill-navy-950" />
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              Amates Solutions
            </p>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Backoffice access</p>
          </div>
        </div>

        <PasskeyForm
          length={status.length}
          locked={status.locked}
          retryAfterSeconds={status.retryAfterSeconds}
          attemptsLeft={status.attemptsLeft}
        />
      </div>
    </main>
  );
}
