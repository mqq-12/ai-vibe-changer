import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contentScript = fs.readFileSync(new URL("../src/content/index.js", import.meta.url), "utf8");
const contentCss = fs.readFileSync(new URL("../src/content/base.css", import.meta.url), "utf8");

test("composer toolbar marks mode, attachment, and send controls", () => {
  assert.match(contentScript, /dbSkinControl = "mode-toggle"/);
  assert.match(contentScript, /dbSkinControl = "attachment"/);
  assert.match(contentScript, /dbSkinControl = "send"/);
  assert.match(contentScript, /dbSkinComposerTools = "true"/);
});

test("composer controls use theme colors for selected and disabled states", () => {
  assert.match(contentCss, /\[data-db-skin-control="mode-toggle"\]/);
  assert.match(contentCss, /\.ds-toggle-button--selected/);
  assert.match(contentCss, /\[data-db-skin-control="attachment"\]/);
  assert.match(contentCss, /\[data-db-skin-control="send"\]/);
  assert.match(contentCss, /\.ds-button--disabled/);
});

test("composer toolbar is excluded from reasoning panel detection", () => {
  assert.match(contentScript, /delete toolbar\.dataset\.dbSkinRole/);
  assert.match(contentScript, /element\.querySelector\('\[data-db-skin-control="mode-toggle"\]/);
});
