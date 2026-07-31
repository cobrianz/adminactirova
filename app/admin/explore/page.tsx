"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function ExplorePage() {
  return (
    <div>
      <PageHeader title="Explore Content" subtitle="Manage explore feeds, trending topics and discoveries." />
      <CollectionTabs
        tabs={[
          { key: "explore_category_courses", label: "Categories" },
          { key: "explore_trending", label: "Trending" },
          { key: "popular_topics", label: "Popular Topics" },
          { key: "personalizeddiscoveries", label: "Discoveries" },
        ]}
      />
    </div>
  );
}
