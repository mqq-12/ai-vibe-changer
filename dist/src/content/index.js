(() => {
  "use strict";

  const HOST = "www.doubao.com";
  const ROOT_ID = "doubao-web-skin-root";
  const LEGACY_BANNER_ID = "doubao-web-skin-welcome-banner";
  const VARIABLE_NAMES = [
    "--db-skin-accent",
    "--db-skin-text-primary",
    "--db-skin-text-secondary",
    "--db-skin-panel",
    "--db-skin-panel-strong",
    "--db-skin-header",
    "--db-skin-header-text",
    "--db-skin-header-border",
    "--db-skin-sidebar-hover",
    "--db-skin-sidebar-selected",
    "--db-skin-sidebar-selected-text",
    "--db-skin-user-message",
    "--db-skin-user-border",
    "--db-skin-assistant-message",
    "--db-skin-thinking",
    "--db-skin-thinking-border",
    "--db-skin-thinking-text",
    "--db-skin-dialog",
    "--db-skin-border",
    "--db-skin-code-background",
    "--db-skin-glass-blur",
    "--db-skin-panel-radius",
    "--db-skin-background-brightness",
    "--db-skin-background-saturation",
    "--db-skin-overlay-opacity",
    "--db-skin-background-image"
  ];

  const state = {
    settings: null,
    observer: null,
    adaptationTimer: null,
    routeTimer: null,
    chromeFrame: null,
    lastSidebarProbeAt: 0,
    lastAdaptationAt: 0,
    previousUrl: location.href,
    compatibility: { score: 0, mode: "inactive", signals: [] },
    elements: { appRoot: null, sidebar: null, composer: null, main: null, header: null },
    adapting: false,
    started: false
  };

  function allowedPage() {
    return location.protocol === "https:" && location.hostname === HOST;
  }

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function hexToRgba(value, alpha = 1) {
    const color = String(value || "").trim();
    if (/^rgba?\(/i.test(color)) return color;
    const normalized = color.replace(/^#/, "");
    const hex = normalized.length === 3
      ? normalized.split("").map((part) => part + part).join("")
      : normalized;
    if (!/^[0-9a-f]{6}$/i.test(hex)) return `rgba(0, 0, 0, ${alpha})`;
    const number = Number.parseInt(hex, 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
  }

  async function loadSettings() {
    const { deepMergeSettings } = globalThis.DoubaoSkinDefaults;
    const result = await chrome.storage.local.get("settings");
    return deepMergeSettings(result.settings || {});
  }

  function setRootVariables(settings) {
    const root = document.documentElement;
    const { colors, effects } = settings;
    const values = {
      "--db-skin-accent": colors.accent,
      "--db-skin-text-primary": colors.textPrimary,
      "--db-skin-text-secondary": colors.textSecondary,
      "--db-skin-panel": hexToRgba(colors.panel, effects.panelOpacity),
      "--db-skin-panel-strong": hexToRgba(colors.panelStrong, effects.strongOpacity),
      "--db-skin-header": hexToRgba(colors.header, effects.strongOpacity),
      "--db-skin-header-text": colors.headerText,
      "--db-skin-header-border": hexToRgba(colors.headerBorder, effects.borderOpacity),
      "--db-skin-sidebar-hover": hexToRgba(colors.sidebarHover, Math.min(0.82, effects.strongOpacity + 0.08)),
      "--db-skin-sidebar-selected": hexToRgba(colors.sidebarSelected, Math.min(0.92, effects.strongOpacity + 0.22)),
      "--db-skin-sidebar-selected-text": colors.sidebarSelectedText,
      "--db-skin-user-message": hexToRgba(colors.userMessage, effects.messageOpacity),
      "--db-skin-user-border": hexToRgba(colors.userBorder, effects.borderOpacity),
      "--db-skin-assistant-message": hexToRgba(colors.assistantMessage, effects.messageOpacity),
      "--db-skin-thinking": hexToRgba(colors.thinking, effects.thinkingOpacity),
      "--db-skin-thinking-border": hexToRgba(colors.thinkingBorder, effects.borderOpacity),
      "--db-skin-thinking-text": colors.thinkingText,
      "--db-skin-dialog": hexToRgba(colors.dialog, effects.strongOpacity),
      "--db-skin-border": hexToRgba(colors.accent, Math.min(0.32, effects.borderOpacity * 0.45)),
      "--db-skin-code-background": hexToRgba(colors.codeBackground, 0.9),
      "--db-skin-glass-blur": `${effects.glassBlur}px`,
      "--db-skin-panel-radius": `${effects.panelRadius}px`,
      "--db-skin-background-brightness": String(effects.brightness),
      "--db-skin-background-saturation": String(effects.saturation),
      "--db-skin-overlay-opacity": String(effects.overlayOpacity),
      "--db-skin-background-image": settings.backgroundDataUrl
        ? `url("${settings.backgroundDataUrl.replace(/["\\\n\r]/g, "")}")`
        : "none"
    };

    for (const [name, value] of Object.entries(values)) {
      root.style.setProperty(name, value);
    }
  }

  function setComponentFlags(settings) {
    const root = document.documentElement;
    root.dataset.dbSkinEnabled = "true";
    root.dataset.dbSkinTheme = settings.themeId;
    root.dataset.dbSkinMode = "dark";
    root.dataset.dbSkinAnimations = String(Boolean(settings.effects.animations));
    root.dataset.dbSkinBackground = String(Boolean(settings.components.background));
    root.dataset.dbSkinHeader = String(Boolean(settings.components.header));
    root.dataset.dbSkinSidebar = String(Boolean(settings.components.sidebar));
    root.dataset.dbSkinComposer = String(Boolean(settings.components.composer));
    root.dataset.dbSkinMessages = String(Boolean(settings.components.messages));
    root.dataset.dbSkinThinking = String(Boolean(settings.components.thinking));
    root.dataset.dbSkinDialogs = String(Boolean(settings.components.dialogs));
    root.dataset.dbSkinColorOverlay = String(Boolean(settings.components.colorOverlay));
  }

  function ensureSkinRoot() {
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    if (!document.body) return null;

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.dataset.dbSkinOwned = "true";
    root.setAttribute("aria-hidden", "true");

    for (const suffix of ["background", "overlay", "glow"]) {
      const layer = document.createElement("div");
      layer.id = `doubao-web-skin-${suffix}`;
      root.appendChild(layer);
    }

    document.body.prepend(root);
    return root;
  }

  function mark(element, role) {
    if (element instanceof HTMLElement) element.dataset.dbSkinRole = role;
    return element;
  }

  function findAppRoot() {
    return document.querySelector("#root") || document.querySelector("[data-reactroot]") || document.body;
  }

  function cachedElement(key, finder) {
    const cached = state.elements[key];
    if (cached instanceof HTMLElement && cached.isConnected && visible(cached)) return cached;
    const found = finder();
    state.elements[key] = found instanceof HTMLElement ? found : null;
    return state.elements[key];
  }

  function clearElementCache() {
    state.elements = { appRoot: null, sidebar: null, composer: null, main: null, header: null };
  }

  const QUICK_SIDEBAR_SELECTOR = [
    "aside",
    '[data-testid*="sidebar" i]',
    '[data-testid*="history" i]',
    '[class*="sidebar" i]',
    '[class*="side-bar" i]',
    '[class*="history" i]'
  ].join(",");

  function sidebarGeometryMatches(element) {
    if (!(element instanceof HTMLElement) || !element.isConnected || !visible(element)) return false;
    const rect = element.getBoundingClientRect();
    return rect.left <= 24 && rect.top <= 120 && rect.height >= innerHeight * 0.5 &&
      rect.width >= 140 && rect.width <= Math.min(520, innerWidth * 0.48) &&
      rect.right <= innerWidth * 0.55;
  }

  function quickFindSidebar(scope = document) {
    const candidates = [];
    if (scope instanceof HTMLElement && scope.matches(QUICK_SIDEBAR_SELECTOR)) candidates.push(scope);
    if (typeof scope?.querySelectorAll === "function") {
      candidates.push(...scope.querySelectorAll(QUICK_SIDEBAR_SELECTOR));
    }
    return candidates.find(sidebarGeometryMatches) || null;
  }

  function findSidebar() {
    const quickMatch = quickFindSidebar(document);
    if (quickMatch) return quickMatch;

    let best = null;
    let bestScore = -1;
    for (const element of document.querySelectorAll("nav, aside, section, div")) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      if (element === document.body || element.id === "root" || element.id === ROOT_ID) continue;
      const rect = element.getBoundingClientRect();
      if (rect.left > 24 || rect.top > 140 || rect.height < innerHeight * 0.55) continue;
      if (rect.width < 140 || rect.width > Math.min(520, innerWidth * 0.48)) continue;
      if (rect.right > innerWidth * 0.55) continue;

      let score = Math.max(0, 30 - Math.abs(rect.left));
      score += Math.min(30, (rect.height / innerHeight) * 30);
      if (rect.top <= 24) score += 12;
      if (element.querySelector("button")) score += 8;
      if (element.querySelector("a")) score += 5;
      const text = (element.innerText || "").slice(0, 1000);
      if (/新建对话|新对话|历史对话|历史记录|new chat|chat history/i.test(text)) score += 35;
      if (/设置|下载客户端|settings|download/i.test(text)) score += 8;
      if (["fixed", "absolute", "sticky"].includes(getComputedStyle(element).position)) score += 5;
      if (score > bestScore) { best = element; bestScore = score; }
    }
    return bestScore >= 42 ? best : null;
  }

  function bindSidebarSelection(sidebar) {
    if (!(sidebar instanceof HTMLElement)) return;

    for (const active of sidebar.querySelectorAll(
      '[aria-current="page"], [aria-current="true"], [aria-selected="true"], [data-state="active"]'
    )) {
      active.dataset.dbSkinSelected = "true";
    }

    if (sidebar.dataset.dbSkinSelectionBound === "true") return;
    sidebar.dataset.dbSkinSelectionBound = "true";
    sidebar.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const sidebarRect = sidebar.getBoundingClientRect();
      let current = target;
      let selected = null;

      while (current instanceof HTMLElement && current !== sidebar) {
        const rect = current.getBoundingClientRect();
        const semantic = current.matches('a, button, [role="button"], [role="link"], [tabindex]');
        if (rect.width >= sidebarRect.width * 0.48 && rect.height >= 24 && rect.height <= 120) {
          selected = current;
          if (semantic) break;
        }
        current = current.parentElement;
      }

      if (!selected) return;
      for (const old of sidebar.querySelectorAll("[data-db-skin-selected]")) {
        delete old.dataset.dbSkinSelected;
      }
      selected.dataset.dbSkinSelected = "true";
    }, true);
  }

  function markSidebarControls(sidebar) {
    if (!(sidebar instanceof HTMLElement)) return 0;
    const sidebarRect = sidebar.getBoundingClientRect();
    const controls = [...sidebar.querySelectorAll('button, a, [role="button"], [role="link"], [tabindex]')]
      .filter((element) => element instanceof HTMLElement && visible(element));
    let count = 0;

    for (const control of controls) {
      const rect = control.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20 || rect.height > 84) continue;
      const label = [control.innerText, control.textContent, control.getAttribute("aria-label"),
        control.getAttribute("title"), control.getAttribute("data-testid")]
        .filter((value) => typeof value === "string").join(" ").replace(/\s+/g, " ").trim();
      let type = "";

      if (/\u65b0\u5efa\u5bf9\u8bdd|\u65b0\u5bf9\u8bdd|new\s*chat/i.test(label)) type = "new-chat";
      else if (/\u641c\u7d22|search/i.test(label)) type = "search";
      else if (/\u6536\u8d77|\u5c55\u5f00|\u4fa7\u8fb9\u680f|\u83dc\u5355|collapse|expand|sidebar|menu/i.test(label)) type = "collapse";
      else if (!label && rect.top <= sidebarRect.top + 112 && rect.width <= 58) type = "top-action";

      if (!type) continue;
      control.dataset.dbSkinSidebarControl = type;
      count += 1;
    }
    return count;
  }

  function applySidebarMarker(sidebar) {
    if (!(sidebar instanceof HTMLElement) || !sidebar.isConnected) return null;
    state.elements.sidebar = sidebar;
    mark(sidebar, "sidebar");
    bindSidebarSelection(sidebar);
    markSidebarControls(sidebar);
    return sidebar;
  }

  function refreshCachedChrome(scope = document) {
    if (!state.settings?.components?.sidebar) return null;
    let sidebar = state.elements.sidebar;
    if (!(sidebar instanceof HTMLElement) || !sidebar.isConnected) {
      sidebar = quickFindSidebar(scope) || quickFindSidebar(document);
    }
    applySidebarMarker(sidebar);

    if (state.settings?.components?.header) {
      const header = state.elements.header;
      if (header instanceof HTMLElement && header.isConnected) mark(header, "header");
    }
    return sidebar;
  }

  function scheduleQuickChromeRefresh() {
    if (state.chromeFrame !== null) return;
    state.chromeFrame = requestAnimationFrame(() => {
      state.chromeFrame = null;
      if (!state.settings?.enabled || !allowedPage()) return;
      if (refreshCachedChrome()) return;

      if (!state.settings?.components?.sidebar) return;
      const now = Date.now();
      if (now - state.lastSidebarProbeAt < 120) return;
      state.lastSidebarProbeAt = now;
      applySidebarMarker(findSidebar());
    });
  }

  function findComposerInput() {
    const candidates = [
      ...document.querySelectorAll('textarea:not([disabled])'),
      ...document.querySelectorAll('[role="textbox"]'),
      ...document.querySelectorAll('[contenteditable]:not([contenteditable="false"])')
    ];
    return candidates.filter((element) => element instanceof HTMLElement &&
      (visible(element) || visible(element.parentElement))).at(-1) || null;
  }

  function findComposer() {
    const input = findComposerInput();
    if (!input) return null;
    const form = input.closest("form");
    if (form) return form;
    let current = input.parentElement;
    for (let depth = 0; current && depth < 6; depth += 1) {
      const rect = current.getBoundingClientRect();
      if (current.querySelector("button") && rect.width >= Math.min(320, innerWidth * 0.5)) return current;
      current = current.parentElement;
    }
    return input.parentElement;
  }

  function elementsAreNear(first, second, padding = 140) {
    if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) return false;
    const firstRect = first.getBoundingClientRect();
    const secondRect = second.getBoundingClientRect();
    return firstRect.right >= secondRect.left - padding &&
      firstRect.left <= secondRect.right + padding &&
      firstRect.bottom >= secondRect.top - padding &&
      firstRect.top <= secondRect.bottom + padding;
  }

  function commonAncestor(elements) {
    const valid = elements.filter((element) => element instanceof HTMLElement);
    if (!valid.length) return null;
    let current = valid[0];
    while (current && !valid.every((element) => current.contains(element))) current = current.parentElement;
    return current;
  }

  function markComposerControls(composer) {
    if (!(composer instanceof HTMLElement)) return 0;
    const nearbyRoot = composer.parentElement?.parentElement || composer.parentElement || composer;
    const modePattern = /^(\u6df1\u5ea6\u601d\u8003|\u667a\u80fd\u641c\u7d22|\u8054\u7f51\u641c\u7d22|deep\s*think|search)$/i;
    const modeButtons = [...nearbyRoot.querySelectorAll('button, [role="button"], [aria-pressed]')]
      .filter((element) => element instanceof HTMLElement && visible(element))
      .filter((element) => modePattern.test((element.innerText || element.textContent || "").trim()))
      .filter((element) => elementsAreNear(element, composer, 180));

    for (const button of modeButtons) button.dataset.dbSkinControl = "mode-toggle";

    const fileInputs = [...nearbyRoot.querySelectorAll('input[type="file"]')]
      .filter((element) => element instanceof HTMLElement && elementsAreNear(element.parentElement, composer, 180));
    const controlElements = [...modeButtons, ...fileInputs];
    const toolbar = commonAncestor(controlElements);

    if (toolbar instanceof HTMLElement && toolbar !== nearbyRoot && toolbar !== composer) {
      toolbar.dataset.dbSkinComposerTools = "true";
      if (toolbar.dataset.dbSkinRole === "thinking") delete toolbar.dataset.dbSkinRole;
    }

    for (const input of fileInputs) {
      const group = input.parentElement;
      if (!(group instanceof HTMLElement)) continue;
      group.dataset.dbSkinUploadGroup = "true";
      const clickables = [...group.querySelectorAll('button, [role="button"]')]
        .filter((element) => element instanceof HTMLElement && !element.parentElement?.closest('button, [role="button"]'));
      const beforeInput = clickables.filter((element) =>
        Boolean(element.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING));
      const afterInput = clickables.filter((element) =>
        Boolean(element.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_PRECEDING));
      const attachment = beforeInput.at(-1);
      const send = afterInput.at(-1);
      if (attachment) attachment.dataset.dbSkinControl = "attachment";
      if (send) send.dataset.dbSkinControl = "send";
    }

    for (const submit of nearbyRoot.querySelectorAll('button[type="submit"], [role="button"][aria-label*="\u53d1\u9001"], [role="button"][aria-label*="send" i]')) {
      if (submit instanceof HTMLElement && elementsAreNear(submit, composer, 180)) {
        submit.dataset.dbSkinControl = "send";
      }
    }

    return modeButtons.length + fileInputs.length;
  }

  function markComposerDock(composer) {
    if (!(composer instanceof HTMLElement)) return 0;
    const composerRect = composer.getBoundingClientRect();
    const roots = new Set();
    let current = composer.parentElement;
    let count = 0;

    for (let depth = 0; current && depth < 9; depth += 1) {
      if (current === document.body || current.id === "root") break;
      roots.add(current);
      current.dataset.dbSkinComposerDock = "true";
      count += 1;
      current = current.parentElement;
    }

    const scanRoot = [...roots].at(-1) || composer.parentElement || document.body;
    const bottomBandTop = Math.max(0, composerRect.top - 190);
    for (const element of scanRoot.querySelectorAll('div, section, footer')) {
      if (!(element instanceof HTMLElement) || element === composer || composer.contains(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < composerRect.width * 0.72) continue;
      if (rect.bottom < bottomBandTop || rect.top > innerHeight + 24) continue;
      if (rect.height < 12 || rect.height > 520) continue;
      const horizontallyOverlaps = rect.right >= composerRect.left - 80 && rect.left <= composerRect.right + 80;
      const touchesViewportBottom = rect.bottom >= innerHeight - 240;
      const overlapsComposerBand = rect.bottom >= composerRect.top - 120 && rect.top <= composerRect.bottom + 180;
      if (!horizontallyOverlaps || (!touchesViewportBottom && !overlapsComposerBand)) continue;
      element.dataset.dbSkinBottomSurface = "true";
      count += 1;
    }
    return count;
  }

  function findMain(composer, sidebar) {
    const semantic = document.querySelector('main, [role="main"], [data-testid*="chat" i], [data-testid*="conversation" i]');
    if (semantic instanceof HTMLElement && visible(semantic)) return semantic;
    if (!(composer instanceof HTMLElement)) return findAppRoot();

    const composerRect = composer.getBoundingClientRect();
    const sidebarRight = sidebar instanceof HTMLElement ? sidebar.getBoundingClientRect().right : 0;
    let current = composer.parentElement;
    let best = composer.parentElement;
    for (let depth = 0; current && depth < 9; depth += 1) {
      const rect = current.getBoundingClientRect();
      if (rect.width >= Math.max(420, innerWidth - sidebarRight - 160) && rect.height >= innerHeight * 0.55) best = current;
      if (rect.left <= composerRect.left + 24 && rect.right >= composerRect.right - 24 && rect.top <= 160) best = current;
      if (current.id === "root" || current === document.body) break;
      current = current.parentElement;
    }
    return best;
  }

  function promoteHeaderShell(element, sidebarRight = 0) {
    if (!(element instanceof HTMLElement)) return element;
    let best = element;
    let current = element.parentElement;
    const baseRect = element.getBoundingClientRect();

    for (let depth = 0; current && depth < 4; depth += 1) {
      if (current === document.body || current.id === "root") break;
      const rect = current.getBoundingClientRect();
      const sameTopBand = rect.top <= baseRect.top + 18 && rect.bottom >= baseRect.bottom - 12;
      const headerSized = rect.height >= 30 && rect.height <= 168;
      const reachesContent = rect.left >= sidebarRight - 48 || rect.width >= innerWidth * 0.78;
      if (sameTopBand && headerSized && reachesContent && rect.width >= best.getBoundingClientRect().width) best = current;
      current = current.parentElement;
    }
    return best;
  }

  function headerGeometryMatches(rect, sidebarRight, maxTop = 140, maxHeight = 180) {
    const startsAfterSidebar = rect.left >= sidebarRight - 32;
    const spansViewport = rect.left <= 32 && rect.right >= innerWidth - 32 && rect.width >= innerWidth * 0.78;
    return rect.top <= maxTop && (startsAfterSidebar || spansViewport) &&
      rect.width >= innerWidth * 0.38 && rect.height >= 28 && rect.height <= maxHeight;
  }

  function findHeader(main, sidebar) {
    const sidebarRight = sidebar instanceof HTMLElement ? sidebar.getBoundingClientRect().right : 0;
    const selectors = [
      "header", '[role="banner"]', '[data-testid*="header" i]', '[data-testid*="title" i]',
      '[class*="header" i]', '[class*="topbar" i]', '[class*="titlebar" i]'
    ];
    for (const element of document.querySelectorAll(selectors.join(","))) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      if (element.closest('[data-db-skin-role="sidebar"]')) continue;
      const rect = element.getBoundingClientRect();
      if (headerGeometryMatches(rect, sidebarRight)) return promoteHeaderShell(element, sidebarRight);
    }

    const scope = main instanceof HTMLElement ? main : document.body;
    for (const heading of scope.querySelectorAll("h1, h2, [role=heading]")) {
      if (!(heading instanceof HTMLElement) || !visible(heading)) continue;
      if (heading.getBoundingClientRect().top > 180) continue;
      let current = heading.parentElement;
      for (let depth = 0; current && depth < 5; depth += 1) {
        const rect = current.getBoundingClientRect();
        if (headerGeometryMatches(rect, sidebarRight, 160, 180)) return promoteHeaderShell(current, sidebarRight);
        current = current.parentElement;
      }
    }

    let best = null;
    let bestScore = -1;
    for (const element of document.querySelectorAll("section, div")) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      if (element.closest('[data-db-skin-role="sidebar"]')) continue;
      const rect = element.getBoundingClientRect();
      const spansViewport = rect.left <= 32 && rect.right >= innerWidth - 32 && rect.width >= innerWidth * 0.78;
      const startsAfterSidebar = rect.left >= sidebarRight - 24;
      if (rect.top > 112 || (!startsAfterSidebar && !spansViewport)) continue;
      if (rect.width < innerWidth * 0.38 || rect.height < 30 || rect.height > 132) continue;
      const text = (element.innerText || "").trim();
      if (!text || text.length > 320) continue;
      const hasControl = Boolean(element.querySelector('button, [role="button"]'));
      if (!hasControl && !spansViewport) continue;
      let score = 24;
      if (hasControl) score += 10;
      if (spansViewport) score += 24;
      if (rect.top <= 28) score += 20;
      if (rect.height <= 84) score += 18;
      if (rect.width >= innerWidth * 0.58) score += 12;
      if (["fixed", "sticky", "absolute"].includes(getComputedStyle(element).position)) score += 8;
      const areaPenalty = Math.min(18, (rect.height / 132) * 18);
      score -= areaPenalty;
      if (score > bestScore) { best = element; bestScore = score; }
    }
    return bestScore >= 38 ? promoteHeaderShell(best, sidebarRight) : null;
  }

  function markCodeBlocks(main) {
    const scope = main instanceof HTMLElement ? main : document.body;
    let count = 0;

    for (const pre of scope.querySelectorAll("pre")) {
      if (!(pre instanceof HTMLElement) || !visible(pre)) continue;
      pre.dataset.dbSkinCodeBody = "true";
      const preRect = pre.getBoundingClientRect();
      let current = pre.parentElement;

      for (let depth = 0; current && depth < 4; depth += 1) {
        if (current.matches('[data-db-skin-role="sidebar"], [data-db-skin-role="composer"]')) break;
        const children = [...current.children];
        const bodyBranch = children.find((child) => child === pre || child.contains(pre));
        const bodyIndex = children.indexOf(bodyBranch);
        if (bodyIndex > 0) {
          const toolbar = children.slice(0, bodyIndex).reverse().find((candidate) => {
            if (!(candidate instanceof HTMLElement) || !visible(candidate)) return false;
            if (!candidate.matches("div, header, section, nav")) return false;
            if (candidate.querySelector("pre, p, ul, ol, table")) return false;
            const rect = candidate.getBoundingClientRect();
            const text = (candidate.innerText || candidate.textContent || "").trim();
            const compactContent = text.length <= 120 || Boolean(candidate.querySelector('button, [role="button"]'));
            return compactContent && rect.height >= 16 && rect.height <= 96 &&
              rect.width >= preRect.width * 0.55 && rect.bottom <= preRect.top + 18 &&
              preRect.top - rect.bottom <= 24;
          });

          if (toolbar) {
            current.dataset.dbSkinCodeBlock = "true";
            toolbar.dataset.dbSkinCodeToolbar = "true";
            count += 1;
            break;
          }
        }
        current = current.parentElement;
      }
    }
    return count;
  }

  const THINKING_TITLE_PATTERN = /^(?:\u5df2\u601d\u8003|\u601d\u8003\u4e2d|\u6df1\u5ea6\u601d\u8003|\u601d\u8003\u8fc7\u7a0b|\u63a8\u7406\u8fc7\u7a0b|thinking|reasoning)/i;

  function promoteThinkingHeader(element, main) {
    if (!(element instanceof HTMLElement)) return null;
    let selected = element;
    let current = element.parentElement;
    for (let depth = 0; current && depth < 4 && current !== main; depth += 1) {
      const rect = current.getBoundingClientRect();
      const text = (current.innerText || "").replace(/\s+/g, " ").trim();
      if (rect.height < 20 || rect.height > 96 || text.length > 110 || !THINKING_TITLE_PATTERN.test(text)) break;
      selected = current;
      current = current.parentElement;
    }
    selected.dataset.dbSkinThinkingHeader = "true";
    return selected;
  }

  function markThinkingHeader(element, main) {
    if (!(element instanceof HTMLElement) || !visible(element)) return null;
    const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
    const rect = element.getBoundingClientRect();
    if (!THINKING_TITLE_PATTERN.test(text) || text.length > 110) return null;
    if (rect.width < 100 || rect.height < 18 || rect.height > 96) return null;
    return promoteThinkingHeader(element, main);
  }

  function markThinking(main) {
    if (!(main instanceof HTMLElement)) return 0;
    const selectors = [
      '[data-testid*="think" i]', '[data-testid*="reason" i]',
      '[class*="thinking" i]', '[class*="reasoning" i]',
      '[aria-label*="\u601d\u8003"]', '[aria-label*="think" i]', '[aria-label*="reason" i]',
      "details"
    ];
    const found = new Set();

    for (const element of main.querySelectorAll(selectors.join(","))) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      if (element.closest('[data-db-skin-role="composer"], [data-db-skin-composer-tools="true"]')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 160 || rect.height < 24) continue;
      const container = element.closest("section, article, details") || element;
      container.dataset.dbSkinRole = "thinking";
      found.add(container);
      const header = container.querySelector("summary, header, button, [role=button]");
      if (header) markThinkingHeader(header, main);
    }

    for (const element of main.querySelectorAll("section, article, details, header, button, [role=button], div")) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      if (element.closest('[data-db-skin-role="composer"], [data-db-skin-composer-tools="true"]')) continue;
      if (element.querySelector('[data-db-skin-control="mode-toggle"], [data-db-skin-composer-tools="true"], input[type="file"]')) continue;
      const text = (element.innerText || "").replace(/\s+/g, " ").trim().slice(0, 110);

      if (THINKING_TITLE_PATTERN.test(text) && text.length <= 110) {
        const header = markThinkingHeader(element, main);
        const details = header?.closest("details");
        if (details) {
          details.dataset.dbSkinRole = "thinking";
          found.add(details);
        }
        if ((header?.getBoundingClientRect().height || 999) <= 96) continue;
      }

      if (!/^(?:\u601d\u8003\u8fc7\u7a0b|\u6df1\u5ea6\u601d\u8003|thinking|reasoning)/i.test(text)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 180 || rect.height < 28 || rect.height > innerHeight * 0.8) continue;
      element.dataset.dbSkinRole = "thinking";
      found.add(element);
    }
    return found.size;
  }

  function markSemanticMessages(scope = document) {
    let user = scope.querySelectorAll?.('[data-db-skin-message="user"]').length || 0;
    let assistant = scope.querySelectorAll?.('[data-db-skin-message="assistant"]').length || 0;
    const candidates = scope.querySelectorAll(
      '[data-message-id], [data-role="user"], [data-role="assistant"], [data-author="user"], [data-author="assistant"], ' +
      '[data-testid*="message" i], [class*="user-message" i], [class*="message-user" i], [class*="assistant-message" i]'
    );

    for (const element of candidates) {
      if (!(element instanceof HTMLElement) || element.dataset.dbSkinMessage) continue;
      const source = [element.dataset.role, element.dataset.author, element.className,
        element.getAttribute("data-testid"), element.getAttribute("aria-label")]
        .filter((value) => typeof value === "string").join(" ").toLowerCase();
      if (/assistant|bot|doubao/.test(source)) {
        element.dataset.dbSkinMessage = "assistant";
        assistant += 1;
      } else if (/\buser\b|human/.test(source)) {
        element.dataset.dbSkinMessage = "user";
        user += 1;
      }
    }
    return { user, assistant };
  }

  function markGeometricUserMessages(main, composer) {
    if (!(main instanceof HTMLElement)) return 0;
    const mainRect = main.getBoundingClientRect();
    const composerRect = composer instanceof HTMLElement ? composer.getBoundingClientRect() : mainRect;
    const composerTop = composerRect.top || innerHeight;
    const contentLeft = composerRect.left || mainRect.left;
    const contentRight = composerRect.right || mainRect.right;
    const contentWidth = Math.max(320, composerRect.width || mainRect.width);
    const contentCenter = contentLeft + contentWidth / 2;
    const candidates = [];

    for (const element of main.querySelectorAll("article, section, div")) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      if (element.dataset.dbSkinMessage || element.closest('[data-db-skin-message], [data-db-skin-role="composer"], [data-db-skin-role="thinking"], [data-db-skin-role="sidebar"]')) continue;
      if (element.querySelector('textarea, [contenteditable="true"], input[type="file"]')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.top >= composerTop - 6 || rect.bottom > composerTop + 18) continue;
      if (rect.width < 42 || rect.width > contentWidth * 0.94) continue;
      if (rect.height < 26 || rect.height > Math.min(920, innerHeight * 1.15)) continue;
      if (Math.abs(contentRight - rect.right) > Math.max(180, contentWidth * 0.22)) continue;
      if (rect.right < contentCenter + 24) continue;

      const content = (element.innerText || "").trim();
      if (!content || content.length > 8000) continue;
      const style = getComputedStyle(element);
      const parentStyle = element.parentElement ? getComputedStyle(element.parentElement) : null;
      const radius = Number.parseFloat(style.borderRadius) || 0;
      const horizontalPadding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
      const hasSurface = style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
      const ownRightAligned = style.marginLeft === "auto" || style.alignSelf === "flex-end" || style.float === "right";
      const parentEndsRight = parentStyle?.justifyContent === "flex-end" || parentStyle?.alignItems === "flex-end";
      const centerIsRight = rect.left + rect.width / 2 > contentCenter + contentWidth * 0.08;
      const richBlocks = element.querySelectorAll('p, li, blockquote, pre, table, h1, h2, h3, h4').length;

      let score = 0;
      if (Math.abs(contentRight - rect.right) <= 56) score += 28;
      else score += 14;
      if (ownRightAligned) score += 28;
      if (parentEndsRight) score += 24;
      if (centerIsRight) score += 20;
      if (rect.width <= contentWidth * 0.72) score += 14;
      if (hasSurface) score += 14;
      if (radius >= 8) score += 12;
      if (horizontalPadding >= 12) score += 8;
      if (richBlocks <= 1) score += 6;
      if (element.childElementCount <= 14) score += 5;
      if (score >= 52) candidates.push({ element, score, area: rect.width * rect.height });
    }

    candidates.sort((a, b) => a.area - b.area || b.score - a.score);
    const selected = [];
    for (const candidate of candidates) {
      if (selected.some((element) => element.contains(candidate.element) || candidate.element.contains(element))) continue;
      candidate.element.dataset.dbSkinMessage = "user";
      candidate.element.dataset.dbSkinDetected = "user-bubble";
      selected.push(candidate.element);
    }
    return selected.length;
  }

  function markGeometricAssistantMessages(main, composer) {
    if (!(main instanceof HTMLElement)) return 0;
    const mainRect = main.getBoundingClientRect();
    const composerRect = composer instanceof HTMLElement ? composer.getBoundingClientRect() : mainRect;
    const composerTop = composerRect.top || innerHeight;
    const contentLeft = composerRect.left || mainRect.left;
    const contentWidth = Math.max(320, composerRect.width || mainRect.width);
    const candidates = [];
    const selector = [
      '[class*="ds-markdown" i]', '[class*="markdown" i]',
      '[data-role="assistant"]', '[data-author="assistant"]',
      '[data-testid*="assistant" i]', '[data-testid*="message" i]',
      'article'
    ].join(',');

    for (const element of main.querySelectorAll(selector)) {
      if (!(element instanceof HTMLElement) || !visible(element)) continue;
      if (element.dataset.dbSkinMessage) continue;
      if (element.closest('[data-db-skin-message="user"], [data-db-skin-role="composer"], [data-db-skin-role="thinking"], [data-db-skin-role="sidebar"]')) continue;
      if (element.querySelector('textarea, [contenteditable="true"], input[type="file"]')) continue;

      const rect = element.getBoundingClientRect();
      if (rect.top >= composerTop - 10 || rect.bottom > composerTop + 18) continue;
      if (rect.width < 180 || rect.width > contentWidth * 1.04) continue;
      if (rect.height < 36 || rect.height > Math.max(1600, innerHeight * 2.5)) continue;

      const content = (element.innerText || "").trim();
      if (content.length < 60 || content.length > 30000) continue;

      const source = [element.className, element.dataset.role, element.dataset.author,
        element.getAttribute("data-testid"), element.getAttribute("aria-label")]
        .filter((value) => typeof value === "string").join(" ").toLowerCase();
      const explicitAssistant = /assistant|doubao|ds-markdown|markdown/.test(source);
      const richBlocks = element.querySelectorAll('p, li, blockquote, pre, table, h1, h2, h3, h4').length;
      const style = getComputedStyle(element);
      const parentStyle = element.parentElement ? getComputedStyle(element.parentElement) : null;
      const rightAligned = style.marginLeft === "auto" || style.alignSelf === "flex-end" ||
        style.float === "right" || parentStyle?.justifyContent === "flex-end";
      if (rightAligned && !explicitAssistant) continue;

      let score = explicitAssistant ? 58 : 10;
      if (element.matches('article')) score += 16;
      if (richBlocks >= 2) score += 22;
      else if (richBlocks === 1) score += 10;
      if (Math.abs(rect.left - contentLeft) <= Math.max(110, contentWidth * 0.16)) score += 16;
      if (rect.width >= contentWidth * 0.45) score += 10;
      if (!rightAligned) score += 8;
      if (score >= 48) candidates.push({ element, score, area: rect.width * rect.height });
    }

    candidates.sort((a, b) => a.area - b.area || b.score - a.score);
    const selected = [];
    for (const candidate of candidates) {
      if (selected.some((element) => element.contains(candidate.element) || candidate.element.contains(element))) continue;
      candidate.element.dataset.dbSkinMessage = "assistant";
      candidate.element.dataset.dbSkinDetected = "assistant-content";
      selected.push(candidate.element);
    }
    return selected.length;
  }

  function markMessages(main, composer) {
    const scope = main instanceof HTMLElement ? main : document;
    const semantic = markSemanticMessages(scope);
    const geometricUser = markGeometricUserMessages(main, composer);
    const geometricAssistant = markGeometricAssistantMessages(main, composer);
    return {
      user: semantic.user + geometricUser,
      assistant: semantic.assistant + geometricAssistant
    };
  }

  function markDialogs() {
    const selectors = ['[role="dialog"]', '[aria-modal="true"]', '[role="menu"]', '[role="listbox"]'];
    let count = 0;
    for (const element of document.querySelectorAll(selectors.join(","))) {
      if (visible(element)) { mark(element, "dialog"); count += 1; }
    }
    return count;
  }

  function calculateCompatibility({ appRoot, sidebar, composer, main, messageCount, thinkingCount }) {
    let score = 0;
    const signals = [];
    if (allowedPage()) { score += 10; signals.push("official-host"); }
    if (appRoot) { score += 20; signals.push("app-root"); }
    if (sidebar) { score += 15; signals.push("sidebar"); }
    if (main) { score += 15; signals.push("main"); }
    if (composer) { score += 25; signals.push("composer"); }
    if (messageCount > 0 || composer) { score += 15; signals.push(messageCount > 0 ? "messages" : "chat-ready"); }
    if (thinkingCount > 0) signals.push("thinking");
    return { score, mode: score >= 80 ? "full" : score >= 60 ? "safe" : "unsupported", signals };
  }

  function forceTransparentBackground(element) {
    if (!(element instanceof HTMLElement)) return;
    const tag = (element.tagName || "").toLowerCase();
    // Never touch body or html — those are handled by base.css.
    if (tag === "body" || tag === "html") return;
    // Only punch through surface-like elements that have a computed
    // background-color or background-image set by the site.
    const style = getComputedStyle(element);
    const hasBgImage = style.backgroundImage && style.backgroundImage !== "none";
    const bgColor = style.backgroundColor || "";
    const isOpaque = bgColor && !/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\)|transparent/.test(bgColor);
    if (hasBgImage || isOpaque) {
      element.style.setProperty("background", "transparent", "important");
      element.style.setProperty("background-color", "transparent", "important");
    }
  }

  function punchBackgroundHoles(scope = document) {
    // Walk known container ancestors that sites typically paint on.
    const targets = [];
    const appRoot = scope.querySelector?.("#root") || scope.querySelector?.("#app");
    if (appRoot) targets.push(appRoot);
    const main = scope.querySelector?.("main, [role='main']");
    if (main) targets.push(main);
    // Also walk up from #root to catch intermediate wrappers.
    if (appRoot?.parentElement) {
      let current = appRoot.parentElement;
      while (current && current !== document.body && current !== document.documentElement) {
        targets.push(current);
        current = current.parentElement;
      }
    }
    for (const el of targets) forceTransparentBackground(el);
  }

  function adaptPage(reason = "manual") {
    if (state.adapting || !state.settings?.enabled || !allowedPage() || !document.body) return;
    state.adapting = true;
    try {
      ensureSkinRoot();
      document.getElementById(LEGACY_BANNER_ID)?.remove();

      // Punch background holes FIRST so the image is never covered.
      punchBackgroundHoles(document);

      const comp = state.settings.components;

      // Always locate elements for geometry reference, but only mark them
      // (set data-db-skin-role) when the corresponding component switch is on.
      const appRoot = mark(cachedElement("appRoot", findAppRoot), "app-root");

      const sidebarElement = cachedElement("sidebar", findSidebar);
      const sidebar = comp.sidebar ? applySidebarMarker(sidebarElement) : null;

      const composerElement = cachedElement("composer", findComposer);
      const composer = comp.composer ? mark(composerElement, "composer") : null;

      const mainElement = cachedElement("main", () => findMain(
        composerElement, comp.sidebar ? sidebarElement : null
      ));
      const main = comp.messages ? mark(mainElement, "main") : null;

      const headerElement = cachedElement("header", () => findHeader(
        mainElement, comp.sidebar ? sidebarElement : null
      ));
      const header = comp.header ? mark(headerElement, "header") : null;

      if (comp.composer) {
        markComposerControls(composer);
        markComposerDock(composer);
      } else {
        markComposerDock(composerElement);
      }

      const codeBlockCount = comp.messages ? markCodeBlocks(main) : 0;
      const thinkingCount = comp.thinking ? markThinking(main) : 0;
      const messageResult = comp.messages ? markMessages(main, composer) : { user: 0, assistant: 0 };
      const messageCount = messageResult.user + messageResult.assistant;
      const dialogCount = comp.dialogs ? markDialogs() : 0;

      state.compatibility = calculateCompatibility({ appRoot, sidebar, composer, main, messageCount, thinkingCount });
      state.compatibility.reason = reason;
      state.compatibility.headerFound = Boolean(header);
      state.compatibility.codeBlockCount = codeBlockCount;
      state.compatibility.dialogCount = dialogCount;
      state.compatibility.userMessageCount = messageResult.user;
      state.compatibility.assistantMessageCount = messageResult.assistant;
      state.compatibility.thinkingCount = thinkingCount;
    } finally {
      state.lastAdaptationAt = Date.now();
      state.adapting = false;
    }
  }

  function scheduleAdaptation(reason) {
    const elapsed = Date.now() - state.lastAdaptationAt;
    const delay = reason === "dom-change"
      ? Math.min(180, Math.max(0, 700 - elapsed))
      : reason === "route-change" ? 30 : 0;
    clearTimeout(state.adaptationTimer);
    state.adaptationTimer = setTimeout(() => {
      state.adaptationTimer = null;
      adaptPage(reason);
    }, delay);
  }

  function startWatchers() {
    if (!state.observer) {
      state.observer = new MutationObserver((mutations) => {
        if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof HTMLElement && refreshCachedChrome(node)) break;
            }
          }
          refreshCachedChrome();
          scheduleQuickChromeRefresh();
          scheduleAdaptation("dom-change");
        }
      });
      state.observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    if (!state.routeTimer) {
      state.routeTimer = setInterval(() => {
        if (location.href !== state.previousUrl) {
          state.previousUrl = location.href;
          clearElementCache();
          scheduleAdaptation("route-change");
        }
      }, 500);
    }
  }

  function stopWatchers() {
    state.observer?.disconnect();
    state.observer = null;
    clearInterval(state.routeTimer);
    state.routeTimer = null;
    clearTimeout(state.adaptationTimer);
    state.adaptationTimer = null;
    if (state.chromeFrame !== null) cancelAnimationFrame(state.chromeFrame);
    state.chromeFrame = null;
    state.adapting = false;
  }

  function cleanup() {
    stopWatchers();
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(LEGACY_BANNER_ID)?.remove();
    for (const element of document.querySelectorAll("[data-db-skin-role]")) delete element.dataset.dbSkinRole;
    for (const element of document.querySelectorAll("[data-db-skin-message]")) delete element.dataset.dbSkinMessage;
    for (const element of document.querySelectorAll("[data-db-skin-detected]")) delete element.dataset.dbSkinDetected;
    for (const element of document.querySelectorAll("[data-db-skin-selected]")) delete element.dataset.dbSkinSelected;
    for (const element of document.querySelectorAll("[data-db-skin-control]")) delete element.dataset.dbSkinControl;
    for (const element of document.querySelectorAll("[data-db-skin-composer-tools]")) delete element.dataset.dbSkinComposerTools;
    for (const element of document.querySelectorAll("[data-db-skin-upload-group]")) delete element.dataset.dbSkinUploadGroup;
    for (const element of document.querySelectorAll("[data-db-skin-sidebar-control]")) delete element.dataset.dbSkinSidebarControl;
    for (const element of document.querySelectorAll("[data-db-skin-composer-dock]")) delete element.dataset.dbSkinComposerDock;
    for (const element of document.querySelectorAll("[data-db-skin-bottom-surface]")) delete element.dataset.dbSkinBottomSurface;
    for (const element of document.querySelectorAll("[data-db-skin-thinking-header]")) delete element.dataset.dbSkinThinkingHeader;
    for (const element of document.querySelectorAll("[data-db-skin-code-block]")) delete element.dataset.dbSkinCodeBlock;
    for (const element of document.querySelectorAll("[data-db-skin-code-toolbar]")) delete element.dataset.dbSkinCodeToolbar;
    for (const element of document.querySelectorAll("[data-db-skin-code-body]")) delete element.dataset.dbSkinCodeBody;

    const root = document.documentElement;
    for (const name of VARIABLE_NAMES) root.style.removeProperty(name);
    for (const key of [
      "dbSkinEnabled", "dbSkinTheme", "dbSkinMode", "dbSkinAnimations", "dbSkinBackground",
      "dbSkinHeader", "dbSkinSidebar", "dbSkinComposer", "dbSkinMessages", "dbSkinThinking", "dbSkinDialogs", "dbSkinColorOverlay"
    ]) delete root.dataset[key];
    clearElementCache();
    state.compatibility = { score: 0, mode: "inactive", signals: [] };
  }

  async function applySettings() {
    state.settings = await loadSettings();
    if (!state.settings.enabled || !allowedPage()) { cleanup(); return; }
    setRootVariables(state.settings);
    setComponentFlags(state.settings);
    ensureSkinRoot();
    adaptPage("settings-applied");
    startWatchers();
  }

  async function bootstrap() {
    if (state.started || !allowedPage()) return;
    state.started = true;
    await applySettings();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        if (!state.settings?.enabled) return;
        ensureSkinRoot();
        scheduleQuickChromeRefresh();
        scheduleAdaptation("dom-ready");
      }, { once: true });
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.settings) void applySettings();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "settings-changed") {
      void applySettings().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (message?.type === "get-status") {
      sendResponse({ enabled: Boolean(state.settings?.enabled), compatibility: state.compatibility, url: location.href });
    }
    return undefined;
  });

  void bootstrap();
})();


