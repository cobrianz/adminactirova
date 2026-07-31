"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function ChatsPage() {
  return (
    <div>
      <PageHeader title="AI Chats" subtitle="Manage AI chat sessions and conversations." />
      <CollectionTabs
        tabs={[
          { key: "chats", label: "Chats" },
          { key: "ai_conversations", label: "AI Conversations" },
        ]}
      />
    </div>
  );
}
