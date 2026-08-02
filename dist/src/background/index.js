import "../shared/defaults.js";

const { DEFAULT_SETTINGS, deepMergeSettings } = globalThis.DoubaoSkinDefaults;

chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({
    settings: result.settings ? deepMergeSettings(result.settings) : DEFAULT_SETTINGS
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "broadcast-settings") {
    return undefined;
  }

  chrome.tabs.query({ url: "https://www.doubao.com/*" }).then((tabs) => {
    return Promise.allSettled(
      tabs
        .filter((tab) => typeof tab.id === "number")
        .map((tab) => chrome.tabs.sendMessage(tab.id, { type: "settings-changed" }))
    );
  }).then(() => sendResponse({ ok: true }));

  return true;
});
