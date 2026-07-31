"use client";

import React from "react";
import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function TemplatesPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Templates" subtitle="Reusable email and notice templates used across the platform" />
      <CollectionTabs
        tabs={[
          {
            key: "email_templates",
            label: "Email Templates",
            defaultFields: ["name", "key", "subject", "body", "active"],
          },
          {
            key: "site_notices",
            label: "Notice Templates",
            defaultFields: ["key", "title", "message", "variant", "active", "priority"],
          },
        ]}
      />
    </div>
  );
}
