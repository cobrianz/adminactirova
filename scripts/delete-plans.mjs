/**
 * Deletes all documents from the "plans" collection.
 * Usage: node scripts/delete-plans.mjs
 * Reads MONGODB_URI / MONGODB_DB_NAME from .env.local (or process env).
 */
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

function loadEnv(file) {
  const env = {};
  const txt = fs.readFileSync(file, "utf8");
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = {
  ...process.env,
  ...loadEnv(path.join(process.cwd(), ".env.local")),
};

const MONGODB_URI = env.MONGODB_URI;
const MONGODB_DB_NAME = env.MONGODB_DB_NAME;

if (!MONGODB_URI || !MONGODB_DB_NAME) {
  console.error("MONGODB_URI and MONGODB_DB_NAME are required.");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

try {
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  const coll = db.collection("plans");
  const before = await coll.countDocuments();
  const res = await coll.deleteMany({});
  console.log(`plans: deleted ${res.deletedCount} of ${before} documents`);
} finally {
  await client.close();
}
