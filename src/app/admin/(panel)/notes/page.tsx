import NotesBoard from "@/components/admin/NotesBoard";
import PageHeader from "@/components/admin/PageHeader";
import { listNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const notes = await listNotes();

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Shared workspace"
        title="David's Notes"
        description="Updates on the website and the solar business — notes, links and photos straight from your device. Your business partners see everything here and can comment on it."
      />
      <NotesBoard initialNotes={notes} ownerName="David" />
    </div>
  );
}
