const input = document.querySelector<HTMLInputElement>("#focusTarget");
const hideXForYouSwitch = document.querySelector<HTMLInputElement>("#hideXForYou");

async function loadPopupPreferences(): Promise<void> {
  const preferences = await readPreferences();

  if (input) {
    input.value = preferences.focusTarget;
  }

  if (hideXForYouSwitch) {
    hideXForYouSwitch.checked = preferences.hideXForYou;
  }
}

function listenForPopupChanges(): void {
  input?.addEventListener("input", () => {
    saveFocusTarget(input.value.trim());
  });

  hideXForYouSwitch?.addEventListener("change", () => {
    saveHideXForYou(hideXForYouSwitch.checked);
  });
}

void loadPopupPreferences();
listenForPopupChanges();
