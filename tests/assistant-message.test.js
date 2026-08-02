import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contentScript = fs.readFileSync(new URL("../src/content/index.js", import.meta.url), "utf8");
const contentCss = fs.readFileSync(new URL("../src/content/base.css", import.meta.url), "utf8");

test("assistant markdown content receives a dedicated message marker", () => {
  assert.match(contentScript, /function markGeometricAssistantMessages/);
  assert.match(contentScript, /\[class\*="ds-markdown" i\]/);
  assert.match(contentScript, /dbSkinDetected = "assistant-content"/);
  assert.match(contentScript, /assistant: semantic\.assistant \+ geometricAssistant/);
});

test("assistant response panel uses themed surface, border, and emphasis colors", () => {
  assert.match(contentCss, /\[data-db-skin-message="assistant"\]/);
  assert.match(contentCss, /linear-gradient\(/);
  assert.match(contentCss, /border-left: 3px solid/);
  assert.match(contentCss, /\[data-db-skin-detected="assistant-content"\]/);
  assert.match(contentCss, /:where\(strong, b\)/);
});
