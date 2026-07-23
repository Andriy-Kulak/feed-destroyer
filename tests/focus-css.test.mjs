import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const focusCss = await readFile(new URL("../src/focus.css", import.meta.url), "utf8");

function getHiddenSelectors(css) {
  const selectors = [];
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;

  for (const match of css.matchAll(rulePattern)) {
    const [, selectorList, declarations] = match;
    const hidesElement =
      /display\s*:\s*none\s*!important/.test(declarations) ||
      /display\s*:\s*var\(--focus-app-hide-display\)/.test(declarations);

    if (!hidesElement) continue;

    selectors.push(
      ...selectorList
        .split(",")
        .map((selector) => selector.replace(/\s+/g, " ").trim())
        .filter(Boolean)
    );
  }

  return selectors;
}

test("YouTube watch rules hide recommendations without hiding engagement panels", () => {
  const hiddenSelectors = getHiddenSelectors(focusCss);

  assert.ok(
    hiddenSelectors.includes("ytd-watch-next-secondary-results-renderer"),
    "the watch-next recommendation renderer should stay hidden"
  );
  assert.ok(
    hiddenSelectors.includes("ytd-compact-video-renderer"),
    "compact recommendation cards should stay hidden"
  );
  assert.equal(
    hiddenSelectors.some(
      (selector) => selector === "#secondary" || selector.endsWith(" #secondary")
    ),
    false,
    "the entire secondary column must remain visible because YouTube mounts Gemini Ask panels inside it"
  );
});
