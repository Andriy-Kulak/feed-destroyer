import { expect, openFixturePage, test } from "./fixtures";

const youtubeHomeFixture = `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <ytd-app>
      <ytd-browse page-subtype="home">
        <div id="primary">
          <ytd-rich-grid-renderer data-testid="home-feed">
            Distracting home feed
          </ytd-rich-grid-renderer>
        </div>
      </ytd-browse>
    </ytd-app>
  </body>
</html>`;

const youtubeWatchFixture = `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <ytd-app>
      <ytd-watch-flexy>
        <div id="columns">
          <div id="secondary">
            <plasmo-csui id="fake-extension" data-testid="viewstats">
              Viewstats Pro
            </plasmo-csui>
            <div id="secondary-inner">
              <div id="panels">
                <ytd-engagement-panel-section-list-renderer
                  target-id="PAyouchat"
                  data-testid="gemini"
                >
                  Ask about this video
                </ytd-engagement-panel-section-list-renderer>
              </div>
              <div id="related" data-testid="recommendations">
                <ytd-watch-next-secondary-results-renderer>
                  Native recommendations
                </ytd-watch-next-secondary-results-renderer>
              </div>
            </div>
          </div>
        </div>
      </ytd-watch-flexy>
    </ytd-app>
  </body>
</html>`;

const youtubeShortFixture = `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <ytd-app>
      <ytd-shorts data-testid="shorts-player">
        <ytd-reel-video-renderer>
          Direct Short
        </ytd-reel-video-renderer>
      </ytd-shorts>
    </ytd-app>
  </body>
</html>`;

const youtubeChannelShortsFixture = `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <ytd-app>
      <ytd-guide-entry-renderer data-testid="shorts-nav">
        <a href="/shorts">Shorts</a>
      </ytd-guide-entry-renderer>
      <ytd-browse>
        <ytd-rich-grid-renderer data-testid="channel-shorts-grid">
          <ytd-rich-item-renderer>
            <a href="/shorts/test-short">Channel Short</a>
          </ytd-rich-item-renderer>
        </ytd-rich-grid-renderer>
      </ytd-browse>
    </ytd-app>
  </body>
</html>`;

const youtubeUsefulPageFixture = `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <ytd-app>
      <main data-testid="useful-content">Useful YouTube content</main>
    </ytd-app>
  </body>
</html>`;

function xTimelineFixture(selectedTab: "For you" | "Following"): string {
  const forYouSelected = selectedTab === "For you";

  return `<!doctype html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <div role="tab" aria-selected="${forYouSelected}">For you</div>
    <div role="tab" aria-selected="${!forYouSelected}">Following</div>
    <main>
      <div aria-label="Home timeline">
        <div data-testid="cellInnerDiv">
          <article data-testid="timeline-post">Distracting post</article>
        </div>
      </div>
    </main>
  </body>
</html>`;
}

function xTimelineHydrationFixture(): string {
  return xTimelineFixture("For you").replace(
    "<body>",
    `<body>
    <script>
      window.xHideStateTransitions = [];
      const recordXHideState = () => {
        window.xHideStateTransitions.push(
          document.documentElement.getAttribute("data-focus-app-hide-x-for-you")
        );
      };
      recordXHideState();
      new MutationObserver(recordXHideState).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-focus-app-hide-x-for-you"]
      });
    </script>`
  );
}

test("replaces the YouTube home feed with the focus card", async ({ context }) => {
  const page = await openFixturePage(context, "https://www.youtube.com/", youtubeHomeFixture);

  await expect(page.locator("html")).toHaveAttribute("data-focus-app-youtube-view", "home");
  await expect(page.getByTestId("home-feed")).toBeHidden();
  await expect(page.locator("#feed-destroyer-focus-card")).toBeVisible();
});

test("hides watch recommendations without hiding Gemini or Viewstats", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://www.youtube.com/watch?v=test-video",
    youtubeWatchFixture
  );

  await expect(page.locator("html")).toHaveAttribute("data-focus-app-youtube-view", "watch");
  await expect(page.getByTestId("recommendations")).toBeHidden();
  await expect(page.getByTestId("gemini")).toBeVisible();
  await expect(page.getByTestId("viewstats")).toBeVisible();
  await expect(page.locator("#secondary")).toBeVisible();
});

test("allows intentional direct Shorts playback", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://www.youtube.com/shorts/test-short",
    youtubeShortFixture
  );

  await expect(page.locator("html")).toHaveAttribute("data-focus-app-youtube-view", "shorts");
  await expect(page.getByTestId("shorts-player")).toBeVisible();
  await expect(page.locator("#feed-destroyer-focus-card")).toHaveCount(0);
});

test("allows channel Shorts while hiding the Shorts navigation entry", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://www.youtube.com/@espn/shorts",
    youtubeChannelShortsFixture
  );

  await expect(page.locator("html")).toHaveAttribute("data-focus-app-youtube-view", "channel");
  await expect(page.getByTestId("channel-shorts-grid")).toBeVisible();
  await expect(page.getByTestId("shorts-nav")).toBeHidden();
  await expect(page.locator("#feed-destroyer-focus-card")).toHaveCount(0);
});

test("keeps search, subscriptions, and channel pages usable", async ({ context }) => {
  const usefulPages = [
    ["https://www.youtube.com/results?search_query=tai+chi", "search"],
    ["https://www.youtube.com/feed/subscriptions", "subscriptions"],
    ["https://www.youtube.com/@espn/videos", "channel"]
  ] as const;

  for (const [url, expectedView] of usefulPages) {
    const page = await openFixturePage(context, url, youtubeUsefulPageFixture);

    await expect(page.locator("html")).toHaveAttribute(
      "data-focus-app-youtube-view",
      expectedView
    );
    await expect(page.getByTestId("useful-content")).toBeVisible();
    await expect(page.locator("#feed-destroyer-focus-card")).toHaveCount(0);

    await page.close();
  }
});

test("replaces the X For you timeline with the focus card", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://x.com/home",
    xTimelineFixture("For you")
  );

  await expect(page.locator("html")).toHaveAttribute("data-focus-app-x-feed", "for-you");
  await expect(page.getByTestId("timeline-post")).toBeHidden();
  await expect(page.locator("#feed-destroyer-focus-card")).toBeVisible();
});

test("honors a saved visible X feed before the first content render", async ({ context }) => {
  const bootstrapPage = await openFixturePage(
    context,
    "https://www.youtube.com/",
    youtubeHomeFixture
  );
  const iconSource = await bootstrapPage
    .locator("#feed-destroyer-focus-card .feed-destroyer-focus-icon")
    .getAttribute("src");

  expect(iconSource).not.toBeNull();

  const extensionUrl = new URL(iconSource!);
  const extensionOrigin = `${extensionUrl.protocol}//${extensionUrl.host}`;
  const popup = await context.newPage();
  await popup.goto(`${extensionOrigin}/dist/popup.html`);
  await popup
    .getByRole("switch", { name: 'Hide X "For you" feed' })
    .uncheck();

  const page = await openFixturePage(
    context,
    "https://x.com/home",
    xTimelineHydrationFixture()
  );

  await expect(page.getByTestId("timeline-post")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-focus-app-hide-x-for-you",
    "false"
  );

  const transitions = await page.evaluate(
    () => Reflect.get(window, "xHideStateTransitions") as Array<string | null>
  );
  expect(transitions).not.toContain("true");
});

test("keeps the X feed switch available after showing the timeline", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://x.com/home",
    xTimelineFixture("For you")
  );
  const focusCard = page.locator("#feed-destroyer-focus-card");
  const hideForYouSwitch = focusCard.getByRole("switch", {
    name: 'Hide X "For you" feed'
  });

  await expect(hideForYouSwitch).toBeChecked();
  await hideForYouSwitch.uncheck();
  await expect(page.getByTestId("timeline-post")).toBeVisible();
  await expect(focusCard).toBeVisible();
  await expect(hideForYouSwitch).not.toBeChecked();

  await hideForYouSwitch.check();
  await expect(page.getByTestId("timeline-post")).toBeHidden();
  await expect(focusCard).toBeVisible();
});

test("can show and hide the X For you timeline from the popup", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://x.com/home",
    xTimelineFixture("For you")
  );
  const iconSource = await page
    .locator("#feed-destroyer-focus-card .feed-destroyer-focus-icon")
    .getAttribute("src");

  expect(iconSource).not.toBeNull();

  const extensionUrl = new URL(iconSource!);
  const extensionOrigin = `${extensionUrl.protocol}//${extensionUrl.host}`;
  const popup = await context.newPage();
  await popup.goto(`${extensionOrigin}/dist/popup.html`);

  const hideForYouSwitch = popup.getByRole("switch", {
    name: 'Hide X "For you" feed'
  });

  await expect(hideForYouSwitch).toBeChecked();
  await hideForYouSwitch.uncheck();
  await expect(page.getByTestId("timeline-post")).toBeVisible();
  await expect(page.locator("#feed-destroyer-focus-card")).toBeVisible();
  await expect(
    page
      .locator("#feed-destroyer-focus-card")
      .getByRole("switch", { name: 'Hide X "For you" feed' })
  ).not.toBeChecked();

  await popup.reload();
  await expect(hideForYouSwitch).not.toBeChecked();

  await hideForYouSwitch.check();
  await expect(page.getByTestId("timeline-post")).toBeHidden();
  await expect(page.locator("#feed-destroyer-focus-card")).toBeVisible();
});

test("keeps the X Following timeline usable", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://x.com/home",
    xTimelineFixture("Following")
  );

  await expect(page.locator("html")).toHaveAttribute("data-focus-app-x-feed", "following");
  await expect(page.getByTestId("timeline-post")).toBeVisible();
  await expect(page.locator("#feed-destroyer-focus-card")).toHaveCount(0);
});

test("records focused YouTube time as a local daily aggregate", async ({ context }) => {
  const trackedPage = await openFixturePage(
    context,
    "https://www.youtube.com/",
    youtubeHomeFixture
  );

  await trackedPage.bringToFront();
  await trackedPage.waitForTimeout(300);
  await trackedPage.evaluate(() => window.dispatchEvent(new Event("blur")));

  const dashboard = await context.newPage();
  await dashboard.goto("chrome://newtab/");

  const storedActivity = async () =>
    dashboard.evaluate(async () => {
      const extensionChrome = Reflect.get(globalThis, "chrome") as {
        storage: {
          local: {
            get(defaults: Record<string, unknown>): Promise<Record<string, unknown>>;
          };
        };
      };
      const values = await extensionChrome.storage.local.get({ activityByDay: {} });
      const days = Object.values(
        values.activityByDay as Record<string, { x: number; youtube: number }>
      );
      return days.at(-1) ?? { x: 0, youtube: 0 };
    });

  await expect.poll(async () => (await storedActivity()).youtube).toBeGreaterThan(0);
  expect((await storedActivity()).x).toBe(0);
});

test("replaces Chrome new tab with the editable goal and local activity totals", async ({
  context
}) => {
  const focusPage = await openFixturePage(
    context,
    "https://www.youtube.com/",
    youtubeHomeFixture
  );
  const page = await context.newPage();
  await page.goto("chrome://newtab/");

  expect(page.url()).toMatch(/^chrome-extension:\/\//);
  await expect(page.getByRole("heading", { name: "What are you moving today?" })).toBeVisible();

  const day = await page.evaluate(() => {
    const date = new Date();
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dateOfMonth = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${dateOfMonth}`;
  });

  await page.evaluate(async ({ today }) => {
    const extensionChrome = Reflect.get(globalThis, "chrome") as {
      storage: {
        local: {
          set(values: Record<string, unknown>): Promise<void>;
        };
      };
    };

    await extensionChrome.storage.local.set({
      activityByDay: {
        [today]: {
          x: 90 * 60_000,
          youtube: 10 * 60_000
        }
      }
    });
  }, { today: day });

  await expect(page.getByLabel("X active time today")).toHaveText("1h 30m");
  await expect(page.getByLabel("YouTube active time today")).toHaveText("10m");

  await page.locator("#goal").fill("Ship the activity MVP");
  await expect(
    focusPage.locator("#feed-destroyer-focus-card .feed-destroyer-focus-target")
  ).toHaveText("Ship the activity MVP");
});
