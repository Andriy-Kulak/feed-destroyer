# Feed Destroyer

A tiny always-on Chrome extension that hides distracting surfaces on YouTube and X.

![Feed Destroyer icon](src/icons/icon-128.png)

## What it does

- YouTube: hides home/browse feeds, recommendations, Shorts entry points, comments, live chat, end-screen cards, mixes, and merch/fundraiser-style panels while keeping direct video watching, search, subscriptions, and channels usable.
- X: keeps the `For you` tab visible, but hides the Home timeline contents when `For you` is active. `Following` remains usable.
- Popup: shows a short always-on status message with no toggles or selections.

## Setup

```bash
npm install
npm run build
```

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select this project folder.

Run `npm run build` again after changing TypeScript or CSS, then reload the extension from `chrome://extensions`.

## Checks

```bash
npm run check
```

This runs TypeScript validation and rebuilds the extension files in `dist/`.
