import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contentScript = fs.readFileSync(new URL("../src/content/index.js", import.meta.url), "utf8");
const contentCss = fs.readFileSync(new URL("../src/content/base.css", import.meta.url), "utf8");

test("inline code uses a high-contrast themed chip", () => {
  assert.match(contentCss, /code:not\(pre code\)/);
  assert.match(contentCss, /--db-skin-code-background\) 76%/);
  assert.match(contentCss, /--db-skin-accent\) 84%, white 16%/);
  assert.match(contentCss, /font-weight: 700 !important/);
  assert.match(contentCss, /-webkit-text-fill-color: currentColor !important/);
});

test("thinking title is detected independently and receives the thinking palette", () => {
  assert.match(contentScript, /THINKING_TITLE_PATTERN/);
  assert.match(contentScript, /function promoteThinkingHeader/);
  assert.match(contentScript, /dbSkinThinkingHeader = "true"/);
  assert.match(contentScript, /data-db-skin-thinking-header/);
  assert.match(contentCss, /\[data-db-skin-thinking-header="true"\]/);
  assert.match(contentCss, /var\(--db-skin-thinking\) 70%, var\(--db-skin-accent\) 30%/);
  assert.match(contentCss, /var\(--db-skin-thinking-text\)/);
});

test("sidebar is prepainted and probed on the next animation frame", () => {
  assert.match(contentScript, /QUICK_SIDEBAR_SELECTOR/);
  assert.match(contentScript, /function quickFindSidebar/);
  assert.match(contentScript, /function scheduleQuickChromeRefresh/);
  assert.match(contentScript, /requestAnimationFrame/);
  assert.match(contentScript, /refreshCachedChrome\(node\)/);
  assert.match(contentCss, /Prepaint stable sidebar semantics/);
  assert.doesNotMatch(contentScript, /await new Promise\(\(resolve\) => document\.addEventListener\("DOMContentLoaded"/);
});
