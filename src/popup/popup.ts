const POPUP_FOCUS_TARGET_KEY = "focusTarget";
const POPUP_HIDE_X_FOR_YOU_KEY = "hideXForYou";
const POPUP_DEFAULT_FOCUS_TARGET = "10K MRR for my apps";
const POPUP_DEFAULT_HIDE_X_FOR_YOU = true;
const POPUP_MAX_FOCUS_TARGET_LENGTH = 80;

function sanitizePopupFocusTarget(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, POPUP_MAX_FOCUS_TARGET_LENGTH);
}

const input = document.querySelector<HTMLInputElement>("#focusTarget");
const hideXForYouSwitch = document.querySelector<HTMLInputElement>("#hideXForYou");

async function loadPopupPreferences(): Promise<void> {
  const values = await chrome.storage.local.get({
    [POPUP_FOCUS_TARGET_KEY]: POPUP_DEFAULT_FOCUS_TARGET,
    [POPUP_HIDE_X_FOR_YOU_KEY]: POPUP_DEFAULT_HIDE_X_FOR_YOU
  });

  if (input) {
    input.value =
      sanitizePopupFocusTarget(values[POPUP_FOCUS_TARGET_KEY]) || POPUP_DEFAULT_FOCUS_TARGET;
  }

  if (hideXForYouSwitch) {
    hideXForYouSwitch.checked = values[POPUP_HIDE_X_FOR_YOU_KEY] !== false;
  }
}

function listenForPopupChanges(): void {
  input?.addEventListener("input", () => {
    void chrome.storage.local.set({
      [POPUP_FOCUS_TARGET_KEY]: sanitizePopupFocusTarget(input.value)
    });
  });

  hideXForYouSwitch?.addEventListener("change", () => {
    void chrome.storage.local.set({
      [POPUP_HIDE_X_FOR_YOU_KEY]: hideXForYouSwitch.checked
    });
  });
}

void loadPopupPreferences();
listenForPopupChanges();
