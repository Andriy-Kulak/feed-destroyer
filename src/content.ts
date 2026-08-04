const ROOT = document.documentElement;
const FOCUS_CARD_ID = "feed-destroyer-focus-card";
const HIDE_X_FOR_YOU_LABEL = 'Hide X "For you" feed';

type Site = "youtube" | "x" | "other";
type YouTubeView = "home" | "watch" | "shorts" | "search" | "subscriptions" | "channel" | "other";
type XFeed = "for-you" | "following" | "other";

let pendingRefresh = false;
let focusTarget = DEFAULT_FOCUS_TARGET;
let hideXForYou = DEFAULT_HIDE_X_FOR_YOU;

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
    delete ROOT.dataset.focusAppHideXForYou;
  } else if (site === "x") {
    ROOT.dataset.focusAppXFeed = getXFeed();
    ROOT.dataset.focusAppHideXForYou = String(hideXForYou);
    delete ROOT.dataset.focusAppYoutubeView;
  } else {
    delete ROOT.dataset.focusAppYoutubeView;
    delete ROOT.dataset.focusAppXFeed;
    delete ROOT.dataset.focusAppHideXForYou;
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
    return getYouTubeView() === "home";
  }

  return getSite() === "x" && getXFeed() === "for-you";
}

function getFocusCardMount(): Element | null {
  if (getSite() === "youtube") {
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

  const card = createStyledElement("section", {
    attributes: { "aria-live": "polite" }
  });
  card.id = FOCUS_CARD_ID;

  const header = createStyledElement("div", {
    className: "feed-destroyer-focus-header"
  });

  const icon = createStyledElement("img", {
    className: "feed-destroyer-focus-icon",
    attributes: {
      src: chrome.runtime.getURL("dist/icons/icon-48.png"),
      alt: "",
      width: "48",
      height: "48"
    }
  });

  const copy = createStyledElement("div", {
    className: "feed-destroyer-focus-copy"
  });

  const eyebrow = createStyledElement("p", {
    className: "feed-destroyer-focus-eyebrow",
    text: "Feed destroyed"
  });

  const title = createStyledElement("h2", {
    className: "feed-destroyer-focus-title",
    text: "Hey, remember what today is for."
  });

  const message = createStyledElement("p", {
    className: "feed-destroyer-focus-message"
  });

  const target = createStyledElement("strong", {
    className: "feed-destroyer-focus-target"
  });

  const footer = createStyledElement("p", {
    className: "feed-destroyer-focus-footer",
    text: "The feed can wait. Go make the number move."
  });

  message.append("You told me you are focusing on ");
  message.append(target);
  message.append(".");

  copy.append(eyebrow, title);
  header.append(icon, copy);
  card.append(header, message);

  if (getSite() === "x") {
    const setting = createStyledElement("label", {
      className: "feed-destroyer-card-setting"
    });

    const settingCopy = createStyledElement("span", {
      className: "feed-destroyer-card-setting-copy"
    });

    const settingLabel = createStyledElement("strong", {
      className: "feed-destroyer-card-setting-label",
      text: HIDE_X_FOR_YOU_LABEL
    });

    const settingHint = createStyledElement("span", {
      className: "feed-destroyer-card-setting-hint",
      text: "Turn off to browse"
    });

    const settingSwitch = createStyledElement("input", {
      className: "feed-destroyer-card-toggle",
      attributes: {
        type: "checkbox",
        role: "switch",
        "aria-label": HIDE_X_FOR_YOU_LABEL
      }
    });
    settingSwitch.checked = hideXForYou;
    settingSwitch.addEventListener("change", () => {
      hideXForYou = settingSwitch.checked;
      scheduleRefresh();
      saveHideXForYou(hideXForYou);
    });

    settingCopy.append(settingLabel, settingHint);
    setting.append(settingCopy, settingSwitch);
    card.append(setting);
  }

  card.append(footer);
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

  if (getSite() === "x") {
    card.dataset.xFeedHidden = String(hideXForYou);

    const settingSwitch = card.querySelector<HTMLInputElement>(
      ".feed-destroyer-card-toggle"
    );
    if (settingSwitch) {
      settingSwitch.checked = hideXForYou;
    }

    const settingHint = card.querySelector<HTMLElement>(
      ".feed-destroyer-card-setting-hint"
    );
    if (settingHint) {
      settingHint.textContent = hideXForYou ? "Turn off to browse" : "Turn on to hide";
    }
  }

  if (card.parentElement !== mount) {
    mount.prepend(card);
  }
}

async function loadPreferences(): Promise<void> {
  const preferences = await readPreferences();

  focusTarget = preferences.focusTarget;
  hideXForYou = preferences.hideXForYou;
}

function listenForPreferenceChanges(): void {
  watchPreferences((changed) => {
    if (changed.focusTarget !== undefined) {
      focusTarget = changed.focusTarget;
    }

    if (changed.hideXForYou !== undefined) {
      hideXForYou = changed.hideXForYou;
    }

    scheduleRefresh();
  });
}

async function initialize(): Promise<void> {
  await loadPreferences();
  refreshState();
  listenForPreferenceChanges();
  listenForRouteChanges();
  startObserver();
}

void initialize();
