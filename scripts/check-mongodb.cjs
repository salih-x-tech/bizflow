/* eslint-disable @typescript-eslint/no-require-imports -- Standalone read-only Node diagnostic. */
const net = require("node:net");
const tls = require("node:tls");
const { Resolver } = require("node:dns/promises");
const mongoose = require("mongoose");
const ConnectionString = require("mongodb-connection-string-url").default;

// Never print error.message, a URI, a hostname, or any connection options.
function safeFailure(error) {
  const code = typeof error?.code === "string" && /^[A-Z0-9_]{1,70}$/.test(error.code) ? error.code : "UNAVAILABLE";
  return code;
}

function probe(endpoint, encrypted) {
  return new Promise((resolve) => {
    const options = { host: endpoint.name, port: endpoint.port };
    const socket = encrypted
      ? tls.connect({ ...options, servername: net.isIP(endpoint.name) ? undefined : endpoint.name, rejectUnauthorized: true })
      : net.createConnection(options);
    let finished = false;
    function finish(result) {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(result);
    }
    socket.setTimeout(5000, () => finish("TIMEOUT"));
    socket.once(encrypted ? "secureConnect" : "connect", () => finish("OK"));
    socket.once("error", error => finish(safeFailure(error)));
  });
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: node scripts/check-mongodb.cjs [--compare-dns]");
    console.log("Checks configured MongoDB DNS/TCP/TLS and performs a read-only ping. No records are created.");
    console.log("--compare-dns only compares SRV lookups using system, Cloudflare and Google DNS; it changes no settings.");
    return;
  }
  require("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  if (!process.env.MONGODB_URI) {
    console.log("Configuration: MONGODB_URI is missing");
    process.exitCode = 1;
    return;
  }
  let connection;
  try { connection = new ConnectionString(process.env.MONGODB_URI); }
  catch {
    console.log("Configuration: invalid MongoDB connection-string format (value withheld)");
    process.exitCode = 1;
    return;
  }
  console.log("Configuration: loaded (connection details hidden)");
  if (process.argv.includes("--compare-dns")) {
    if (!connection.isSRV) {
      console.log("DNS comparison: this configuration does not use SRV records");
      return;
    }
    console.log("DNS-only comparison: queries system DNS, Cloudflare and Google. No settings change or MongoDB login.");
    const results = await Promise.all([
      ["System", null], ["Cloudflare", "1.1.1.1"], ["Google", "8.8.8.8"],
    ].map(async ([label, server]) => {
      const resolver = new Resolver({ timeout: 5000, tries: 1 });
      if (server) resolver.setServers([server]);
      try {
        const records = await resolver.resolveSrv(`_mongodb._tcp.${connection.hosts[0]}`);
        console.log(`${label} DNS SRV: OK (${records.length} nodes)`);
        return true;
      } catch (error) {
        console.log(`${label} DNS SRV: ${safeFailure(error)}`);
        return false;
      }
    }));
    if (!results.some(Boolean)) process.exitCode = 1;
    return;
  }
  const encrypted = connection.searchParams.get("tls") !== "false" && connection.searchParams.get("ssl") !== "false" &&
    (connection.isSRV || connection.searchParams.get("tls") === "true" || connection.searchParams.get("ssl") === "true");
  let endpoints;
  if (connection.isSRV) {
    try {
      const resolver = new Resolver({ timeout: 5000, tries: 1 });
      endpoints = await resolver.resolveSrv(`_mongodb._tcp.${connection.hosts[0]}`);
      console.log(`DNS SRV: OK (${endpoints.length} nodes)`);
    } catch (error) {
      console.log(`DNS SRV: ${safeFailure(error)}`);
      process.exitCode = 1;
      return;
    }
  } else {
    endpoints = connection.hosts.map(host => {
      const parsed = new URL(`http://${host}`);
      return { name: parsed.hostname.replace(/^\[|\]$/g, ""), port: Number(parsed.port || 27017) };
    });
    console.log("DNS SRV: not used by this configuration");
  }
  await Promise.all(endpoints.slice(0, 5).map(async (endpoint, index) => {
    const tcp = await probe(endpoint, false);
    console.log(`Node ${index + 1} TCP: ${tcp}`);
    if (encrypted && tcp === "OK") console.log(`Node ${index + 1} TLS: ${await probe(endpoint, true)}`);
  }));
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "bizflow", serverSelectionTimeoutMS: 10000, connectTimeoutMS: 5000, autoIndex: false, autoCreate: false,
    });
    await mongoose.connection.db.command({ ping: 1 });
    console.log("MongoDB authenticated ping: OK");
  } catch (error) {
    const type = typeof error?.name === "string" && /^[A-Za-z]{1,60}$/.test(error.name) ? error.name : "Error";
    console.log(`MongoDB authenticated ping: FAILED (${type}; ${safeFailure(error)})`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(() => {
  console.log("Diagnostic could not finish; connection details withheld.");
  process.exitCode = 1;
});
