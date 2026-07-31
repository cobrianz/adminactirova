"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function PremiumPage() {
  return (
    <div>
      <PageHeader title="Premium" subtitle="Manage premium courses, trending and generation intents." />
      <CollectionTabs
        tabs={[
          { key: "premium_courses", label: "Premium Courses" },
          { key: "premium_trending_courses", label: "Trending" },
          { key: "premium_generation_intents", label: "Generation Intents" },
        ]}
      />
    </div>
  );
}
