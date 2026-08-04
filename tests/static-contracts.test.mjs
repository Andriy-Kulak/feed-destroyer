import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ciWorkflow = await readFile(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8"
);
const popupHtml = await readFile(
  new URL("../src/popup/popup.html", import.meta.url),
  "utf8"
);
const manifestJson = await readFile(
  new URL("../manifest.json", import.meta.url),
  "utf8"
);
const contentTs = await readFile(new URL("../src/content.ts", import.meta.url), "utf8");
const popupTs = await readFile(new URL("../src/popup/popup.ts", import.meta.url), "utf8");

test("CI can upload Playwright failure artifacts", () => {
  const permissions = ciWorkflow.match(/^permissions:\n((?: {2}.+\n)+)/m)?.[1] ?? "";

  assert.match(
    permissions,
    /^ {2}actions: write$/m,
    "the GitHub token needs actions: write for failure artifact uploads"
  );
});

test("popup renders the default X hiding state before preferences hydrate", () => {
  assert.match(
    popupHtml,
    /<input(?=[^>]*\bid="hideXForYou")(?=[^>]*\bchecked\b)[^>]*>/s,
    "the switch markup should match the default-on preference before JavaScript loads"
  );
});

test("extension pages declare a strict content security policy", () => {
  const manifest = JSON.parse(manifestJson);
  const extensionPages = manifest.content_security_policy?.extension_pages ?? "";

  assert.match(extensionPages, /script-src 'self'/, "extension pages must only run bundled scripts");
  assert.match(extensionPages, /object-src 'self'/, "extension pages must not embed remote objects");
});

test("extension requests no host or broad permissions", () => {
  const manifest = JSON.parse(manifestJson);

  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.host_permissions, undefined);
});

test("stored focus targets are sanitized and length bounded before rendering", () => {
  for (const source of [contentTs, popupTs]) {
    assert.match(source, /\\p\{Cc\}\\p\{Cf\}/, "control and format characters must be stripped");
    assert.match(source, /slice\(0, [A-Z_]*MAX_FOCUS_TARGET_LENGTH\)/, "focus target must be length bounded");
  }
});
