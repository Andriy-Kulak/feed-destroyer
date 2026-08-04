const POPUP_FOCUS_TARGET_KEY = "focusTarget";
const POPUP_HIDE_X_FOR_YOU_KEY = "hideXForYou";
const POPUP_DEFAULT_FOCUS_TARGET = "10K MRR for my apps";
const POPUP_DEFAULT_HIDE_X_FOR_YOU = true;

const input = document.querySelector<HTMLInputElement>("#focusTarget");
const hideXForYouSwitch = document.querySelector<HTMLInputElement>("#hideXForYou");
const statusMessage = document.querySelector<HTMLElement>("#preferenceStatus");

let persistedHideXForYou = POPUP_DEFAULT_HIDE_X_FOR_YOU;

function reportPopupError(message: string, error: unknown): void {
  console.error(`[feed-destroyer] ${message}`, error);
  showStatusMessage(message);
}

function showStatusMessage(message: string): void {
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.hidden = false;
}

function clearStatusMessage(): void {
  if (!statusMessage) return;

  statusMessage.textContent = "";
  statusMessage.hidden = true;
}

function applyPreferences(values: Record<string, ChromeStorageValue>): void {
  if (input) {
    const storedFocusTarget = values[POPUP_FOCUS_TARGET_KEY];
    input.value =
      typeof storedFocusTarget === "string" && storedFocusTarget
        ? storedFocusTarget
        : POPUP_DEFAULT_FOCUS_TARGET;
  }

  persistedHideXForYou = values[POPUP_HIDE_X_FOR_YOU_KEY] !== false;

  if (hideXForYouSwitch) {
    hideXForYouSwitch.checked = persistedHideXForYou;
  }
}

async function loadPopupPreferences(): Promise<void> {
  if (!input || !hideXForYouSwitch) {
    reportPopupError(
      "Feed Destroyer could not find its controls.",
      new Error("missing #focusTarget or #hideXForYou element")
    );
  }

  try {
    const values = await chrome.storage.local.get({
      [POPUP_FOCUS_TARGET_KEY]: POPUP_DEFAULT_FOCUS_TARGET,
      [POPUP_HIDE_X_FOR_YOU_KEY]: POPUP_DEFAULT_HIDE_X_FOR_YOU
    });

    applyPreferences(values);
  } catch (error) {
    applyPreferences({
      [POPUP_FOCUS_TARGET_KEY]: POPUP_DEFAULT_FOCUS_TARGET,
      [POPUP_HIDE_X_FOR_YOU_KEY]: POPUP_DEFAULT_HIDE_X_FOR_YOU
    });
    reportPopupError("Could not load your saved settings. Showing defaults.", error);
  }
}

async function saveFocusTarget(value: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [POPUP_FOCUS_TARGET_KEY]: value });
    clearStatusMessage();
  } catch (error) {
    reportPopupError("Could not save your focus target.", error);
  }
}

async function saveHideXForYou(next: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ [POPUP_HIDE_X_FOR_YOU_KEY]: next });
    persistedHideXForYou = next;
    clearStatusMessage();
  } catch (error) {
    if (hideXForYouSwitch) {
      hideXForYouSwitch.checked = persistedHideXForYou;
    }

    reportPopupError('Could not save the X "For you" setting.', error);
  }
}

function listenForPopupChanges(): void {
  input?.addEventListener("input", () => {
    void saveFocusTarget(input.value.trim());
  });

  hideXForYouSwitch?.addEventListener("change", () => {
    void saveHideXForYou(hideXForYouSwitch.checked);
  });
}

loadPopupPreferences().catch((error: unknown) => {
  reportPopupError("Could not load your saved settings. Showing defaults.", error);
});
listenForPopupChanges();
