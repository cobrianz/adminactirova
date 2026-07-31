export type CollectionMeta = {
  label: string;
  readOnly?: boolean;
  defaultFields?: string[];
  fieldTypes?: Record<string, "string" | "number" | "boolean" | "json">;
};

export const COLLECTIONS: Record<string, CollectionMeta> = {
  admins: { label: "Admins", defaultFields: ["email", "role"] },
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
  email_templates: { label: "Email Templates", defaultFields: ["name", "subject", "body"] },
  enrollments: { label: "Enrollments" },
  explore_category_courses: { label: "Explore Category Courses" },
  explore_trending: { label: "Explore Trending" },
  notifications: { label: "Notifications", defaultFields: ["title", "userId"] },
  pdfchats: { label: "PDF Chats" },
  pdfdocuments: { label: "PDF Documents", defaultFields: ["title", "userId"] },
  personalizeddiscoveries: { label: "Personalized Discoveries" },
  popular_topics: { label: "Popular Topics", defaultFields: ["title"] },
  premium_courses: { label: "Premium Courses" },
  premium_generation_intents: { label: "Premium Generation Intents" },
  premium_trending_courses: { label: "Premium Trending Courses" },
  settings: { label: "Settings" },
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
