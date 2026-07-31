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
const manifest = JSON.parse(
  await readFile(new URL("../manifest.json", import.meta.url), "utf8")
);
const newTabHtml = await readFile(
  new URL("../src/newtab/newtab.html", import.meta.url),
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

test("manifest wires local activity tracking and the custom new-tab page", () => {
  assert.deepEqual(manifest.permissions, ["idle", "storage"]);
  assert.equal(manifest.background.service_worker, "dist/background.js");
  assert.equal(manifest.background.type, "module");
  assert.equal(manifest.chrome_url_overrides.newtab, "dist/newtab.html");

  assert.equal(
    manifest.permissions.includes("history") || manifest.permissions.includes("tabs"),
    false,
    "aggregate tracking should not request browsing-history or broad tab access"
  );
});

test("new-tab page is fully local and exposes the goal and daily totals", () => {
  assert.match(newTabHtml, /id="goal"/);
  assert.match(newTabHtml, /id="xTime"/);
  assert.match(newTabHtml, /id="youtubeTime"/);
  assert.doesNotMatch(
    newTabHtml,
    /(?:src|href)="https?:\/\//,
    "new-tab assets must stay packaged with the extension"
  );
});
