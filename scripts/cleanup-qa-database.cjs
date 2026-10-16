/* eslint-disable @typescript-eslint/no-require-imports -- Recovery for this suite's disposable fixtures only. */
const mongoose = require("mongoose");

async function main() {
  const name = process.argv[2];
  if (!/^bizflow_qa_\d+_[a-f0-9]{12}$/.test(name || "")) throw new Error("An exact generated QA database name is required.");
  require("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  await mongoose.connect(process.env.MONGODB_URI, { dbName: name, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 5000, autoIndex: false, autoCreate: false });
  if (mongoose.connection.name !== name) throw new Error("Refusing to clean a different database.");
  const db = mongoose.connection.db;
  const users = await db.collection("users").find({}, { projection: { email: 1, name: 1 } }).toArray();
  const expectedUsers = new Set(["owner-a@qa.invalid", "owner-b@qa.invalid", "staff@qa.invalid"]);
  if (users.some(user => !expectedUsers.has(user.email) || !user.name.startsWith("QA "))) throw new Error("Unexpected users found; cleanup refused.");
  const businesses = await db.collection("businesses").find({}, { projection: { name: 1 } }).toArray();
  if (businesses.some(business => !["QA Tenant A", "QA Tenant B"].includes(business.name))) throw new Error("Unexpected businesses found; cleanup refused.");
  // Scope is the exact previously created QA database, verified above. Never use
  // this against the application database or remove its records.
  let deleted = 0;
  for (const collection of await db.collections()) {
    deleted += (await collection.deleteMany({})).deletedCount;
    if (await collection.countDocuments({}) !== 0) throw new Error("QA cleanup verification failed.");
  }
  console.log(`QA recovery cleanup: ${deleted} fixture documents removed; all collections verified empty.`);
}

main().catch(() => {
  console.error("QA recovery cleanup failed; connection details withheld.");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
