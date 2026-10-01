import "server-only";
import mongoose from "mongoose";

type ConnectionCache = {
  promise: Promise<typeof mongoose> | null;
};

const globalForMongo = globalThis as typeof globalThis & {
  bizflowMongo?: ConnectionCache;
};

const cache = globalForMongo.bizflowMongo ?? { promise: null };
globalForMongo.bizflowMongo = cache;

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from the environment.");
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        dbName: "bizflow",
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      })
      .catch((error: unknown) => {
        cache.promise = null;
        throw error;
      });
  }

  return cache.promise;
}
