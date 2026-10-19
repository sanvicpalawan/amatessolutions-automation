import AutomationConsole from "@/components/admin/AutomationConsole";
import BotKnowledge from "@/components/admin/BotKnowledge";
import PageHeader from "@/components/admin/PageHeader";
import { listRules, recentLog } from "@/lib/automation";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const [rules, log] = await Promise.all([listRules(), recentLog(40)]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Automation"
        title="Automations"
        description="Everything the system does for you without being asked — intake pipeline, follow-ups and fleet health."
      />
      <AutomationConsole
        initialRules={rules as never}
        initialLog={log as never}
      />

      <div className="mt-8">
        <BotKnowledge />
      </div>
    </div>
  );
}
