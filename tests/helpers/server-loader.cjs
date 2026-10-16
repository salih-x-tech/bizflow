/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test loader for server TypeScript. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Each loader has its own module cache, so AppError identities and model exports
// remain consistent across the real services loaded by one test fixture.
function createServerLoader({ doubles = {}, env = {} } = {}) {
  const root = path.resolve(__dirname, "../..");
  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(root, file);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Test module must stay inside the repository.");
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const loaded = { exports: {} };
    cache.set(resolved, loaded);
    const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    function dependency(name) {
      if (name === "server-only") return {};
      if (Object.hasOwn(doubles, name)) return doubles[name];
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`);
      return require(name);
    }
    vm.runInNewContext(code, {
      require: dependency, module: loaded, exports: loaded.exports,
      Date, URL, URLSearchParams, Buffer, TextEncoder, TextDecoder, Request, Response, Headers,
      process: { env },
    }, { filename: resolved });
    return loaded.exports;
  }
  return load;
}

module.exports = { createServerLoader };
