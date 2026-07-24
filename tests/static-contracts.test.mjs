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
