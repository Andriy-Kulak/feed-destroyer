# Feed Destroyer Agent Instructions

This file is the canonical guide for future agents working on this reboot.

## Product Intent

Feed Destroyer is a small privacy-preserving Chrome extension for removing distracting web surfaces. Keep it simple, fast, local, and always-on unless the user explicitly asks for controls.

## Engineering Rules

- Prefer TypeScript for reusable logic.
- Keep Manifest V3 compatibility.
- Do not add tracking, analytics, telemetry, remote config, or network calls.
- Do not store browsing history or page content.
- Do not write, print, commit, or document real secrets.
- Do not reference private local paths in README, code, examples, or docs.
- Prefer robust CSS selectors and small DOM state detection over brittle click automation.
- Use MutationObserver only for lightweight state refreshes on SPA navigation or tab changes.
- Keep build output in `dist/`; do not hand-edit generated files.
- Keep the popup focused on the local focus-target input unless the user explicitly asks for more controls.
- The selected icon source is `src/icons/icon-source.png`; regenerate `icon-16.png`, `icon-32.png`, `icon-48.png`, and `icon-128.png` from that source.

## Current Behavior

- YouTube: hide feeds, recommendations, Shorts navigation entry points, comments, live chat, mixes, end-screen cards, and related distraction panels while preserving direct video and Shorts playback, search, subscriptions, and channel Shorts tabs.
- X: hide the Home timeline contents when `For you` is active by default, keep the hide/show switch visible in a compact control bar when the feed is shown, and leave `Following` usable.
- Popup: store the local focus target and X `For you` visibility preference with `chrome.storage.local`.

## Pull Request Heartbeat

- When a pull request has a Cursor Bugbot check, automatically start a review heartbeat after every push.
- Keep monitoring the exact latest head commit until CI and Cursor Bugbot both reach terminal states. Do not treat a pending Bugbot check as approval.
- After Bugbot finishes, perform a thread-aware review scan. Fix every actionable finding, add regression coverage, push the fixes, reply with the fix commit and validation, resolve addressed threads, and restart the heartbeat for the new head commit.
- Do not report the pull request as fully approved while checks are pending or failing, actionable findings remain, or review threads are unresolved.
- The heartbeat is complete only when the latest head commit is mergeable, CI passes, Cursor Bugbot passes, and the thread-aware scan reports zero unresolved review threads.

## Verification

Run:

```bash
npm run check
```

This runs static contracts and headless browser tests against the built extension. Also load the project folder through `chrome://extensions` for a quick live-site smoke test when selectors or visible behavior change.
