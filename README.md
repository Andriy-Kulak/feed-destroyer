# Feed Destroyer

A tiny always-on Chrome extension that hides distracting surfaces on YouTube and X.

![Feed Destroyer icon](src/icons/icon-128.png)

![Feed Destroyer replacing the YouTube home feed with a focus reminder](assets/screenshots/youtube-focus-card.png)

## What it does

- YouTube: hides home/browse feeds, recommendations, Shorts navigation entry points, comments, live chat, end-screen cards, mixes, and merch/fundraiser-style panels while keeping direct video and Shorts watching, search, subscriptions, and channel Shorts tabs usable.
- X: keeps the `For you` tab visible, but hides the Home timeline contents when `For you` is active. `Following` remains usable.
- Popup: lets you set a local focus target, then shows that reminder where the blocked feed used to be.

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

## Use

Click the Feed Destroyer toolbar icon to set what you are focusing on today.

Example:

```text
10K MRR for my apps
```

The extension stores this text locally in Chrome. When it destroys a feed, it replaces the feed area with a reminder card using your focus target.

To update the reminder, open the toolbar popup, edit the input, and refresh YouTube or X if the page does not update immediately.

## Checks

```bash
npm run check
```

This runs TypeScript validation and rebuilds the extension files in `dist/`.
