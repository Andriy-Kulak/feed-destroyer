import {
  chromium,
  test as base,
  type BrowserContext,
  type Page
} from "@playwright/test";
import { fileURLToPath } from "node:url";

const extensionPath = fileURLToPath(new URL("../..", import.meta.url));

export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use, testInfo) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true
    });

    try {
      await use(context);
    } finally {
      const failed = testInfo.status !== testInfo.expectedStatus;

      if (failed) {
        const pages = context.pages();

        for (const [index, page] of pages.entries()) {
          if (page.isClosed()) continue;

          await page.screenshot({
            path: testInfo.outputPath(`failure-${index + 1}.png`),
            fullPage: true
          });
        }

        await context.tracing.stop({
          path: testInfo.outputPath("trace.zip")
        });
      } else {
        await context.tracing.stop();
      }

      await context.close();
    }
  }
});

export async function openFixturePage(
  context: BrowserContext,
  url: string,
  body: string
): Promise<Page> {
  const fixtureUrl = new URL(url);

  await context.route(
    `${fixtureUrl.origin}/**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body
      }),
    { times: 1 }
  );

  const page = await context.newPage();
  await page.goto(url);
  return page;
}

export { expect } from "@playwright/test";
