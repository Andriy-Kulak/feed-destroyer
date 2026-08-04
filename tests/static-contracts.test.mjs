import assert from "node:assert/strict";
import test from "node:test";
import { readProjectFile } from "./read-project-file.mjs";

const ciWorkflow = await readProjectFile(".github/workflows/ci.yml");
const popupHtml = await readProjectFile("src/popup/popup.html");
const manifest = JSON.parse(await readProjectFile("manifest.json"));

const SHARED_SCRIPTS = ["dist/preferences.js", "dist/dom.js"];

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

test("shared scripts load before the entry points that depend on them", () => {
  for (const contentScript of manifest.content_scripts) {
    assert.deepEqual(
      contentScript.js.slice(0, SHARED_SCRIPTS.length),
      SHARED_SCRIPTS,
      "shared globals must run before dist/content.js"
    );
  }

  assert.ok(
    popupHtml.indexOf('src="preferences.js"') < popupHtml.indexOf('src="popup.js"'),
    "the popup must load shared preference helpers before popup.js"
  );
});
