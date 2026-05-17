const POPUP_FOCUS_TARGET_KEY = "focusTarget";
const POPUP_DEFAULT_FOCUS_TARGET = "10K MRR for my apps";

const input = document.querySelector<HTMLInputElement>("#focusTarget");

async function loadPopupFocusTarget(): Promise<void> {
  if (!input) return;

  const values = await chrome.storage.local.get({
    [POPUP_FOCUS_TARGET_KEY]: POPUP_DEFAULT_FOCUS_TARGET
  });

  input.value = values[POPUP_FOCUS_TARGET_KEY] || POPUP_DEFAULT_FOCUS_TARGET;
}

function listenForPopupChanges(): void {
  if (!input) return;

  input.addEventListener("input", () => {
    void chrome.storage.local.set({
      [POPUP_FOCUS_TARGET_KEY]: input.value.trim()
    });
  });
}

void loadPopupFocusTarget();
listenForPopupChanges();
