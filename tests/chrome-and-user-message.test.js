import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contentScript = fs.readFileSync(new URL("../src/content/index.js", import.meta.url), "utf8");
const contentCss = fs.readFileSync(new URL("../src/content/base.css", import.meta.url), "utf8");

test("sidebar primary controls receive dedicated color roles", () => {
  assert.match(contentScript, /function markSidebarControls/);
  assert.match(contentScript, /dbSkinSidebarControl = type/);
  assert.match(contentScript, /type = "new-chat"/);
  assert.match(contentScript, /type = "search"/);
  assert.match(contentScript, /type = "collapse"/);
  assert.match(contentCss, /\[data-db-skin-sidebar-control="new-chat"\]/);
});

test("dynamic DOM adaptation is immediate initially and bounded during streaming", () => {
  assert.match(contentScript, /lastAdaptationAt: 0/);
  assert.match(contentScript, /Math\.min\(180, Math\.max\(0, 700 - elapsed\)\)/);
  assert.match(contentScript, /refreshCachedChrome\(\)/);
  assert.match(contentScript, /adaptPage\("settings-applied"\)/);
});

test("geometric user bubbles receive visible themed borders", () => {
  assert.match(contentScript, /dbSkinDetected = "user-bubble"/);
  assert.match(contentScript, /contentCenter/);
  assert.match(contentCss, /\[data-db-skin-detected="user-bubble"\]/);
  assert.match(contentCss, /border: 2px solid color-mix/);
});

test("header has a geometric fallback and themed controls", () => {
  assert.match(contentScript, /let bestScore = -1/);
  assert.match(contentScript, /rect\.top > 112/);
  assert.match(contentCss, /\[data-db-skin-role="header"\] :is\(button, \[role="button"\]\)/);
});
