import { readFile } from "node:fs/promises";

export function readProjectFile(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}
