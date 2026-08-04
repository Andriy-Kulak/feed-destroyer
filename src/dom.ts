type CreateElementOptions = {
  className?: string;
  text?: string;
  attributes?: Record<string, string>;
};

function createStyledElement<TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  options: CreateElementOptions = {}
): HTMLElementTagNameMap[TagName] {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    element.setAttribute(name, value);
  }

  return element;
}
