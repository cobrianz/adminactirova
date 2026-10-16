import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, forbidden, isSuperAdmin } from "@/lib/admin";
import { logAdminActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const SETTINGS_ID = "platform";

const DEFAULTS = {
  siteName: "Actirova AI Tutor",
  supportEmail: "",
  maintenanceMode: false,
  maintenanceMessage: "We're performing scheduled maintenance. Please check back shortly.",
  allowSignups: true,
  featuredAnnouncement: "",
  aiProvider: "openai",
  aiFeatureProviders: {} as Record<string, string>,
  aiModels: {
    openai: "gpt-4o-mini",
    anthropic: "claude-haiku-5-5",
    openrouter: "openai/gpt-4o-mini",
  } as Record<string, string>,
};

const AI_PROVIDERS = ["openai", "anthropic", "openrouter"];

// Must stay in sync with AI_FEATURES in the main app (src/app/lib/ai.js).
const AI_FEATURES = [
  "default",
  "chat",
  "reports",
  "career",
  "courses",
  "quizzes",
  "flashcards",
  "study_plans",
  "explore",
  "classrooms",
  "blog",
];

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const { db } = await connectToDatabase();
    const doc = await db.collection("settings").findOne({ key: SETTINGS_ID });
    return ok({ settings: { ...DEFAULTS, ...(doc || {}) } });
  } catch (error) {
    console.error("Admin settings fetch error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();
  if (!isSuperAdmin(admin)) return forbidden("Only super admins can change platform settings");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    if (updates.aiProvider !== undefined && !AI_PROVIDERS.includes(updates.aiProvider as string)) {
      return badRequest(`aiProvider must be one of: ${AI_PROVIDERS.join(", ")}`);
    }

    if (updates.aiFeatureProviders !== undefined) {
      const map = updates.aiFeatureProviders;
      if (!map || typeof map !== "object" || Array.isArray(map)) {
        return badRequest("aiFeatureProviders must be an object mapping feature to provider");
      }
      for (const [feature, provider] of Object.entries(map as Record<string, unknown>)) {
        if (!AI_FEATURES.includes(feature)) {
          return badRequest(`Unknown AI feature: ${feature}`);
        }
        if (provider !== "" && (typeof provider !== "string" || !AI_PROVIDERS.includes(provider))) {
          return badRequest(
            `Invalid provider for "${feature}": must be empty or one of ${AI_PROVIDERS.join(", ")}`
          );
        }
      }
    }

    if (updates.aiModels !== undefined) {
      const models = updates.aiModels;
      if (!models || typeof models !== "object" || Array.isArray(models)) {
        return badRequest("aiModels must be an object mapping provider to model id");
      }
      for (const [provider, model] of Object.entries(models as Record<string, unknown>)) {
        if (!AI_PROVIDERS.includes(provider)) {
          return badRequest(`Unknown AI provider: ${provider}`);
        }
        if (typeof model !== "string") {
          return badRequest(`Invalid model for "${provider}": must be a string`);
        }
      }
    }

    const { db } = await connectToDatabase();
    await db.collection("settings").updateOne(
      { key: SETTINGS_ID },
      { $set: { ...updates, updatedAt: new Date(), updatedBy: admin.email }, $setOnInsert: { key: SETTINGS_ID } },
      { upsert: true }
    );

    await logAdminActivity({
      admin,
      action: "update",
      resource: "settings",
      summary: "Updated platform settings",
      meta: updates,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin settings update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
