#!/usr/bin/env node
/**
 * Seeds (or promotes) the admin user for the Actirova admin dashboard.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *   node scripts/seed-admin.mjs admin@actirova.com "SuperSecret123!"
 *
 * Environment variables (in .env.local or process env):
 *   MONGODB_URI, MONGODB_DB_NAME, ADMIN_EMAIL, ADMIN_PASSWORD,
 *   ADMIN_FIRST_NAME, ADMIN_LAST_NAME
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = { ...process.env };
  try {
    const text = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in env)) env[key] = value;
    }
  } catch {
    // .env.local missing — fall back to process env only
  }
  return env;
}

const env = loadEnv();
const MONGODB_URI = env.MONGODB_URI;
const MONGODB_DB_NAME = env.MONGODB_DB_NAME || "actinova-ai-tutor";

const ADMIN_EMAIL = (process.argv[2] || env.ADMIN_EMAIL || "admin@actirova.com").toLowerCase().trim();
const ADMIN_PASSWORD = process.argv[3] || env.ADMIN_PASSWORD || "ActirovaAdmin2026!";
const FIRST_NAME = env.ADMIN_FIRST_NAME || "Actirova";
const LAST_NAME = env.ADMIN_LAST_NAME || "Admin";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required. Add it to .env.local or set the environment variable.");
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 8) {
  console.error("Password must be at least 8 characters long.");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

try {
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  const users = db.collection("users");

  const existing = await users.findOne({ email: ADMIN_EMAIL });
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const now = new Date();

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          password: hashedPassword,
          role: "admin",
          status: "active",
          emailVerified: true,
          firstName: existing.firstName || FIRST_NAME,
          lastName: existing.lastName || LAST_NAME,
          onboardingCompleted: true,
          lastPasswordChange: now,
          updatedAt: now,
        },
      }
    );
    console.log(`Updated existing user "${ADMIN_EMAIL}" as an active admin.`);
  } else {
    await users.insertOne({
      firstName: FIRST_NAME,
      lastName: LAST_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      status: "active",
      emailVerified: true,
      onboardingCompleted: true,
      credits: 0,
      xp: 0,
      level: 1,
      streak: { current: 0, longest: 0, lastActiveDate: null, activeDates: [] },
      usage: {},
      settings: {
        notifications: { email: true, push: false, marketing: false, courseUpdates: true },
        privacy: { profileVisible: true, progressVisible: false, achievementsVisible: true },
        preferences: { theme: "light", language: "en", difficulty: "advanced", learningStyle: "visual", dailyGoal: 30 },
      },
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created admin user "${ADMIN_EMAIL}".`);
  }

  console.log("\nAdmin sign-in details:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Login:    http://localhost:<admin-port>/login`);
  console.log("\nChange the password after first login.");
} finally {
  await client.close();
}
