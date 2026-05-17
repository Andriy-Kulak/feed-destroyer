const ROOT = document.documentElement;
const FOCUS_CARD_ID = "feed-destroyer-focus-card";
const CONTENT_FOCUS_TARGET_KEY = "focusTarget";
const DEFAULT_FOCUS_TARGET = "10K MRR for my apps";

type Site = "youtube" | "x" | "other";
type YouTubeView = "home" | "watch" | "shorts" | "search" | "subscriptions" | "channel" | "other";
type XFeed = "for-you" | "following" | "other";

let pendingRefresh = false;
let focusTarget = DEFAULT_FOCUS_TARGET;

function getSite(): Site {
  const host = window.location.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    return "youtube";
  }

  if (host === "x.com" || host === "twitter.com") {
    return "x";
  }

  return "other";
}

function getYouTubeView(): YouTubeView {
  const path = window.location.pathname;

  if (path === "/" || path === "/feed/explore" || path === "/feed/trending") return "home";
  if (path === "/watch") return "watch";
  if (path.startsWith("/shorts")) return "shorts";
  if (path === "/results") return "search";
  if (path === "/feed/subscriptions") return "subscriptions";
  if (path.startsWith("/@") || path.startsWith("/channel/") || path.startsWith("/c/") || path.startsWith("/user/")) {
    return "channel";
  }

  return "other";
}

function getElementText(element: Element | null | undefined): string {
  return element?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function getXFeed(): XFeed {
  if (window.location.pathname !== "/home") return "other";

  const selectedTabs = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]'));
  const selectedHomeTab = selectedTabs.find((tab) => {
    const text = getElementText(tab);
    return text === "for you" || text === "following";
  });

  const selectedText = getElementText(selectedHomeTab);
  if (selectedText === "for you") return "for-you";
  if (selectedText === "following") return "following";

  return "other";
}

function refreshState(): void {
  const site = getSite();

  ROOT.dataset.focusAppSite = site;
  ROOT.classList.toggle("focus-app", site !== "other");
  ROOT.classList.toggle("focus-app-youtube", site === "youtube");
  ROOT.classList.toggle("focus-app-x", site === "x");

  if (site === "youtube") {
    ROOT.dataset.focusAppYoutubeView = getYouTubeView();
    delete ROOT.dataset.focusAppXFeed;
  } else if (site === "x") {
    ROOT.dataset.focusAppXFeed = getXFeed();
    delete ROOT.dataset.focusAppYoutubeView;
  } else {
    delete ROOT.dataset.focusAppYoutubeView;
    delete ROOT.dataset.focusAppXFeed;
  }

  renderFocusCard();
}

function scheduleRefresh(): void {
  if (pendingRefresh) return;

  pendingRefresh = true;
  window.requestAnimationFrame(() => {
    pendingRefresh = false;
    refreshState();
  });
}

function listenForRouteChanges(): void {
  const notify = () => {
    window.setTimeout(scheduleRefresh, 0);
  };

  const wrapHistoryMethod = (method: "pushState" | "replaceState") => {
    const original = history[method];

    history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      notify();
      return result;
    };
  };

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", notify);
  window.addEventListener("yt-navigate-finish", notify);
}

function startObserver(): void {
  const observer = new MutationObserver(scheduleRefresh);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-selected", "data-testid", "role"]
  });
}

function shouldShowFocusCard(): boolean {
  if (getSite() === "youtube") {
    return getYouTubeView() === "home" || getYouTubeView() === "shorts";
  }

  return getSite() === "x" && getXFeed() === "for-you";
}

function getFocusCardMount(): Element | null {
  if (getSite() === "youtube") {
    if (getYouTubeView() === "shorts") {
      return document.querySelector("ytd-app");
    }

    return (
      document.querySelector('ytd-browse[page-subtype="home"] #primary') ??
      document.querySelector('ytd-browse[page-subtype="home"]') ??
      document.querySelector("ytd-app")
    );
  }

  if (getSite() === "x") {
    return (
      document.querySelector('main [aria-label="Home timeline"]') ??
      document.querySelector('main [aria-label="Timeline: Your Home Timeline"]') ??
      document.querySelector("main")
    );
  }

  return null;
}

function getOrCreateFocusCard(): HTMLElement {
  const existing = document.getElementById(FOCUS_CARD_ID);
  if (existing) return existing;

  const card = document.createElement("section");
  card.id = FOCUS_CARD_ID;
  card.setAttribute("aria-live", "polite");

  const header = document.createElement("div");
  header.className = "feed-destroyer-focus-header";

  const icon = document.createElement("img");
  icon.className = "feed-destroyer-focus-icon";
  icon.src = chrome.runtime.getURL("dist/icons/icon-48.png");
  icon.alt = "";
  icon.width = 48;
  icon.height = 48;

  const copy = document.createElement("div");
  copy.className = "feed-destroyer-focus-copy";

  const eyebrow = document.createElement("p");
  eyebrow.className = "feed-destroyer-focus-eyebrow";
  eyebrow.textContent = "Feed destroyed";

  const title = document.createElement("h2");
  title.className = "feed-destroyer-focus-title";
  title.textContent = "Hey, remember what today is for.";

  const message = document.createElement("p");
  message.className = "feed-destroyer-focus-message";

  const target = document.createElement("strong");
  target.className = "feed-destroyer-focus-target";

  const footer = document.createElement("p");
  footer.className = "feed-destroyer-focus-footer";
  footer.textContent = "The feed can wait. Go make the number move.";

  message.append("You told me you are focusing on ");
  message.append(target);
  message.append(".");

  copy.append(eyebrow, title);
  header.append(icon, copy);
  card.append(header, message, footer);
  return card;
}

function renderFocusCard(): void {
  const existing = document.getElementById(FOCUS_CARD_ID);

  if (!shouldShowFocusCard()) {
    existing?.remove();
    return;
  }

  const mount = getFocusCardMount();
  if (!mount) return;

  const card = getOrCreateFocusCard();
  const target = card.querySelector<HTMLElement>(".feed-destroyer-focus-target");
  if (target) {
    target.textContent = focusTarget || DEFAULT_FOCUS_TARGET;
  }

  if (card.parentElement !== mount) {
    mount.prepend(card);
  }
}

async function loadFocusTarget(): Promise<void> {
  const values = await chrome.storage.local.get({
    [CONTENT_FOCUS_TARGET_KEY]: DEFAULT_FOCUS_TARGET
  });

  focusTarget = values[CONTENT_FOCUS_TARGET_KEY] || DEFAULT_FOCUS_TARGET;
  scheduleRefresh();
}

function listenForFocusTargetChanges(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[CONTENT_FOCUS_TARGET_KEY]) return;

    focusTarget = changes[CONTENT_FOCUS_TARGET_KEY].newValue || DEFAULT_FOCUS_TARGET;
    scheduleRefresh();
  });
}

refreshState();
void loadFocusTarget();
listenForFocusTargetChanges();
listenForRouteChanges();
startObserver();
