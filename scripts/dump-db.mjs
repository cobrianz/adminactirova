import { MongoClient } from "mongodb";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env.local") });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "actinova-ai-tutor";
const outDir = resolve(root, "db-dump");

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
try {
  await client.connect();
  const db = client.db(dbName);
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  mkdirSync(outDir, { recursive: true });
  console.log(`DB: ${dbName} — ${collections.length} collections\n`);

  const stats = [];
  for (const { name } of collections) {
    const coll = db.collection(name);
    const count = await coll.countDocuments();
    const docs = await coll.find({}).limit(2000).toArray();
    writeFileSync(resolve(outDir, `${name}.json`), JSON.stringify(docs, null, 2), "utf8");
    stats.push({ name, count, dumped: docs.length });
  }
  console.table(stats);
  console.log(`\nDumped to ${outDir}`);
} catch (err) {
  console.error("Dump failed:", err.message);
  process.exit(1);
} finally {
  await client.close();
}
