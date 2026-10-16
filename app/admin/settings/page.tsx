"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Save, AlertTriangle } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Panel, Spinner } from "@/components/ui";
import { useAuth } from "@/components/AuthContext";

type Settings = {
  siteName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowSignups: boolean;
  featuredAnnouncement: string;
  aiProvider: string;
  aiFeatureProviders?: Record<string, string>;
  aiModels?: Record<string, string>;
};

export default function SettingsPage() {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.adminLevel === "superadmin";
  const { data, loading, refetch } = useApi<{ settings: Settings }>("/api/admin/settings");
  const [form, setForm] = useState<Settings | null>(null);
  const [hydratedFrom, setHydratedFrom] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  // Hydrate the editable form from the fetched settings once, without an
  // effect — this is React's recommended "adjust state during render"
  // pattern for mirroring async data into local editable state.
  if (data?.settings && data.settings !== hydratedFrom) {
    setHydratedFrom(data.settings);
    setForm(data.settings);
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
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
      toast.success("Settings saved");
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
        title="Settings"
        subtitle="Platform-wide configuration"
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
          You&apos;re signed in as a standard admin — settings are read-only for you.
        </div>
      )}

      {loading || !form ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <Panel title="Site" subtitle="Basic identity shown to visitors">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Site name</label>
                <input
                  className="form-input w-full"
                  value={form.siteName}
                  disabled={!isSuperAdmin}
                  onChange={(e) => set("siteName", e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Support email</label>
                <input
                  className="form-input w-full"
                  value={form.supportEmail}
                  disabled={!isSuperAdmin}
                  onChange={(e) => set("supportEmail", e.target.value)}
                  placeholder="support@actirova.com"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="form-label">Featured announcement</label>
              <input
                className="form-input w-full"
                value={form.featuredAnnouncement}
                disabled={!isSuperAdmin}
                onChange={(e) => set("featuredAnnouncement", e.target.value)}
                placeholder="Optional — shown as a site-wide banner when set"
              />
            </div>
          </Panel>

          <Panel title="Access" subtitle="Control who can reach the platform">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.allowSignups}
                disabled={!isSuperAdmin}
                onChange={(e) => set("allowSignups", e.target.checked)}
              />
              <span className="text-sm text-ink2">Allow new signups</span>
            </label>
          </Panel>

          <Panel
            title="Maintenance mode"
            subtitle="Temporarily block access for non-admins"
            actions={
              form.maintenanceMode ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--red)" }}>
                  <AlertTriangle className="h-3.5 w-3.5" /> Active
                </span>
              ) : undefined
            }
          >
            <label className="mb-4 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.maintenanceMode}
                disabled={!isSuperAdmin}
                onChange={(e) => set("maintenanceMode", e.target.checked)}
              />
              <span className="text-sm text-ink2">Enable maintenance mode</span>
            </label>
            <label className="form-label">Message shown to users</label>
            <textarea
              className="form-textarea w-full"
              rows={3}
              value={form.maintenanceMessage}
              disabled={!isSuperAdmin}
              onChange={(e) => set("maintenanceMessage", e.target.value)}
            />
          </Panel>

          <p className="text-xs text-ink3">
            AI provider, per-feature routing and model selection now live on the{" "}
            <a href="/admin/api-usage" className="underline">
              API Usage
            </a>{" "}
            page. These settings are stored for the platform to read; wiring a given setting into live
            product behavior (e.g. an actual maintenance-mode gate) requires the corresponding check
            to be added on the main app side.
          </p>
        </div>
      )}
    </div>
  );
}
