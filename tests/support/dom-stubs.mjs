// Minimal, dependency-free DOM/browser stubs for unit testing the extension's
// TypeScript logic under `node --test`. These intentionally implement only the
// small surface the content and popup scripts touch, so the tests stay fast and
// do not require a full DOM implementation such as jsdom.

class FakeClassList {
  #classes = new Set();

  add(...names) {
    for (const name of names) this.#classes.add(name);
  }

  remove(...names) {
    for (const name of names) this.#classes.delete(name);
  }

  toggle(name, force) {
    const shouldHave = force ?? !this.#classes.has(name);
    if (shouldHave) this.#classes.add(name);
    else this.#classes.delete(name);
    return shouldHave;
  }

  contains(name) {
    return this.#classes.has(name);
  }

  get size() {
    return this.#classes.size;
  }

  values() {
    return [...this.#classes];
  }
}

export class FakeElement {
  constructor({ tag = "div", text = "", attributes = {} } = {}) {
    this.tagName = tag.toUpperCase();
    this.textContent = text;
    this.classList = new FakeClassList();
    this._className = "";
    this.dataset = {};
    this.attributes = { ...attributes };
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.width = 0;
    this.height = 0;
    this.type = "";
    this.checked = false;
    this.value = "";
    this.id = "";
    this.src = "";
    this.alt = "";
  }

  // Keep className and classList in sync the way the DOM does, so tests can
  // match on either the string assignment used by the focus card or the
  // classList.toggle calls used on the document root.
  get className() {
    return this._className;
  }

  set className(value) {
    this._className = value;
    this.classList = new FakeClassList();
    for (const token of value.split(/\s+/).filter(Boolean)) {
      this.classList.add(token);
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "role") this.attributes.role = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type) {
    for (const handler of this.listeners.get(type) ?? []) handler();
  }

  append(...nodes) {
    for (const node of nodes) {
      if (typeof node === "string") {
        this.children.push({ textContent: node });
        continue;
      }
      node.parentElement = this;
      this.children.push(node);
    }
  }

  prepend(node) {
    node.parentElement = this;
    this.children.unshift(node);
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter(
        (child) => child !== this
      );
    }
    this.parentElement = null;
    if (this.id && this.__registry && this.__registry[this.id] === this) {
      delete this.__registry[this.id];
    }
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    return collectDescendants(this).filter((el) => matchesSelector(el, selector));
  }
}

function collectDescendants(root) {
  const found = [];
  for (const child of root.children ?? []) {
    if (!(child instanceof FakeElement)) continue;
    found.push(child);
    found.push(...collectDescendants(child));
  }
  return found;
}

// Supports the tiny subset of selectors these scripts rely on:
// `.class`, `#id`, and `[attr="value"]` combinations.
function matchesSelector(el, selector) {
  const tokens = selector.trim().match(/(\.[^.#\[\]]+|#[^.#\[\]]+|\[[^\]]+\])/g);
  if (!tokens) return false;

  return tokens.every((token) => {
    if (token.startsWith(".")) return el.classList.contains(token.slice(1));
    if (token.startsWith("#")) return el.id === token.slice(1);

    const attrMatch = token.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (!attrMatch) return false;
    const [, name, value] = attrMatch;
    if (value === undefined) return el.getAttribute(name) !== null;
    return el.getAttribute(name) === value;
  });
}

// `selectors` lets a test map an exact selector string to a specific element,
// which is handy for the multi-part YouTube/X mount selectors that the simple
// built-in matcher does not attempt to parse.
export function createDocument({ tabs = [], byId = {}, selectors = {} } = {}) {
  const documentElement = new FakeElement({ tag: "html" });
  const root = new FakeElement({ tag: "body" });
  for (const tab of tabs) root.append(tab);

  const created = [];

  return {
    documentElement,
    createElement(tag) {
      const el = new FakeElement({ tag });
      el.__registry = byId;
      // Mirror the browser: assigning an id makes the element findable via
      // getElementById, which the focus-card rendering relies on for idempotency.
      let idValue = "";
      Object.defineProperty(el, "id", {
        get: () => idValue,
        set: (value) => {
          idValue = value;
          if (value) byId[value] = el;
        }
      });
      created.push(el);
      return el;
    },
    getElementById(id) {
      return byId[id] ?? null;
    },
    setElementById(id, el) {
      byId[id] = el;
    },
    querySelector(selector) {
      if (selector in selectors) return selectors[selector];
      return root.querySelector(selector) ?? documentElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      if (selector in selectors) {
        const value = selectors[selector];
        return value ? [value] : [];
      }
      return [
        ...root.querySelectorAll(selector),
        ...documentElement.querySelectorAll(selector)
      ];
    },
    __root: root,
    __created: created
  };
}

export function createTab(text, { selected = true } = {}) {
  const tab = new FakeElement({ tag: "div", text });
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-selected", String(selected));
  tab.classList.add("tab");
  return tab;
}

export function createChromeStorage(initial = {}) {
  const store = { ...initial };
  const changeListeners = [];

  return {
    runtime: {
      getURL(path) {
        return `chrome-extension://test/${path}`;
      }
    },
    storage: {
      local: {
        async get(defaults) {
          const result = {};
          for (const [key, fallback] of Object.entries(defaults)) {
            result[key] = key in store ? store[key] : fallback;
          }
          return result;
        },
        async set(values) {
          const changes = {};
          for (const [key, newValue] of Object.entries(values)) {
            changes[key] = { oldValue: store[key], newValue };
            store[key] = newValue;
          }
          for (const listener of changeListeners) listener(changes, "local");
        }
      },
      onChanged: {
        addListener(listener) {
          changeListeners.push(listener);
        }
      }
    },
    __store: store,
    __emit(changes, areaName = "local") {
      for (const listener of changeListeners) listener(changes, areaName);
    }
  };
}

export function createLocation(url) {
  const parsed = new URL(url);
  return { hostname: parsed.hostname, pathname: parsed.pathname, href: parsed.href };
}
