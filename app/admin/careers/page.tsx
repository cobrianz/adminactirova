"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function CareersPage() {
  return (
    <div>
      <PageHeader title="Careers" subtitle="Manage trending careers and career histories." />
      <CollectionTabs
        tabs={[
          { key: "trendingcareers", label: "Trending Careers" },
          { key: "careerhistories", label: "Career Histories" },
        ]}
      />
    </div>
  );
}
