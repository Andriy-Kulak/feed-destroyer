import assert from "node:assert/strict";
import test from "node:test";

import { loadSource } from "./support/load-source.mjs";
import {
  createChromeStorage,
  createDocument,
  createLocation,
  createTab,
  FakeElement
} from "./support/dom-stubs.mjs";

const EXPOSED = [
  "getSite",
  "getYouTubeView",
  "getElementText",
  "getXFeed",
  "shouldShowFocusCard",
  "getFocusCardMount",
  "refreshState",
  "renderFocusCard",
  "loadPreferences",
  "listenForPreferenceChanges",
  ["readState", "() => ({ focusTarget, hideXForYou, pendingRefresh })"]
];

// Loads a fresh instance of the content-script logic with controllable
// browser globals so each test starts from a clean module state.
async function loadContent({ url = "https://www.youtube.com/", storage = {}, selectors = {}, tabs = [] } = {}) {
  const chrome = createChromeStorage(storage);
  const document = createDocument({ selectors, tabs });
  const window = {
    location: createLocation(url),
    addEventListener() {},
    // Run scheduled refreshes synchronously so assertions can observe results.
    requestAnimationFrame(callback) {
      callback();
      return 0;
    },
    setTimeout(callback) {
      callback();
      return 0;
    }
  };

  const api = await loadSource("src/content.ts", {
    globals: {
      window,
      document,
      chrome,
      history: {},
      MutationObserver: class {
        observe() {}
      },
      requestAnimationFrame: window.requestAnimationFrame,
      setTimeout: window.setTimeout
    },
    expose: EXPOSED,
    stripTrailing: ["void initialize();"]
  });

  return { api, chrome, document, window, ROOT: document.documentElement };
}

test("getSite maps hostnames to the supported sites", async () => {
  const cases = [
    ["https://youtube.com/", "youtube"],
    ["https://www.youtube.com/", "youtube"],
    ["https://m.youtube.com/", "youtube"],
    ["https://x.com/home", "x"],
    ["https://twitter.com/home", "x"],
    ["https://www.x.com/home", "x"],
    ["https://example.com/", "other"]
  ];

  for (const [url, expected] of cases) {
    const { api } = await loadContent({ url });
    assert.equal(api.getSite(), expected, `expected ${url} to resolve to ${expected}`);
  }
});

test("getYouTubeView classifies routes", async () => {
  const cases = [
    ["/", "home"],
    ["/feed/explore", "home"],
    ["/feed/trending", "home"],
    ["/watch", "watch"],
    ["/shorts/abc123", "shorts"],
    ["/results", "search"],
    ["/feed/subscriptions", "subscriptions"],
    ["/@handle", "channel"],
    ["/channel/UC123", "channel"],
    ["/c/SomeChannel", "channel"],
    ["/user/legacy", "channel"],
    ["/playlist", "other"]
  ];

  for (const [pathname, expected] of cases) {
    const { api } = await loadContent({ url: `https://www.youtube.com${pathname}` });
    assert.equal(api.getYouTubeView(), expected, `expected ${pathname} to be ${expected}`);
  }
});

test("getElementText normalizes whitespace, trims, and lowercases", async () => {
  const { api } = await loadContent();

  assert.equal(api.getElementText(null), "");
  assert.equal(api.getElementText(undefined), "");
  assert.equal(api.getElementText({ textContent: "  For\n  You  " }), "for you");
  assert.equal(api.getElementText({ textContent: "FOLLOWING" }), "following");
});

test("getXFeed reads the selected X home tab", async () => {
  const forYou = await loadContent({
    url: "https://x.com/home",
    tabs: [createTab("For you"), createTab("Following", { selected: false })]
  });
  assert.equal(forYou.api.getXFeed(), "for-you");

  const following = await loadContent({
    url: "https://x.com/home",
    tabs: [createTab("For you", { selected: false }), createTab("Following")]
  });
  assert.equal(following.api.getXFeed(), "following");

  const noHomeTab = await loadContent({
    url: "https://x.com/home",
    tabs: [createTab("Grok")]
  });
  assert.equal(noHomeTab.api.getXFeed(), "other");

  const offHome = await loadContent({
    url: "https://x.com/explore",
    tabs: [createTab("For you")]
  });
  assert.equal(offHome.api.getXFeed(), "other", "feed is only detected on /home");
});

test("shouldShowFocusCard only triggers on YouTube home and X for-you", async () => {
  const ytHome = await loadContent({ url: "https://www.youtube.com/" });
  assert.equal(ytHome.api.shouldShowFocusCard(), true);

  const ytWatch = await loadContent({ url: "https://www.youtube.com/watch" });
  assert.equal(ytWatch.api.shouldShowFocusCard(), false);

  const xForYou = await loadContent({
    url: "https://x.com/home",
    tabs: [createTab("For you")]
  });
  assert.equal(xForYou.api.shouldShowFocusCard(), true);

  const xFollowing = await loadContent({
    url: "https://x.com/home",
    tabs: [createTab("Following")]
  });
  assert.equal(xFollowing.api.shouldShowFocusCard(), false);

  const other = await loadContent({ url: "https://example.com/" });
  assert.equal(other.api.shouldShowFocusCard(), false);
});

test("refreshState writes YouTube state markers to the root element", async () => {
  const { api, ROOT } = await loadContent({ url: "https://www.youtube.com/watch" });

  api.refreshState();

  assert.equal(ROOT.dataset.focusAppSite, "youtube");
  assert.equal(ROOT.dataset.focusAppYoutubeView, "watch");
  assert.equal(ROOT.classList.contains("focus-app"), true);
  assert.equal(ROOT.classList.contains("focus-app-youtube"), true);
  assert.equal(ROOT.classList.contains("focus-app-x"), false);
  assert.equal("focusAppXFeed" in ROOT.dataset, false);
  assert.equal("focusAppHideXForYou" in ROOT.dataset, false);
});

test("refreshState writes X state markers and clears them off-site", async () => {
  const onX = await loadContent({
    url: "https://x.com/home",
    tabs: [createTab("For you")]
  });
  onX.api.refreshState();

  assert.equal(onX.ROOT.dataset.focusAppSite, "x");
  assert.equal(onX.ROOT.dataset.focusAppXFeed, "for-you");
  assert.equal(onX.ROOT.dataset.focusAppHideXForYou, "true");
  assert.equal(onX.ROOT.classList.contains("focus-app-x"), true);
  assert.equal("focusAppYoutubeView" in onX.ROOT.dataset, false);

  const elsewhere = await loadContent({ url: "https://example.com/" });
  elsewhere.api.refreshState();
  assert.equal(elsewhere.ROOT.dataset.focusAppSite, "other");
  assert.equal(elsewhere.ROOT.classList.contains("focus-app"), false);
  assert.equal("focusAppYoutubeView" in elsewhere.ROOT.dataset, false);
  assert.equal("focusAppXFeed" in elsewhere.ROOT.dataset, false);
});

test("loadPreferences applies stored values and falls back to defaults", async () => {
  const stored = await loadContent({
    storage: { focusTarget: "ship the release", hideXForYou: false }
  });
  await stored.api.loadPreferences();
  assert.deepEqual(stored.api.readState(), {
    focusTarget: "ship the release",
    hideXForYou: false,
    pendingRefresh: false
  });

  const empty = await loadContent({ storage: { focusTarget: "" } });
  await empty.api.loadPreferences();
  assert.equal(empty.api.readState().focusTarget, "10K MRR for my apps");
  assert.equal(empty.api.readState().hideXForYou, true, "missing value keeps the default-on state");

  const nonString = await loadContent({ storage: { focusTarget: 123 } });
  await nonString.api.loadPreferences();
  assert.equal(nonString.api.readState().focusTarget, "10K MRR for my apps");
});

test("renderFocusCard mounts the focus card once with the focus target text", async () => {
  const mount = new FakeElement({ tag: "ytd-app" });
  const { api, document } = await loadContent({
    url: "https://www.youtube.com/",
    storage: { focusTarget: "10K MRR for my apps" },
    selectors: {
      'ytd-browse[page-subtype="home"] #primary': mount
    }
  });

  await api.loadPreferences();
  api.renderFocusCard();

  const card = document.getElementById("feed-destroyer-focus-card");
  assert.ok(card, "the focus card should be created");
  assert.equal(card.parentElement, mount);

  const target = card.querySelector(".feed-destroyer-focus-target");
  assert.equal(target.textContent, "10K MRR for my apps");

  // Re-rendering must reuse the same card rather than stacking duplicates.
  api.renderFocusCard();
  assert.equal(
    document.__created.filter((el) => el.id === "feed-destroyer-focus-card").length,
    1
  );
});

test("renderFocusCard removes the card when the view no longer qualifies", async () => {
  const mount = new FakeElement({ tag: "ytd-app" });
  const { api, document, window } = await loadContent({
    url: "https://www.youtube.com/",
    selectors: { 'ytd-browse[page-subtype="home"] #primary': mount }
  });

  api.renderFocusCard();
  assert.ok(document.getElementById("feed-destroyer-focus-card"));

  // Client-side navigation to a watch page should tear the card down.
  window.location = createLocation("https://www.youtube.com/watch");
  api.renderFocusCard();
  assert.equal(document.getElementById("feed-destroyer-focus-card"), null);
});

test("the X focus card renders a working hide toggle wired to storage", async () => {
  const mount = new FakeElement({ tag: "main-timeline" });
  const { api, document, chrome } = await loadContent({
    url: "https://x.com/home",
    tabs: [createTab("For you")],
    storage: { hideXForYou: true },
    selectors: { 'main [aria-label="Home timeline"]': mount }
  });

  await api.loadPreferences();
  api.renderFocusCard();

  const card = document.getElementById("feed-destroyer-focus-card");
  const toggle = card.querySelector(".feed-destroyer-card-toggle");
  const hint = card.querySelector(".feed-destroyer-card-setting-hint");

  assert.equal(toggle.checked, true);
  assert.equal(hint.textContent, "Turn off to browse");

  // Simulate the user switching the feed back on.
  toggle.checked = false;
  toggle.dispatch("change");

  assert.equal(api.readState().hideXForYou, false);
  assert.equal(chrome.__store.hideXForYou, false, "the preference should persist to storage");
  assert.equal(hint.textContent, "Turn on to hide", "the hint should update after re-render");
});

test("listenForPreferenceChanges reacts to local storage updates", async () => {
  const { api, chrome, ROOT } = await loadContent({ url: "https://x.com/home", tabs: [createTab("For you")] });

  api.listenForPreferenceChanges();

  chrome.__emit({ focusTarget: { newValue: "new goal" } });
  assert.equal(api.readState().focusTarget, "new goal");

  chrome.__emit({ hideXForYou: { newValue: false } });
  assert.equal(api.readState().hideXForYou, false);

  // Updates in other storage areas must be ignored.
  chrome.__emit({ focusTarget: { newValue: "ignored" } }, "sync");
  assert.equal(api.readState().focusTarget, "new goal");

  // An emptied focus target should reset to the default.
  chrome.__emit({ focusTarget: { newValue: "" } });
  assert.equal(api.readState().focusTarget, "10K MRR for my apps");

  assert.equal(ROOT.dataset.focusAppSite, "x", "a change should trigger a refresh");
});
