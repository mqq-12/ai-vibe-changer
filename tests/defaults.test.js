import test from "node:test";
import assert from "node:assert/strict";
import "../src/shared/defaults.js";

const { COLOR_GROUPS, DEFAULT_SETTINGS, PRESETS, deepMergeSettings } = globalThis.DoubaoSkinDefaults;

const REQUIRED_COLOR_FIELDS = [
  "accent", "textPrimary", "textSecondary", "panel", "panelStrong",
  "sidebarHover", "sidebarSelected", "sidebarSelectedText",
  "userMessage", "userBorder", "assistantMessage",
  "thinking", "thinkingBorder", "thinkingText", "dialog", "codeBackground"
];

test("默认设置包含 v3 颜色组、效果和组件配置", () => {
  assert.equal(DEFAULT_SETTINGS.enabled, true);
  assert.equal(DEFAULT_SETTINGS.visualVersion, 3);
  assert.equal(DEFAULT_SETTINGS.colorGroupId, "ocean");
  assert.ok(DEFAULT_SETTINGS.colors);
  assert.ok(DEFAULT_SETTINGS.effects);
  assert.ok(DEFAULT_SETTINGS.components);
  assert.equal(DEFAULT_SETTINGS.components.thinking, true);
  assert.equal(DEFAULT_SETTINGS.components.welcomeBanner, false);
  for (const key of REQUIRED_COLOR_FIELDS) assert.match(DEFAULT_SETTINGS.colors[key], /^#[0-9a-f]{6}$/i);
});

test("v3 配置合并时保留嵌套自定义值", () => {
  const result = deepMergeSettings({
    visualVersion: DEFAULT_SETTINGS.visualVersion,
    enabled: false,
    colorGroupId: "violet",
    colors: { accent: "#ffffff", thinking: "#123456" },
    effects: { glassBlur: 12, thinkingOpacity: 0.7 },
    components: { thinking: false, welcomeBanner: true }
  });
  assert.equal(result.enabled, false);
  assert.equal(result.colorGroupId, "violet");
  assert.equal(result.colors.accent, "#ffffff");
  assert.equal(result.colors.thinking, "#123456");
  assert.equal(result.colors.panel, COLOR_GROUPS.violet.colors.panel);
  assert.equal(result.effects.glassBlur, 12);
  assert.equal(result.effects.thinkingOpacity, 0.7);
  assert.equal(result.components.thinking, false);
  assert.equal(result.components.welcomeBanner, false);
});

test("旧版配置迁移时保留背景和高层组件开关并换用新颜色组", () => {
  const result = deepMergeSettings({
    visualVersion: 2,
    enabled: true,
    backgroundDataUrl: "data:image/webp;base64,abc",
    backgroundName: "background.webp",
    colors: { panel: "rgba(0,0,0,0.95)" },
    effects: { overlayOpacity: 0.9 },
    components: { sidebar: false, welcomeBanner: true }
  });
  assert.equal(result.visualVersion, 3);
  assert.equal(result.backgroundDataUrl, "data:image/webp;base64,abc");
  assert.equal(result.backgroundName, "background.webp");
  assert.equal(result.components.sidebar, false);
  assert.equal(result.components.thinking, true);
  assert.equal(result.components.welcomeBanner, false);
  assert.equal(result.colors.panel, DEFAULT_SETTINGS.colors.panel);
  assert.equal(result.effects.overlayOpacity, DEFAULT_SETTINGS.effects.overlayOpacity);
});

test("所有统一颜色组都包含完整的分区颜色", () => {
  assert.ok(Object.keys(COLOR_GROUPS).length >= 5);
  for (const group of Object.values(COLOR_GROUPS)) {
    assert.equal(typeof group.name, "string");
    for (const key of REQUIRED_COLOR_FIELDS) assert.match(group.colors[key], /^#[0-9a-f]{6}$/i);
  }
});

test("内置主题均绑定颜色组并包含视觉参数", () => {
  assert.ok(Object.keys(PRESETS).length >= 5);
  for (const preset of Object.values(PRESETS)) {
    assert.equal(typeof preset.name, "string");
    assert.ok(preset.colorGroupId in COLOR_GROUPS);
    assert.ok(preset.colors.accent);
    assert.ok(Number.isFinite(preset.effects.glassBlur));
    assert.ok(Number.isFinite(preset.effects.thinkingOpacity));
  }
});
