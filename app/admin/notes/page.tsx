"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function NotesPage() {
  return (
    <div>
      <PageHeader title="Notes" subtitle="Manage user notes." />
      <CollectionTabs
        tabs={[
          { key: "user_notes", label: "User Notes" },
          { key: "course_notes", label: "Course Notes (API)" },
        ]}
      />
    </div>
  );
}
