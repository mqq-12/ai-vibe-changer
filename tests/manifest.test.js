import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));

test("扩展使用 Manifest V3", () => {
  assert.equal(manifest.manifest_version, 3);
});

test("扩展只申请本地存储权限", () => {
  assert.deepEqual(manifest.permissions, ["storage"]);
});

test("页面匹配范围仅限 Doubao 官方聊天域名", () => {
  assert.deepEqual(manifest.host_permissions, ["https://www.doubao.com/*"]);
  assert.deepEqual(manifest.content_scripts[0].matches, ["https://www.doubao.com/*"]);
});
