"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function DiscussionsPage() {
  return (
    <div>
      <PageHeader title="Discussions" subtitle="Manage discussion threads and posts." />
      <CollectionTabs
        tabs={[
          { key: "discussions", label: "Discussions" },
          { key: "discussionposts", label: "Posts" },
        ]}
      />
    </div>
  );
}
