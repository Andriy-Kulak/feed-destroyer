const FOCUS_TARGET_KEY = "focusTarget";
const HIDE_X_FOR_YOU_KEY = "hideXForYou";
const DEFAULT_FOCUS_TARGET = "10K MRR for my apps";
const DEFAULT_HIDE_X_FOR_YOU = true;

type Preferences = {
  focusTarget: string;
  hideXForYou: boolean;
};

function normalizeFocusTarget(value: ChromeStorageValue | undefined): string {
  return typeof value === "string" && value ? value : DEFAULT_FOCUS_TARGET;
}

function normalizeHideXForYou(value: ChromeStorageValue | undefined): boolean {
  return value !== false;
}

async function readPreferences(): Promise<Preferences> {
  const values = await chrome.storage.local.get({
    [FOCUS_TARGET_KEY]: DEFAULT_FOCUS_TARGET,
    [HIDE_X_FOR_YOU_KEY]: DEFAULT_HIDE_X_FOR_YOU
  });

  return {
    focusTarget: normalizeFocusTarget(values[FOCUS_TARGET_KEY]),
    hideXForYou: normalizeHideXForYou(values[HIDE_X_FOR_YOU_KEY])
  };
}

function saveFocusTarget(focusTarget: string): void {
  void chrome.storage.local.set({ [FOCUS_TARGET_KEY]: focusTarget });
}

function saveHideXForYou(hideXForYou: boolean): void {
  void chrome.storage.local.set({ [HIDE_X_FOR_YOU_KEY]: hideXForYou });
}

function watchPreferences(onChange: (changed: Partial<Preferences>) => void): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    const changed: Partial<Preferences> = {};

    if (changes[FOCUS_TARGET_KEY]) {
      changed.focusTarget = normalizeFocusTarget(changes[FOCUS_TARGET_KEY].newValue);
    }

    if (changes[HIDE_X_FOR_YOU_KEY]) {
      changed.hideXForYou = normalizeHideXForYou(changes[HIDE_X_FOR_YOU_KEY].newValue);
    }

    if (changed.focusTarget !== undefined || changed.hideXForYou !== undefined) {
      onChange(changed);
    }
  });
}
