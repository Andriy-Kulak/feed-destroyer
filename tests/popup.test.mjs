import assert from "node:assert/strict";
import test from "node:test";

import { loadSource } from "./support/load-source.mjs";
import { createChromeStorage, FakeElement } from "./support/dom-stubs.mjs";

// Builds a document whose querySelector returns the popup's focus-target input
// and hide switch, mirroring the ids in popup.html.
function createPopupDocument({ withInput = true, withSwitch = true } = {}) {
  const input = new FakeElement({ tag: "input" });
  input.id = "focusTarget";
  const hideSwitch = new FakeElement({ tag: "input" });
  hideSwitch.type = "checkbox";
  hideSwitch.id = "hideXForYou";

  const elements = {
    "#focusTarget": withInput ? input : null,
    "#hideXForYou": withSwitch ? hideSwitch : null
  };

  return {
    input,
    hideSwitch,
    document: {
      querySelector(selector) {
        return elements[selector] ?? null;
      }
    }
  };
}

async function loadPopup({ storage = {}, dom } = {}) {
  const chrome = createChromeStorage(storage);
  const { document, input, hideSwitch } = dom ?? createPopupDocument();

  const api = await loadSource("src/popup/popup.ts", {
    globals: { document, chrome },
    expose: ["loadPopupPreferences", "listenForPopupChanges", "input", "hideXForYouSwitch"],
    stripTrailing: ["void loadPopupPreferences();", "listenForPopupChanges();"]
  });

  return { api, chrome, document, input, hideSwitch };
}

test("loadPopupPreferences hydrates the input and switch from storage", async () => {
  const { api, input, hideSwitch } = await loadPopup({
    storage: { focusTarget: "finish the launch", hideXForYou: false }
  });

  await api.loadPopupPreferences();

  assert.equal(input.value, "finish the launch");
  assert.equal(hideSwitch.checked, false);
});

test("loadPopupPreferences falls back to defaults for missing or empty values", async () => {
  const emptyString = await loadPopup({ storage: { focusTarget: "" } });
  await emptyString.api.loadPopupPreferences();
  assert.equal(emptyString.input.value, "10K MRR for my apps");
  assert.equal(emptyString.hideSwitch.checked, true, "missing hide preference defaults to on");

  const unset = await loadPopup({ storage: {} });
  await unset.api.loadPopupPreferences();
  assert.equal(unset.input.value, "10K MRR for my apps");
  assert.equal(unset.hideSwitch.checked, true);

  const nonString = await loadPopup({ storage: { focusTarget: 42 } });
  await nonString.api.loadPopupPreferences();
  assert.equal(nonString.input.value, "10K MRR for my apps");
});

test("listenForPopupChanges persists a trimmed focus target on input", async () => {
  const { api, chrome, input } = await loadPopup();

  api.listenForPopupChanges();

  input.value = "  ship v1  ";
  input.dispatch("input");

  assert.equal(chrome.__store.focusTarget, "ship v1", "the stored value should be trimmed");
});

test("listenForPopupChanges persists the hide switch on change", async () => {
  const { api, chrome, hideSwitch } = await loadPopup({ storage: { hideXForYou: true } });

  api.listenForPopupChanges();

  hideSwitch.checked = false;
  hideSwitch.dispatch("change");
  assert.equal(chrome.__store.hideXForYou, false);

  hideSwitch.checked = true;
  hideSwitch.dispatch("change");
  assert.equal(chrome.__store.hideXForYou, true);
});

test("popup logic tolerates a missing input or switch without throwing", async () => {
  const { api } = await loadPopup({ dom: createPopupDocument({ withInput: false, withSwitch: false }) });

  // Neither hydration nor listener wiring should throw when the elements are absent.
  await assert.doesNotReject(() => api.loadPopupPreferences());
  assert.doesNotThrow(() => api.listenForPopupChanges());
  assert.equal(api.input, null);
  assert.equal(api.hideXForYouSwitch, null);
});
