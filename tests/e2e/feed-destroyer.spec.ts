import {
  expect,
  focusCard,
  hideXForYouSwitch,
  htmlFixture,
  openExtensionPopup,
  openFixturePage,
  test
} from "./fixtures";

const youtubeHomeFixture = htmlFixture(`    <ytd-app>
      <ytd-browse page-subtype="home">
        <div id="primary">
          <ytd-rich-grid-renderer data-testid="home-feed">
            Distracting home feed
          </ytd-rich-grid-renderer>
        </div>
      </ytd-browse>
    </ytd-app>`);

const youtubeWatchFixture = htmlFixture(`    <ytd-app>
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
    </ytd-app>`);

const youtubeShortFixture = htmlFixture(`    <ytd-app>
      <ytd-shorts data-testid="shorts-player">
        <ytd-reel-video-renderer>
          Direct Short
        </ytd-reel-video-renderer>
      </ytd-shorts>
    </ytd-app>`);

const youtubeChannelShortsFixture = htmlFixture(`    <ytd-app>
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
    </ytd-app>`);

const youtubeUsefulPageFixture = htmlFixture(`    <ytd-app>
      <main data-testid="useful-content">Useful YouTube content</main>
    </ytd-app>`);

function xTimelineFixture(selectedTab: "For you" | "Following"): string {
  const forYouSelected = selectedTab === "For you";

  return htmlFixture(`    <div role="tab" aria-selected="${forYouSelected}">For you</div>
    <div role="tab" aria-selected="${!forYouSelected}">Following</div>
    <main>
      <div aria-label="Home timeline">
        <div data-testid="cellInnerDiv">
          <article data-testid="timeline-post">Distracting post</article>
        </div>
      </div>
    </main>`);
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
  await expect(focusCard(page)).toBeVisible();
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
  await expect(focusCard(page)).toHaveCount(0);
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
  await expect(focusCard(page)).toHaveCount(0);
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
    await expect(focusCard(page)).toHaveCount(0);

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
  await expect(focusCard(page)).toBeVisible();
});

test("honors a saved visible X feed before the first content render", async ({ context }) => {
  const bootstrapPage = await openFixturePage(
    context,
    "https://www.youtube.com/",
    youtubeHomeFixture
  );
  const popup = await openExtensionPopup(context, bootstrapPage);
  await hideXForYouSwitch(popup).uncheck();

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
  const card = focusCard(page);
  const cardSwitch = hideXForYouSwitch(card);

  await expect(cardSwitch).toBeChecked();
  await cardSwitch.uncheck();
  await expect(page.getByTestId("timeline-post")).toBeVisible();
  await expect(card).toBeVisible();
  await expect(cardSwitch).not.toBeChecked();

  await cardSwitch.check();
  await expect(page.getByTestId("timeline-post")).toBeHidden();
  await expect(card).toBeVisible();
});

test("can show and hide the X For you timeline from the popup", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://x.com/home",
    xTimelineFixture("For you")
  );
  const popup = await openExtensionPopup(context, page);
  const popupSwitch = hideXForYouSwitch(popup);

  await expect(popupSwitch).toBeChecked();
  await popupSwitch.uncheck();
  await expect(page.getByTestId("timeline-post")).toBeVisible();
  await expect(focusCard(page)).toBeVisible();
  await expect(hideXForYouSwitch(focusCard(page))).not.toBeChecked();

  await popup.reload();
  await expect(popupSwitch).not.toBeChecked();

  await popupSwitch.check();
  await expect(page.getByTestId("timeline-post")).toBeHidden();
  await expect(focusCard(page)).toBeVisible();
});

test("keeps the X Following timeline usable", async ({ context }) => {
  const page = await openFixturePage(
    context,
    "https://x.com/home",
    xTimelineFixture("Following")
  );

  await expect(page.locator("html")).toHaveAttribute("data-focus-app-x-feed", "following");
  await expect(page.getByTestId("timeline-post")).toBeVisible();
  await expect(focusCard(page)).toHaveCount(0);
});
