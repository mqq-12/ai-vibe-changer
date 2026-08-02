const COLOR_GROUPS = Object.freeze({
  ocean: {
    name: "海洋蓝",
    colors: {
      accent: "#72d6ff",
      textPrimary: "#f8fbff",
      textSecondary: "#c5d2df",
      panel: "#122234",
      panelStrong: "#0c1a2a",
      header: "#17304a",
      headerText: "#f8fbff",
      headerBorder: "#72d6ff",
      sidebarHover: "#234760",
      sidebarSelected: "#2d78a6",
      sidebarSelectedText: "#ffffff",
      userMessage: "#315f91",
      userBorder: "#72d6ff",
      assistantMessage: "#122438",
      thinking: "#17344f",
      thinkingBorder: "#5ab8e8",
      thinkingText: "#eefaff",
      dialog: "#0c1a2a",
      codeBackground: "#03080f"
    }
  },
  violet: {
    name: "紫罗兰",
    colors: {
      accent: "#d0b7ff",
      textPrimary: "#fffaff",
      textSecondary: "#d9cce9",
      panel: "#2d1d44",
      panelStrong: "#221537",
      header: "#382354",
      headerText: "#fffaff",
      headerBorder: "#d0b7ff",
      sidebarHover: "#4b3370",
      sidebarSelected: "#7450a6",
      sidebarSelectedText: "#ffffff",
      userMessage: "#6847a0",
      userBorder: "#d0b7ff",
      assistantMessage: "#312048",
      thinking: "#3c2858",
      thinkingBorder: "#b68ee9",
      thinkingText: "#fff8ff",
      dialog: "#221537",
      codeBackground: "#0b0611"
    }
  },
  forest: {
    name: "森林绿",
    colors: {
      accent: "#83e8af",
      textPrimary: "#f5fff9",
      textSecondary: "#c4ddcf",
      panel: "#103026",
      panelStrong: "#0a251d",
      header: "#153d30",
      headerText: "#f5fff9",
      headerBorder: "#83e8af",
      sidebarHover: "#245b46",
      sidebarSelected: "#2d7b5a",
      sidebarSelectedText: "#ffffff",
      userMessage: "#28694d",
      userBorder: "#83e8af",
      assistantMessage: "#103528",
      thinking: "#164936",
      thinkingBorder: "#6ed59c",
      thinkingText: "#f1fff7",
      dialog: "#0a251d",
      codeBackground: "#03100b"
    }
  },
  amber: {
    name: "暖金棕",
    colors: {
      accent: "#ffc86b",
      textPrimary: "#fffaf1",
      textSecondary: "#dfcfb8",
      panel: "#3b2c1d",
      panelStrong: "#2b1f14",
      header: "#4a351f",
      headerText: "#fffaf1",
      headerBorder: "#ffc86b",
      sidebarHover: "#654829",
      sidebarSelected: "#8a5f2b",
      sidebarSelectedText: "#ffffff",
      userMessage: "#76512c",
      userBorder: "#ffc86b",
      assistantMessage: "#46321f",
      thinking: "#594025",
      thinkingBorder: "#e1a653",
      thinkingText: "#fff8e9",
      dialog: "#2b1f14",
      codeBackground: "#100b06"
    }
  },
  graphite: {
    name: "石墨灰",
    colors: {
      accent: "#a8d4ff",
      textPrimary: "#ffffff",
      textSecondary: "#cbd3dc",
      panel: "#252a31",
      panelStrong: "#1b1f25",
      header: "#303842",
      headerText: "#ffffff",
      headerBorder: "#a8d4ff",
      sidebarHover: "#3d4651",
      sidebarSelected: "#526273",
      sidebarSelectedText: "#ffffff",
      userMessage: "#465462",
      userBorder: "#a8d4ff",
      assistantMessage: "#2a3038",
      thinking: "#343d47",
      thinkingBorder: "#8ba9c5",
      thinkingText: "#f6fbff",
      dialog: "#1b1f25",
      codeBackground: "#090b0e"
    }
  }
});

const DEFAULT_SETTINGS = Object.freeze({
  visualVersion: 3,
  enabled: true,
  themeId: "midnight-ocean",
  colorGroupId: "ocean",
  backgroundDataUrl: "",
  backgroundName: "",
  colors: { ...COLOR_GROUPS.ocean.colors },
  effects: {
    brightness: 0.82,
    saturation: 1,
    overlayOpacity: 0.30,
    glassBlur: 16,
    panelRadius: 18,
    panelOpacity: 0.42,
    strongOpacity: 0.58,
    messageOpacity: 0.42,
    thinkingOpacity: 0.50,
    borderOpacity: 0.55,
    animations: true
  },
  components: {
    background: true,
    header: true,
    sidebar: true,
    composer: true,
    messages: true,
    thinking: true,
    dialogs: true,
    colorOverlay: true,
    welcomeBanner: false
  }
});

const PRESETS = Object.freeze({
  "midnight-ocean": {
    name: "Midnight Ocean",
    colorGroupId: "ocean",
    colors: { ...COLOR_GROUPS.ocean.colors },
    effects: { ...DEFAULT_SETTINGS.effects }
  },
  "violet-dream": {
    name: "Violet Dream",
    colorGroupId: "violet",
    colors: { ...COLOR_GROUPS.violet.colors },
    effects: { ...DEFAULT_SETTINGS.effects, saturation: 1.06 }
  },
  "forest-night": {
    name: "Forest Night",
    colorGroupId: "forest",
    colors: { ...COLOR_GROUPS.forest.colors },
    effects: { ...DEFAULT_SETTINGS.effects, brightness: 0.76 }
  },
  "warm-amber": {
    name: "Warm Amber",
    colorGroupId: "amber",
    colors: { ...COLOR_GROUPS.amber.colors },
    effects: { ...DEFAULT_SETTINGS.effects, brightness: 0.78, overlayOpacity: 0.26 }
  },
  "graphite-glass": {
    name: "Graphite Glass",
    colorGroupId: "graphite",
    colors: { ...COLOR_GROUPS.graphite.colors },
    effects: { ...DEFAULT_SETTINGS.effects, saturation: 0.82 }
  }
});

function deepMergeSettings(stored = {}) {
  const themeId = stored.themeId in PRESETS ? stored.themeId : DEFAULT_SETTINGS.themeId;
  const requestedGroup = stored.colorGroupId in COLOR_GROUPS
    ? stored.colorGroupId
    : PRESETS[themeId].colorGroupId;
  const group = COLOR_GROUPS[requestedGroup];
  const base = {
    ...DEFAULT_SETTINGS,
    themeId,
    colorGroupId: requestedGroup,
    colors: { ...DEFAULT_SETTINGS.colors, ...group.colors },
    effects: { ...DEFAULT_SETTINGS.effects },
    components: { ...DEFAULT_SETTINGS.components }
  };

  // Version 3 introduces selectable color groups and dedicated colors for
  // sidebar selection, user borders and reasoning panels. Keep the user's
  // background image and high-level component choices during migration.
  if (stored.visualVersion !== DEFAULT_SETTINGS.visualVersion) {
    return {
      ...base,
      enabled: stored.enabled ?? base.enabled,
      backgroundDataUrl: stored.backgroundDataUrl || "",
      backgroundName: stored.backgroundName || "",
      components: {
        ...base.components,
        ...(stored.components || {}),
        welcomeBanner: false,
        thinking: true
      }
    };
  }

  return {
    ...base,
    ...stored,
    colors: { ...base.colors, ...(stored.colors || {}) },
    effects: { ...base.effects, ...(stored.effects || {}) },
    components: {
      ...base.components,
      ...(stored.components || {}),
      welcomeBanner: false
    }
  };
}

globalThis.DoubaoSkinDefaults = {
  COLOR_GROUPS,
  DEFAULT_SETTINGS,
  PRESETS,
  deepMergeSettings
};
