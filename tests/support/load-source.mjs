// Loads an extension TypeScript source file, strips its types with the
// TypeScript compiler that already ships as a devDependency, and evaluates it
// with injected browser globals so the *real* logic can be unit tested.
//
// The content and popup scripts are plain (non-module) Chrome scripts, so they
// cannot be `import`ed directly. Rather than fork the logic into a copy that
// could drift, we compile the actual source and expose the declarations we want
// to assert against. This keeps `src/` as the single source of truth.

import { readFile } from "node:fs/promises";
import ts from "typescript";

const GLOBAL_NAMES = [
  "window",
  "document",
  "chrome",
  "history",
  "MutationObserver",
  "requestAnimationFrame",
  "setTimeout",
  "URL"
];

export async function loadSource(relativePath, { globals = {}, expose = [], stripTrailing = [] } = {}) {
  const source = await readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");

  let js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None
    }
  }).outputText;

  for (const trailing of stripTrailing) {
    if (!js.includes(trailing)) {
      throw new Error(`Expected to find trailing statement to strip: ${trailing}`);
    }
    js = js.replace(trailing, "");
  }

  const entries = expose.map((entry) =>
    Array.isArray(entry) ? `${entry[0]}: (${entry[1]})` : `${entry}: ${entry}`
  );
  const returnObject = entries.length ? `return { ${entries.join(", ")} };` : "return {};";

  const factory = new Function(...GLOBAL_NAMES, `${js}\n${returnObject}`);

  const resolvedGlobals = GLOBAL_NAMES.map((name) => {
    if (name in globals) return globals[name];
    if (name === "URL") return URL;
    if (name === "setTimeout") return globals.setTimeout ?? (() => 0);
    return undefined;
  });

  return factory(...resolvedGlobals);
}
