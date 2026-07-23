import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const focusCss = await readFile(new URL("../src/focus.css", import.meta.url), "utf8");
const contentScript = await readFile(new URL("../src/content.ts", import.meta.url), "utf8");

function getHiddenSelectors(css) {
  const selectors = [];
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

  for (const match of cssWithoutComments.matchAll(rulePattern)) {
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
    hiddenSelectors.includes('html[data-focus-app-youtube-view="watch"] #related'),
    "the current watch-page recommendations container should be hidden"
  );
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

test("explicit Shorts pages and channel tabs remain usable", () => {
  const hiddenSelectors = getHiddenSelectors(focusCss);
  const explicitShortsContentSelectors = [
    'html[data-focus-app-youtube-view="shorts"] ytd-reel-video-renderer',
    'html[data-focus-app-youtube-view="shorts"] ytd-shorts',
    "ytd-reel-shelf-renderer",
    "ytd-rich-shelf-renderer[is-shorts]",
    'ytd-rich-item-renderer:has(a[href^="/shorts/"])',
    'ytd-video-renderer:has(a[href^="/shorts/"])',
    'ytd-grid-video-renderer:has(a[href^="/shorts/"])'
  ];

  for (const selector of explicitShortsContentSelectors) {
    assert.equal(
      hiddenSelectors.includes(selector),
      false,
      `${selector} should remain visible for intentional Shorts viewing`
    );
  }

  assert.ok(
    hiddenSelectors.includes('ytd-guide-entry-renderer:has(a[href^="/shorts"])'),
    "the distracting Shorts sidebar entry should stay hidden"
  );
  assert.doesNotMatch(
    contentScript,
    /getYouTubeView\(\) === "home" \|\| getYouTubeView\(\) === "shorts"/,
    "direct Shorts routes should not mount the feed-destroyed focus card"
  );
});
