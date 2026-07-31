"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function CardSetsPage() {
  return (
    <div>
      <PageHeader title="Card Sets" subtitle="Manage flashcard sets." />
      <CollectionTabs tabs={[{ key: "cardSets", label: "Card Sets" }]} />
    </div>
  );
}
