import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { getSessionUser } from "@/lib/auth";
import { ensureSeedData } from "@/lib/seed";
import { ensureSiteDefaults } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/admin/login");
  await ensureSeedData();
  await ensureSiteDefaults();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 lg:flex-row">
      <AdminSidebar email={session.email} />
      <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-7 sm:py-8">{children}</main>
    </div>
  );
}
