import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contentScript = fs.readFileSync(new URL("../src/content/index.js", import.meta.url), "utf8");
const contentCss = fs.readFileSync(new URL("../src/content/base.css", import.meta.url), "utf8");

test("header styling is promoted to the complete outer shell", () => {
  assert.match(contentScript, /function promoteHeaderShell/);
  assert.match(contentScript, /return promoteHeaderShell\(element, sidebarRight\)/);
  assert.match(contentScript, /promoteHeaderShell\(best, sidebarRight\)/);
  assert.match(contentCss, /-webkit-text-fill-color: currentColor/);
});

test("composer dock and its pseudo gradients are transparent", () => {
  assert.match(contentScript, /function markComposerDock/);
  assert.match(contentScript, /dbSkinComposerDock = "true"/);
  assert.match(contentScript, /dbSkinBottomSurface = "true"/);
  assert.match(contentCss, /data-db-skin-bottom-surface/);
  assert.match(contentCss, /::before/);
  assert.match(contentCss, /background-image: none !important/);
});


