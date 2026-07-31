"use client";

import React, { useState } from "react";
import DataSection from "@/components/DataSection";

type Tab = {
  key: string;
  label: string;
  readOnly?: boolean;
  defaultFields?: string[];
  filter?: { field: string; value: string };
};

export default function CollectionTabs({ tabs, defaultTab = 0 }: { tabs: Tab[]; defaultTab?: number }) {
  const [active, setActive] = useState(defaultTab);
  const tab = tabs[active];

  return (
    <div className="space-y-4">
      {tabs.length > 1 && (
        <div
          className="flex w-fit flex-wrap gap-1 rounded-xl p-1"
          style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
        >
          {tabs.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setActive(i)}
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={i === active ? { background: "var(--acid)", color: "var(--bg)" } : { color: "var(--ink2)" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {tab && (
        <DataSection
          key={tab.key}
          collection={tab.key}
          readOnly={tab.readOnly}
          defaultFields={tab.defaultFields}
          filter={tab.filter}
        />
      )}
    </div>
  );
}
