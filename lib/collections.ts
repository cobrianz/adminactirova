export type CollectionMeta = {
  label: string;
  readOnly?: boolean;
  /**
   * Restricts write access (create/update/delete) through the generic
   * collection browser to superadmins — for collections that control
   * platform-wide behavior or expose sensitive financial/config data,
   * mirroring the tiering already enforced on users/admins/settings
   * elsewhere in the app.
   */
  superAdminOnly?: boolean;
  defaultFields?: string[];
  fieldTypes?: Record<string, "string" | "number" | "boolean" | "json">;
};

// Note: admin accounts are managed via the dedicated /admin/admins page and
// /api/admin/admins routes (backed by users.role === "admin"), not through
// this generic collection browser — there is no separate "admins" collection.
export const COLLECTIONS: Record<string, CollectionMeta> = {
  ai_conversations: { label: "AI Conversations" },
  api_usage: { label: "API Usage", readOnly: true },
  assignments: { label: "Assignments", defaultFields: ["title", "course"] },
  cardSets: { label: "Card Sets", defaultFields: ["title"] },
  careerhistories: { label: "Career Histories" },
  certificates: { label: "Certificates", defaultFields: ["title", "userId"] },
  chats: { label: "AI Chats", defaultFields: ["title"] },
  classroommessages: { label: "Classroom Messages" },
  classrooms: { label: "Classrooms", defaultFields: ["name"] },
  coursematerials: { label: "Course Materials", defaultFields: ["title", "course"] },
  coursenotes: { label: "Course Notes" },
  course_notes: { label: "Course Notes (API)" },
  discussions: { label: "Discussions", defaultFields: ["title"] },
  discussionposts: { label: "Discussion Posts" },
  email_templates: { label: "Email Templates", defaultFields: ["name", "subject", "body"], superAdminOnly: true },
  enrollments: { label: "Enrollments" },
  explore_category_courses: { label: "Explore Category Courses" },
  explore_trending: { label: "Explore Trending" },
  notifications: { label: "Notifications", defaultFields: ["title", "userId"] },
  pdfchats: { label: "PDF Chats" },
  pdfdocuments: { label: "PDF Documents", defaultFields: ["title", "userId"] },
  personalizeddiscoveries: { label: "Personalized Discoveries" },
  popular_topics: { label: "Popular Topics", defaultFields: ["title"] },
  premium_courses: { label: "Premium Courses" },
  premium_generation_intents: { label: "Premium Generation Intents", superAdminOnly: true },
  premium_trending_courses: { label: "Premium Trending Courses" },
  settings: { label: "Settings", superAdminOnly: true },
  shared_plans: { label: "Shared Plans" },
  studentprogresses: { label: "Student Progress" },
  tests: { label: "Tests", defaultFields: ["title"] },
  trendingcareers: {
    label: "Trending Careers",
    defaultFields: ["trendingCareers", "userId"],
    fieldTypes: { trendingCareers: "json", userId: "string" },
  },
  user_notes: { label: "User Notes" },
};
