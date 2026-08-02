(() => {
  const { PRESETS, deepMergeSettings } = globalThis.DoubaoSkinDefaults;
  const enabled = document.getElementById("enabled");
  const preset = document.getElementById("preset");
  const pageStatus = document.getElementById("pageStatus");
  const score = document.getElementById("score");
  const statusHint = document.getElementById("statusHint");
  const backgroundName = document.getElementById("backgroundName");
  const toast = document.getElementById("toast");
  let toastTimer = null;

  for (const [id, value] of Object.entries(PRESETS)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = value.name;
    preset.appendChild(option);
  }

  function showToast(message, type = "success") {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `popup-toast visible ${type === "success" ? "" : type}`.trim();
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toastTimer = setTimeout(() => {
      toast.classList.remove("visible");
    }, 3200);
  }

  async function getSettings() {
    const result = await chrome.storage.local.get("settings");
    return deepMergeSettings(result.settings || {});
  }

  async function saveSettings(settings) {
    await chrome.storage.local.set({ settings });
    await chrome.runtime.sendMessage({ type: "broadcast-settings" }).catch(() => undefined);
    backgroundName.textContent = settings.backgroundName || "尚未上传图片";
  }

  async function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片编码失败"));
      }, "image/webp", quality);
    });
  }

  async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
      reader.readAsDataURL(blob);
    });
  }

  async function processImage(file) {
    const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowed.has(file.type)) throw new Error("只支持 PNG、JPEG 和 WebP");
    if (file.size > 30 * 1024 * 1024) throw new Error("图片不能超过 30MB");

    const bitmap = await createImageBitmap(file);
    const maxEdge = 3200;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      bitmap.close();
      throw new Error("无法创建图片画布");
    }

    context.fillStyle = "#17344d";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const targetBytes = 3.2 * 1024 * 1024;
    let quality = 0.88;
    let blob = await canvasToBlob(canvas, quality);
    while (blob.size > targetBytes && quality > 0.48) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, quality);
    }
    if (blob.size > 5 * 1024 * 1024) throw new Error("处理后仍然过大，请换一张较小的图片");
    return blobToDataUrl(blob);
  }

  async function queryPageStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      const result = await chrome.tabs.sendMessage(tab.id, { type: "get-status" });
      const compatibility = result?.compatibility;
      pageStatus.textContent = compatibility?.mode === "full"
        ? "完整模式"
        : compatibility?.mode === "safe"
          ? "安全模式"
          : compatibility?.mode === "unsupported"
            ? "暂不兼容"
            : "主题未启用";
      score.textContent = Number.isFinite(compatibility?.score) ? `${compatibility.score}/100` : "—";
      statusHint.textContent = compatibility?.signals?.length
        ? `已识别：${compatibility.signals.join("、")}`
        : "尚未识别到 Doubao 页面结构。";
    } catch {
      pageStatus.textContent = "未连接";
      score.textContent = "—";
      statusHint.textContent = "请打开或刷新 Doubao 官方聊天页面后再检查。";
    }
  }

  async function init() {
    try {
      const settings = await getSettings();
      enabled.checked = settings.enabled;
      preset.value = settings.themeId in PRESETS ? settings.themeId : "midnight-ocean";
      backgroundName.textContent = settings.backgroundName || "尚未上传图片";
      await queryPageStatus();
    } catch (error) {
      showToast(`读取设置失败：${error?.message || error}`, "error");
    }
  }

  enabled.addEventListener("change", async () => {
    try {
      const settings = await getSettings();
      settings.enabled = enabled.checked;
      await saveSettings(settings);
      showToast(enabled.checked ? "主题已启用" : "主题已关闭");
      setTimeout(queryPageStatus, 250);
    } catch (error) {
      enabled.checked = !enabled.checked;
      showToast(`保存失败：${error?.message || error}`, "error");
    }
  });

  document.getElementById("applyPreset").addEventListener("click", async () => {
    try {
      const settings = await getSettings();
      const selected = PRESETS[preset.value];
      if (!selected) return;
      settings.themeId = preset.value;
      settings.colorGroupId = selected.colorGroupId;
      settings.colors = { ...selected.colors };
      settings.effects = { ...settings.effects, ...selected.effects };
      await saveSettings(settings);
      showToast("主题预设保存并应用成功");
      setTimeout(queryPageStatus, 250);
    } catch (error) {
      showToast(`主题应用失败：${error?.message || error}`, "error");
    }
  });

  document.getElementById("background").addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    backgroundName.textContent = "正在压缩图片…";
    showToast("正在处理背景图片…", "info");
    try {
      const dataUrl = await processImage(file);
      const settings = await getSettings();
      settings.backgroundDataUrl = dataUrl;
      settings.backgroundName = file.name;
      settings.components.background = true;
      await saveSettings(settings);
      backgroundName.textContent = file.name;
      showToast("背景图片保存并应用成功");
    } catch (error) {
      backgroundName.textContent = "图片保存失败";
      showToast(`背景图片保存失败：${error?.message || error}`, "error");
    } finally {
      event.target.value = "";
    }
  });

  document.getElementById("removeBackground").addEventListener("click", async () => {
    try {
      const settings = await getSettings();
      settings.backgroundDataUrl = "";
      settings.backgroundName = "";
      await saveSettings(settings);
      showToast("背景图片已清除");
    } catch (error) {
      showToast(`清除失败：${error?.message || error}`, "error");
    }
  });

  document.getElementById("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  void init();
})();
