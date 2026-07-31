import { MongoClient, type Db } from "mongodb";

const MONGODB_URI: string = process.env.MONGODB_URI || "";
const MONGODB_DB_NAME: string = process.env.MONGODB_DB_NAME || "";

if (!MONGODB_URI) throw new Error("Please define the MONGODB_URI environment variable");
if (!MONGODB_DB_NAME) throw new Error("Please define the MONGODB_DB_NAME environment variable");

declare global {
  var __adminMongo: { client: MongoClient; promise: Promise<MongoClient> } | undefined;
}
let cached = global.__adminMongo;

if (!cached) {
  cached = global.__adminMongo = {
    client: undefined as unknown as MongoClient,
    promise: undefined as unknown as Promise<MongoClient>,
  };
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cached!.client) return { client: cached!.client, db: cached!.client.db(MONGODB_DB_NAME) };

  if (!cached!.promise) {
    cached!.promise = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
    }).connect();
  }

  cached!.client = await cached!.promise;
  return { client: cached!.client, db: cached!.client.db(MONGODB_DB_NAME) };
}
