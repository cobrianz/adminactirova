"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Panel, Spinner } from "@/components/ui";
import { useAuth } from "@/components/AuthContext";
import CuratedTable from "@/components/CuratedTable";
import { formatDateTime } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

type Settings = {
  aiProvider: string;
  aiFeatureProviders?: Record<string, string>;
  aiModels?: Record<string, string>;
};

const AI_PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI (api.openai.com)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openrouter", label: "OpenRouter (openrouter.ai)" },
];

const AI_FEATURE_ROWS: { key: string; label: string }[] = [
  { key: "chat", label: "AI Chat & Chat with PDF" },
  { key: "reports", label: "Reports & Essays" },
  { key: "career", label: "Career Growth" },
  { key: "courses", label: "Course Generation" },
  { key: "quizzes", label: "Tests, Quizzes & Exams" },
  { key: "flashcards", label: "Flashcards" },
  { key: "study_plans", label: "Study Plans & Learning Paths" },
  { key: "explore", label: "Explore & Recommendations" },
  { key: "classrooms", label: "Classrooms" },
  { key: "blog", label: "Blog Generator" },
];

const AI_MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
  anthropic: ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"],
  openrouter: ["openai/gpt-4o-mini", "openai/gpt-4o", "openrouter/auto"],
};

export default function ApiUsagePage() {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.adminLevel === "superadmin";
  const { data, loading, refetch } = useApi<{ settings: Settings }>("/api/admin/settings");
  const [form, setForm] = useState<Settings | null>(null);
  const [hydratedFrom, setHydratedFrom] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  // Hydrate the editable form from the fetched settings once, without an
  // effect — React's "adjust state during render" pattern.
  if (data?.settings && data.settings !== hydratedFrom) {
    setHydratedFrom(data.settings);
    setForm(data.settings);
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setFeatureProvider = (feature: string, provider: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            aiFeatureProviders: { ...(prev.aiFeatureProviders || {}), [feature]: provider },
          }
        : prev
    );
  };

  const setModel = (provider: string, model: string) => {
    setForm((prev) =>
      prev ? { ...prev, aiModels: { ...(prev.aiModels || {}), [provider]: model } } : prev
    );
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiCall("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success("AI settings saved");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="API Usage"
        subtitle="AI provider management and tracked API usage"
        actions={
          isSuperAdmin && (
            <button onClick={handleSave} disabled={saving || loading} className="btn-modal btn-modal-save inline-flex items-center gap-2">
              {saving ? <Spinner className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              Save changes
            </button>
          )
        }
      />

      {!isSuperAdmin && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--orange-dim)", border: "1px solid var(--orange)", color: "var(--ink2)" }}>
          You&apos;re signed in as a standard admin — AI settings are read-only for you.
        </div>
      )}

      {loading || !form ? (
        <div className="mb-6 flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="mb-6 space-y-6">
          <Panel
            title="AI provider"
            subtitle="Which backend powers chat, courses, quizzes and reports"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Provider</label>
                <select
                  className="form-select w-full"
                  value={form.aiProvider || "openai"}
                  disabled={!isSuperAdmin}
                  onChange={(e) => set("aiProvider", e.target.value)}
                >
                  {AI_PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-ink3">
                  Takes effect within ~30 seconds — no restart. If the chosen provider is
                  unavailable (missing key, out of quota, errors), the main app automatically falls
                  back to the other providers in order: OpenAI → Anthropic → OpenRouter.
                </p>
              </div>
            </div>
          </Panel>

          <Panel
            title="AI provider per feature"
            subtitle="Override the global provider for specific parts of the app"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {AI_FEATURE_ROWS.map((row) => (
                <div key={row.key}>
                  <label className="form-label">{row.label}</label>
                  <select
                    className="form-select w-full"
                    value={form.aiFeatureProviders?.[row.key] || ""}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setFeatureProvider(row.key, e.target.value)}
                  >
                    <option value="">Use global default</option>
                    {AI_PROVIDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink3">
              Example: set Reports &amp; Essays to Anthropic while Chat stays on OpenAI.
            </p>
          </Panel>

          <Panel
            title="Models"
            subtitle="Pin each provider to a specific model — keeps costs predictable"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {AI_PROVIDER_OPTIONS.map((opt) => (
                <div key={opt.value}>
                  <label className="form-label">{opt.label}</label>
                  <input
                    className="form-input w-full"
                    list={`ai-models-${opt.value}`}
                    value={form.aiModels?.[opt.value] || ""}
                    disabled={!isSuperAdmin}
                    placeholder={
                      opt.value === "anthropic"
                        ? "claude-haiku-5-5"
                        : opt.value === "openrouter"
                          ? "openai/gpt-4o-mini"
                          : "gpt-4o-mini"
                    }
                    onChange={(e) => setModel(opt.value, e.target.value)}
                  />
                  <datalist id={`ai-models-${opt.value}`}>
                    {(AI_MODEL_SUGGESTIONS[opt.value] || []).map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink3">
              The model set here is used for every request on that provider, overriding the default
              model requested by the app. Current defaults are the cheapest options (
              <code>gpt-4o-mini</code>, <code>claude-haiku-5-5</code>,{" "}
              <code>openai/gpt-4o-mini</code>). Clear a field to fall back to the app&apos;s default
              model for that provider.
            </p>
          </Panel>
        </div>
      )}

      <PageHeader title="Usage log" subtitle="Read-only log of tracked API/feature usage" />
      <CuratedTable
        collection="api_usage"
        readOnly
        searchFields={["feature", "userId"]}
        searchPlaceholder="Search by feature or user…"
        emptyTitle="No usage records found"
        emptySubtitle="This collection is populated as users interact with metered features."
        columns={[
          { key: "feature", label: "Feature" },
          { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
          { key: "count", label: "Count", mono: true },
          { key: "createdAt", label: "Recorded", mono: true, render: (r: Row) => formatDateTime(r.createdAt) },
        ]}
      />
    </div>
  );
}
