const ROOT = document.documentElement;

type Site = "youtube" | "x" | "other";
type YouTubeView = "home" | "watch" | "shorts" | "search" | "subscriptions" | "channel" | "other";
type XFeed = "for-you" | "following" | "other";

let pendingRefresh = false;

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

refreshState();
listenForRouteChanges();
startObserver();
