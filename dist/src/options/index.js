(() => {
  const { COLOR_GROUPS, DEFAULT_SETTINGS, PRESETS, deepMergeSettings } = globalThis.DoubaoSkinDefaults;
  const $ = (id) => document.getElementById(id);
  const notice = $("notice");
  const toastRegion = $("toastRegion");
  const colorInputs = [...document.querySelectorAll("[data-color-key]")];
  const rangeIds = [
    "brightness", "saturation", "overlayOpacity", "panelOpacity", "strongOpacity",
    "messageOpacity", "thinkingOpacity", "borderOpacity", "glassBlur", "panelRadius"
  ];

  let settings = null;
  let pendingBackgroundDataUrl = "";
  let pendingBackgroundName = "";

  for (const [id, value] of Object.entries(PRESETS)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = value.name;
    $("preset").appendChild(option);
  }

  function showNotice(message, type = "success") {
    notice.textContent = message;
    notice.style.color = type === "error" ? "#ff9b9b" : type === "info" ? "#8ddfff" : "#79ddaa";
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type === "success" ? "" : type}`.trim();
    toast.textContent = message;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toastRegion.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      toast.style.transition = "opacity .18s, transform .18s";
      window.setTimeout(() => toast.remove(), 220);
    }, 3800);
  }

  function renderColorGroups() {
    const container = $("colorGroups");
    container.textContent = "";
    for (const [id, group] of Object.entries(COLOR_GROUPS)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "palette-card";
      button.dataset.groupId = id;
      button.setAttribute("aria-pressed", "false");
      button.title = `应用${group.name}统一颜色组`;

      const name = document.createElement("span");
      name.className = "palette-card-name";
      name.textContent = group.name;
      const swatches = document.createElement("span");
      swatches.className = "palette-swatches";
      for (const color of [
        group.colors.panel,
        group.colors.sidebarSelected,
        group.colors.userMessage,
        group.colors.thinking,
        group.colors.accent
      ]) {
        const swatch = document.createElement("i");
        swatch.style.background = color;
        swatches.appendChild(swatch);
      }
      button.append(name, swatches);
      button.addEventListener("click", () => applyColorGroup(id));
      container.appendChild(button);
    }
  }

  function updateActiveGroup(groupId) {
    const group = COLOR_GROUPS[groupId] || COLOR_GROUPS.ocean;
    $("activeGroupName").textContent = `当前：${group.name}`;
    for (const card of document.querySelectorAll(".palette-card")) {
      card.setAttribute("aria-pressed", String(card.dataset.groupId === groupId));
    }
  }

  function applyColorGroup(groupId) {
    const group = COLOR_GROUPS[groupId];
    if (!group || !settings) return;
    settings.colorGroupId = groupId;
    settings.colors = { ...group.colors };
    fillColorInputs(settings.colors);
    updateActiveGroup(groupId);
    showNotice(`已载入“${group.name}”颜色组，点击“保存并应用”后生效。`, "info");
    showToast(`已选择${group.name}颜色组`, "info");
  }

  function fillColorInputs(colors) {
    for (const input of colorInputs) {
      const key = input.dataset.colorKey;
      if (colors[key]) input.value = colors[key];
    }
  }

  function updateOutputs() {
    $("brightnessValue").textContent = Number($("brightness").value).toFixed(2);
    $("saturationValue").textContent = Number($("saturation").value).toFixed(2);
    $("overlayValue").textContent = Number($("overlayOpacity").value).toFixed(2);
    $("panelOpacityValue").textContent = Number($("panelOpacity").value).toFixed(2);
    $("strongOpacityValue").textContent = Number($("strongOpacity").value).toFixed(2);
    $("messageOpacityValue").textContent = Number($("messageOpacity").value).toFixed(2);
    $("thinkingOpacityValue").textContent = Number($("thinkingOpacity").value).toFixed(2);
    $("borderOpacityValue").textContent = Number($("borderOpacity").value).toFixed(2);
    $("blurValue").textContent = `${$("glassBlur").value}px`;
    $("radiusValue").textContent = `${$("panelRadius").value}px`;
  }

  function updatePreview(dataUrl, name = "") {
    const preview = $("preview");
    if (dataUrl) {
      preview.style.backgroundImage = `linear-gradient(rgba(0,0,0,.08), rgba(0,0,0,.22)), url("${dataUrl.replace(/["\\\n\r]/g, "")}")`;
      preview.textContent = "";
      preview.title = name;
    } else {
      preview.style.backgroundImage = "";
      preview.innerHTML = "<span>尚未选择背景</span>";
      preview.title = "";
    }
  }

  function fillForm(value) {
    settings = deepMergeSettings(value);
    pendingBackgroundDataUrl = settings.backgroundDataUrl || "";
    pendingBackgroundName = settings.backgroundName || "";

    $("enabled").checked = settings.enabled;
    $("preset").value = settings.themeId in PRESETS ? settings.themeId : DEFAULT_SETTINGS.themeId;
    fillColorInputs(settings.colors);

    for (const id of rangeIds) $(id).value = settings.effects[id];
    $("animations").checked = settings.effects.animations;

    $("componentBackground").checked = settings.components.background;
    $("componentColorOverlay").checked = settings.components.colorOverlay;
    $("componentSidebar").checked = settings.components.sidebar;
    $("componentComposer").checked = settings.components.composer;
    $("componentMessages").checked = settings.components.messages;
    $("componentThinking").checked = settings.components.thinking;
    $("componentDialogs").checked = settings.components.dialogs;

    updateActiveGroup(settings.colorGroupId);
    updatePreview(pendingBackgroundDataUrl, pendingBackgroundName);
    updateOutputs();
  }

  function collectForm() {
    const colors = {};
    for (const input of colorInputs) colors[input.dataset.colorKey] = input.value;

    return deepMergeSettings({
      ...settings,
      visualVersion: DEFAULT_SETTINGS.visualVersion,
      enabled: $("enabled").checked,
      themeId: $("preset").value,
      colorGroupId: settings.colorGroupId,
      backgroundDataUrl: pendingBackgroundDataUrl,
      backgroundName: pendingBackgroundName,
      colors,
      effects: {
        ...settings.effects,
        brightness: Number($("brightness").value),
        saturation: Number($("saturation").value),
        overlayOpacity: Number($("overlayOpacity").value),
        panelOpacity: Number($("panelOpacity").value),
        strongOpacity: Number($("strongOpacity").value),
        messageOpacity: Number($("messageOpacity").value),
        thinkingOpacity: Number($("thinkingOpacity").value),
        borderOpacity: Number($("borderOpacity").value),
        glassBlur: Number($("glassBlur").value),
        panelRadius: Number($("panelRadius").value),
        animations: $("animations").checked
      },
      components: {
        ...settings.components,
        background: $("componentBackground").checked,
        colorOverlay: $("componentColorOverlay").checked,
        sidebar: $("componentSidebar").checked,
        composer: $("componentComposer").checked,
        messages: $("componentMessages").checked,
        thinking: $("componentThinking").checked,
        dialogs: $("componentDialogs").checked,
        welcomeBanner: false
      }
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

  async function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("图片编码失败"));
      }, type, quality);
    });
  }

  async function processImage(file) {
    const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowed.has(file.type)) throw new Error("只支持 PNG、JPEG 和 WebP 图片");
    if (file.size > 30 * 1024 * 1024) throw new Error("原始图片不能超过 30MB");

    const bitmap = await createImageBitmap(file);
    const maxEdge = 3200;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      bitmap.close();
      throw new Error("无法创建图片处理画布");
    }

    context.fillStyle = "#17344d";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const targetBytes = 3.5 * 1024 * 1024;
    let quality = 0.9;
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    while (blob.size > targetBytes && quality > 0.5) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, "image/webp", quality);
    }
    if (blob.size > 5 * 1024 * 1024) throw new Error("处理后的图片仍然过大，请选择尺寸更小的图片");
    return blobToDataUrl(blob);
  }

  async function save() {
    const saveButton = $("save");
    saveButton.disabled = true;
    saveButton.textContent = "正在保存…";
    try {
      settings = collectForm();
      await chrome.storage.local.set({ settings });
      await chrome.runtime.sendMessage({ type: "broadcast-settings" }).catch(() => undefined);
      showNotice("主题已保存，并发送到已打开的 Doubao 标签页。", "success");
      showToast("保存成功：主题已应用", "success");
    } catch (error) {
      const message = error?.message || String(error);
      showNotice(`保存失败：${message}`, "error");
      showToast(`保存失败：${message}`, "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "保存并应用";
    }
  }

  $("applyPreset").addEventListener("click", () => {
    const selected = PRESETS[$("preset").value];
    if (!selected || !settings) return;
    settings.themeId = $("preset").value;
    settings.colorGroupId = selected.colorGroupId;
    settings.colors = { ...selected.colors };
    settings.effects = { ...settings.effects, ...selected.effects };
    fillColorInputs(settings.colors);
    for (const id of rangeIds) $(id).value = settings.effects[id];
    $("animations").checked = settings.effects.animations;
    updateActiveGroup(settings.colorGroupId);
    updateOutputs();
    showNotice("已载入预设参数，点击“保存并应用”后生效。", "info");
    showToast("预设已载入，尚未保存", "info");
  });

  $("background").addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    showNotice("正在处理图片…", "info");
    try {
      pendingBackgroundDataUrl = await processImage(file);
      pendingBackgroundName = file.name;
      $("componentBackground").checked = true;
      updatePreview(pendingBackgroundDataUrl, pendingBackgroundName);
      showNotice("图片处理完成，点击“保存并应用”后生效。", "success");
      showToast("背景图片处理成功，请点击保存并应用", "success");
    } catch (error) {
      const message = error?.message || String(error);
      showNotice(`图片处理失败：${message}`, "error");
      showToast(`图片处理失败：${message}`, "error");
    } finally {
      event.target.value = "";
    }
  });

  $("removeBackground").addEventListener("click", () => {
    pendingBackgroundDataUrl = "";
    pendingBackgroundName = "";
    updatePreview("", "");
    showNotice("背景已从当前表单移除，点击保存后生效。", "info");
    showToast("背景已移除，尚未保存", "info");
  });

  for (const id of rangeIds) $(id).addEventListener("input", updateOutputs);
  for (const input of colorInputs) {
    input.addEventListener("input", () => {
      const group = COLOR_GROUPS[settings?.colorGroupId];
      $("activeGroupName").textContent = group ? `当前：${group.name}（已微调）` : "当前：自定义";
    });
  }

  $("save").addEventListener("click", () => void save());
  $("reset").addEventListener("click", () => {
    fillForm(structuredClone(DEFAULT_SETTINGS));
    showNotice("已恢复扩展默认参数，点击“保存并应用”后生效。", "info");
    showToast("已恢复默认值，尚未保存", "info");
  });

  renderColorGroups();
  chrome.storage.local.get("settings").then((result) => {
    fillForm(result.settings || DEFAULT_SETTINGS);
  }).catch((error) => {
    const message = error?.message || String(error);
    fillForm(DEFAULT_SETTINGS);
    showNotice(`读取设置失败：${message}`, "error");
    showToast(`读取设置失败：${message}`, "error");
  });
})();
