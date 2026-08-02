# Doubao 网页版皮肤自定义：工作流程与实现原理

## 一、项目定位

这个项目的目标是为 Doubao 网页版提供一套可安装、可切换、可恢复的运行时皮肤系统。

核心原理可以概括为：

> 通过 Chrome、Edge 等 Chromium 浏览器扩展，在经过白名单验证的 Doubao 页面中注入主题 CSS、背景资源和少量页面适配 JavaScript，从而改变页面外观，但不修改 Doubao 官方服务器文件、接口请求和对话业务逻辑。

它不是：

- 修改浏览器程序；
- 修改 Doubao 官方服务器文件；
- 替换 Doubao 的 JavaScript 包；
- 在页面上覆盖一张不可操作的截图；
- 拦截或修改模型请求；
- 读取并上传用户对话内容。

它主要调整：

- 页面背景；
- 左侧会话栏；
- 欢迎页；
- 用户消息和 AI 消息；
- 输入区域；
- 模型选择器；
- 深度思考和联网搜索按钮；
- 代码块；
- 菜单、弹窗和提示框；
- 字体、颜色、透明度、圆角和阴影。

Doubao 原生控件仍然是真实 DOM 元素，原来的点击、输入、滚动和复制功能继续由官方页面负责。

---

## 二、总体工作流程

```text
用户安装浏览器扩展
        ↓
打开扩展设置页面
        ↓
选择内置主题或创建自定义主题
        ↓
选择背景图片、颜色和视觉参数
        ↓
扩展压缩并保存主题资源
        ↓
用户打开 Doubao 官方网页
        ↓
扩展检查域名白名单
        ↓
Content Script 启动
        ↓
验证页面身份与基础 DOM 特征
        ↓
读取当前启用的主题配置
        ↓
创建背景层、遮罩层和主题样式
        ↓
识别侧边栏、消息区和输入区域
        ↓
给原生元素添加语义标记
        ↓
通过 CSS 改变界面外观
        ↓
监听页面路由切换和 DOM 重建
        ↓
必要时自动重新识别并补回主题
        ↓
用户可随时暂停、切换或恢复默认界面
```

---

## 三、推荐实现方式

Doubao 网页版推荐使用浏览器扩展，而不是 CDP 调试端口。

推荐技术方案：

```text
浏览器平台：Chrome / Edge
扩展规范：Manifest V3
开发语言：TypeScript
构建工具：Vite
主题系统：CSS Variables
配置校验：Zod 或 JSON Schema
本地存储：chrome.storage.local
大图存储：IndexedDB
页面监控：MutationObserver
路由监控：History API + popstate
自动化测试：Vitest + Playwright
```

使用浏览器扩展的原因：

- 不需要重启浏览器；
- 不需要开放本机调试端口；
- 页面刷新后可以自动重新加载；
- 权限范围可以限制到指定网站；
- 安装和卸载简单；
- 可以使用浏览器提供的安全存储；
- 可以提供独立设置页和主题编辑器；
- 不需要修改 Doubao 官方文件。

---

## 四、系统架构

```text
Doubao Web Skin Extension
├── Manifest
│   └── manifest.json
│
├── Background Service Worker
│   ├── 扩展生命周期管理
│   ├── 消息转发
│   ├── 标签页状态管理
│   └── 主题切换通知
│
├── Content Script
│   ├── 页面身份验证
│   ├── 主题样式注入
│   ├── 原生 DOM 识别
│   ├── 语义属性标记
│   ├── 页面变化监控
│   └── 主题恢复与清理
│
├── Page Adapter
│   ├── 欢迎页适配器
│   ├── 对话页适配器
│   ├── 侧边栏适配器
│   ├── 消息适配器
│   ├── 输入区域适配器
│   └── 弹窗适配器
│
├── Theme Engine
│   ├── 主题配置读取
│   ├── CSS 变量生成
│   ├── 主题资源解析
│   ├── 组件开关处理
│   └── 兼容模式处理
│
├── Theme Studio
│   ├── 背景图片选择
│   ├── 图片压缩与裁剪
│   ├── 配色编辑
│   ├── 参数预览
│   └── 主题导入导出
│
├── Storage
│   ├── 用户设置
│   ├── 主题配置
│   ├── 图片资源
│   └── 兼容性状态
│
└── Safety Layer
    ├── 域名白名单
    ├── 配置校验
    ├── 主题包检查
    ├── 日志脱敏
    └── 安全降级
```

---

## 五、浏览器扩展加载流程

浏览器打开 Doubao 页面后，会根据扩展清单中的匹配规则决定是否加载 Content Script。

示意配置：

```json
{
  "manifest_version": 3,
  "name": "Doubao Web Skin",
  "version": "1.0.0",
  "description": "Doubao 网页版运行时主题扩展",
  "permissions": [
    "storage"
  ],
  "host_permissions": [
    "https://已确认的-doubao-官方域名/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://已确认的-doubao-官方域名/*"
      ],
      "js": [
        "content/index.js"
      ],
      "css": [
        "content/base.css"
      ],
      "run_at": "document_start"
    }
  ],
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "options_page": "options/index.html",
  "action": {
    "default_popup": "popup/index.html"
  },
  "web_accessible_resources": [
    {
      "resources": [
        "assets/*",
        "themes/*"
      ],
      "matches": [
        "https://已确认的-doubao-官方域名/*"
      ]
    }
  ]
}
```

实际发布前应把占位域名替换为经过核实的 Doubao 官方网页域名，并尽量精确限制路径。

不建议使用：

```json
{
  "host_permissions": ["<all_urls>"]
}
```

皮肤扩展没有必要访问所有网站。

---

## 六、页面身份验证

仅仅依靠浏览器扩展的 `matches` 规则还不够。Content Script 启动后，还应进行第二次页面验证。

验证内容包括：

1. 当前协议是否为 HTTPS；
2. 当前主机名是否在白名单中；
3. 当前路径是否属于 Doubao 聊天页面；
4. 页面中是否存在基础应用容器；
5. 是否存在输入区域、导航区域或欢迎页特征；
6. 当前页面是否不是外部授权页；
7. 当前页面是否不是支付页或第三方嵌入页。

示意代码：

```ts
const ALLOWED_HOSTS = new Set([
  "已确认的-doubao-官方域名"
]);

export function isAllowedLocation(location: Location): boolean {
  if (location.protocol !== "https:") {
    return false;
  }

  return ALLOWED_HOSTS.has(location.hostname);
}
```

DOM 身份检查：

```ts
export function hasDoubaoPageSignals(): boolean {
  const hasAppRoot = Boolean(
    document.querySelector("#root") ||
    document.querySelector("main")
  );

  const hasChatSignal = Boolean(
    document.querySelector("textarea") ||
    document.querySelector('[contenteditable="true"]')
  );

  const hasNavigationSignal = Boolean(
    document.querySelector("nav") ||
    document.querySelector("aside")
  );

  return hasAppRoot && (hasChatSignal || hasNavigationSignal);
}
```

这里的代码只是结构示例。正式适配时应根据经过验证的 Doubao 页面结构建立更严格的规则。

如果验证失败：

```text
页面验证失败
      ↓
不注入增强 JavaScript
      ↓
不创建主题组件
      ↓
记录本地兼容性状态
      ↓
在扩展图标中提示“当前页面不受支持”
```

---

## 七、主题启动流程

页面身份验证通过后，主题引擎开始启动。

```text
读取扩展总开关
      ↓
检查当前站点是否允许启用
      ↓
读取 activeThemeId
      ↓
读取主题 JSON 配置
      ↓
校验 schemaVersion
      ↓
读取背景图片资源
      ↓
生成 CSS 变量
      ↓
设置 HTML 根节点主题标记
      ↓
创建背景、遮罩和光效元素
      ↓
注入或更新主题 style
      ↓
运行页面适配器
      ↓
启动路由和 DOM 监控
```

根节点标记示例：

```html
<html
  data-db-skin-enabled="true"
  data-db-skin-theme="midnight-ocean"
  data-db-skin-mode="dark"
>
```

主题 CSS 只在这个标记存在时生效：

```css
html[data-db-skin-enabled="true"] {
    --db-skin-accent: #72d6ff;
    --db-skin-panel: rgba(9, 17, 29, 0.72);
    --db-skin-text-primary: #f5f9ff;
}
```

当主题被关闭时，只要移除根节点标记，大部分主题样式就会立即失效。

---

## 八、主题配置文件

每个主题使用独立配置：

```json
{
  "schemaVersion": 1,
  "id": "midnight-ocean",
  "name": "Midnight Ocean",
  "description": "深海蓝色磨砂主题",
  "author": "Local User",
  "target": "doubao-web",
  "mode": "dark",
  "background": {
    "assetId": "background-midnight-ocean",
    "positionX": 50,
    "positionY": 50,
    "size": "cover",
    "brightness": 0.58,
    "saturation": 0.92,
    "contrast": 1.05,
    "blur": 0,
    "scale": 1.02
  },
  "overlay": {
    "enabled": true,
    "topOpacity": 0.28,
    "bottomOpacity": 0.72,
    "color": "#040810"
  },
  "colors": {
    "accent": "#72d6ff",
    "accentHover": "#9ee4ff",
    "textPrimary": "#f5f9ff",
    "textSecondary": "#aab8ca",
    "panel": "rgba(9, 17, 29, 0.72)",
    "panelStrong": "rgba(7, 13, 23, 0.90)",
    "userMessage": "rgba(76, 139, 245, 0.20)",
    "assistantMessage": "rgba(13, 22, 36, 0.62)",
    "border": "rgba(255, 255, 255, 0.10)",
    "codeBackground": "rgba(3, 8, 15, 0.92)"
  },
  "effects": {
    "glassBlur": 22,
    "panelRadius": 18,
    "shadowStrength": 0.28,
    "ambientGlow": true,
    "animations": true
  },
  "components": {
    "background": true,
    "welcomeBanner": true,
    "transparentSidebar": true,
    "glassMessages": true,
    "glassComposer": true,
    "styledCodeBlocks": true,
    "styledDialogs": true
  },
  "accessibility": {
    "minimumContrast": 4.5,
    "reduceMotion": false,
    "opaqueCodeBlocks": true,
    "disableBackgroundDuringFocus": false
  }
}
```

主题配置在使用前必须通过 Schema 校验，防止错误值破坏页面。

---

## 九、主题 CSS 生成原理

主题引擎将 JSON 配置转换成 CSS Variables：

```ts
function createThemeVariables(theme: ThemeConfig): string {
  return `
    --db-skin-accent: ${theme.colors.accent};
    --db-skin-accent-hover: ${theme.colors.accentHover};
    --db-skin-text-primary: ${theme.colors.textPrimary};
    --db-skin-text-secondary: ${theme.colors.textSecondary};
    --db-skin-panel: ${theme.colors.panel};
    --db-skin-panel-strong: ${theme.colors.panelStrong};
    --db-skin-border: ${theme.colors.border};
    --db-skin-glass-blur: ${theme.effects.glassBlur}px;
    --db-skin-panel-radius: ${theme.effects.panelRadius}px;
  `;
}
```

生成结果被写入固定的样式元素：

```html
<style id="doubao-web-skin-theme-style">
    html[data-db-skin-enabled="true"] {
        --db-skin-accent: #72d6ff;
        --db-skin-panel: rgba(9, 17, 29, 0.72);
    }
</style>
```

固定 ID 可以保证主题更新时只替换原样式，而不会重复插入。

```ts
export function installThemeStyle(cssText: string): void {
  const styleId = "doubao-web-skin-theme-style";

  let style = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }

  if (style.textContent !== cssText) {
    style.textContent = cssText;
  }
}
```

---

## 十、背景图片处理流程

用户选择背景图片后，不能直接把未经处理的超大原图注入页面。

```text
用户选择图片
      ↓
检查 MIME 类型和扩展名
      ↓
检查原始文件大小
      ↓
使用 createImageBitmap 解码
      ↓
修正图片方向
      ↓
计算目标尺寸
      ↓
Canvas 等比例缩放
      ↓
按设置进行裁剪
      ↓
转换为 WebP 或 JPEG
      ↓
检查处理后大小
      ↓
生成预览缩略图
      ↓
保存到 IndexedDB
      ↓
主题配置保存 assetId
```

推荐约束：

```text
允许格式：PNG / JPEG / WebP
原图上限：建议 30MB
最长边：建议不超过 3200px
处理后目标：建议不超过 8MB
处理后硬上限：16MB
缩略图宽度：480～720px
```

图片处理示例：

```ts
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 3200;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("无法创建图片处理上下文");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.convertToBlob({
    type: "image/webp",
    quality: 0.88
  });
}
```

---

## 十一、主题图片存储原理

小型设置适合保存在：

```text
chrome.storage.local
```

大型背景图更适合存入：

```text
IndexedDB
```

原因是背景图可能达到数 MB，不适合反复序列化到普通 JSON 存储中。

推荐存储结构：

```text
chrome.storage.local
├── settings
├── activeThemeId
├── themeMetadata
└── compatibilityState

IndexedDB: doubao-skin-assets
├── background Blob
├── preview Blob
├── assetId
├── mimeType
├── width
├── height
└── sha256
```

Content Script 获取 Blob 后创建临时 URL：

```ts
const blob = await loadThemeAsset(assetId);
const objectUrl = URL.createObjectURL(blob);

document.documentElement.style.setProperty(
  "--db-skin-background-image",
  `url("${objectUrl}")`
);
```

切换主题或关闭主题时要释放旧 URL：

```ts
URL.revokeObjectURL(previousObjectUrl);
```

防止长时间使用后积累内存。

---

## 十二、视觉层结构

推荐创建以下主题层：

```html
<div id="doubao-web-skin-root" aria-hidden="true">
    <div id="doubao-web-skin-background"></div>
    <div id="doubao-web-skin-overlay"></div>
    <div id="doubao-web-skin-glow"></div>
    <div id="doubao-web-skin-texture"></div>
</div>
```

样式示例：

```css
#doubao-web-skin-root {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
    contain: strict;
}

#doubao-web-skin-background {
    position: absolute;
    inset: 0;
    background-image: var(--db-skin-background-image);
    background-size: cover;
    background-position:
        var(--db-skin-background-x, 50%)
        var(--db-skin-background-y, 50%);
    background-repeat: no-repeat;
    filter:
        brightness(var(--db-skin-background-brightness, 0.6))
        saturate(var(--db-skin-background-saturation, 1));
    transform: scale(var(--db-skin-background-scale, 1.02));
}

#doubao-web-skin-overlay {
    position: absolute;
    inset: 0;
    background:
        linear-gradient(
            180deg,
            rgba(4, 8, 16, 0.28),
            rgba(4, 8, 16, 0.72)
        );
}

#doubao-web-skin-glow {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(
            circle at 72% 8%,
            rgba(71, 173, 255, 0.18),
            transparent 46%
        );
}
```

纯装饰层必须设置 `pointer-events: none`，保证不会挡住 Doubao 原生控件。

---

## 十三、原生页面适配原理

主题样式不应大量依赖 Doubao 构建后生成的随机类名。

错误示例：

```css
.dc04ec1d .f72b0ab3 .a49f8932 {
    background: transparent;
}
```

页面重新构建后，这些类名可能发生变化。

推荐建立页面适配器，由适配器负责寻找原生元素，然后添加项目自己的语义属性。

```ts
interface DoubaoElements {
  appRoot?: HTMLElement;
  sidebar?: HTMLElement;
  main?: HTMLElement;
  messageList?: HTMLElement;
  composer?: HTMLElement;
  welcome?: HTMLElement;
}
```

识别后添加属性：

```ts
function markElement(
  element: HTMLElement | null,
  role: string
): void {
  if (!element) {
    return;
  }

  element.dataset.dbSkinRole = role;
}
```

标记结果：

```html
<aside data-db-skin-role="sidebar">...</aside>
<main data-db-skin-role="main">...</main>
<div data-db-skin-role="message-list">...</div>
<form data-db-skin-role="composer">...</form>
```

主题 CSS 使用自己的语义标记：

```css
html[data-db-skin-enabled="true"]
[data-db-skin-role="sidebar"] {
    background: rgba(8, 15, 26, 0.70) !important;
    backdrop-filter: blur(22px) saturate(125%);
    border-right: 1px solid rgba(255, 255, 255, 0.10);
}
```

这种方式将两部分分离：

```text
Page Adapter：负责理解 Doubao 页面结构
Theme CSS：负责呈现主题视觉效果
```

Doubao 页面更新后，通常只需要修改适配器，而不需要重写所有主题。

---

## 十四、元素识别策略

选择器推荐优先级：

1. 官方稳定的 `data-*` 属性；
2. `aria-label`、`aria-labelledby`；
3. `role` 语义属性；
4. 表单类型和输入属性；
5. 稳定的父子结构；
6. 本地化按钮语义；
7. CSS 类名；
8. 谨慎使用结构推断。

示意代码：

```ts
function findComposer(): HTMLElement | null {
  const byTestId = document.querySelector<HTMLElement>(
    '[data-testid="chat-input"]'
  );

  if (byTestId) {
    return byTestId.closest("form") ?? byTestId;
  }

  const textarea = document.querySelector<HTMLTextAreaElement>("textarea");

  if (textarea) {
    return textarea.closest("form") ?? textarea.parentElement;
  }

  const editable = document.querySelector<HTMLElement>(
    '[contenteditable="true"][role="textbox"]'
  );

  return editable?.closest("form") ?? editable?.parentElement ?? null;
}
```

不能仅凭页面上出现一个 `textarea` 就认定它是 Doubao 输入框。正式代码还应检查所在区域、附近按钮和页面整体结构。

---

## 十五、欢迎页主题横幅

主题可以在 Doubao 欢迎页中插入一个独立横幅，但必须满足以下条件：

- 已确认当前是欢迎页；
- 已找到稳定的欢迎页挂载容器；
- 横幅不存在时才创建；
- 不覆盖原生推荐卡片；
- 不阻止输入区域点击；
- 页面进入对话后自动隐藏或移除。

```ts
function ensureWelcomeBanner(container: HTMLElement): void {
  const bannerId = "doubao-web-skin-welcome-banner";

  if (document.getElementById(bannerId)) {
    return;
  }

  const banner = document.createElement("section");
  banner.id = bannerId;
  banner.dataset.dbSkinOwned = "true";
  banner.innerHTML = `
    <div class="db-skin-banner-content">
      <div class="db-skin-banner-name">Midnight Ocean</div>
      <div class="db-skin-banner-title">探索问题，也探索答案之外的世界</div>
    </div>
  `;

  container.prepend(banner);
}
```

横幅内容不能直接拼接未经转义的外部文本。用户自定义文字应使用 `textContent` 写入，避免 HTML 注入。

---

## 十六、消息区域主题

适配器识别消息后，可以添加：

```html
<article data-db-skin-message="user">...</article>
<article data-db-skin-message="assistant">...</article>
```

样式示例：

```css
html[data-db-skin-enabled="true"]
[data-db-skin-message="user"] {
    background: var(--db-skin-user-message);
    border: 1px solid color-mix(
        in srgb,
        var(--db-skin-accent) 24%,
        transparent
    );
    border-radius: var(--db-skin-panel-radius);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}

html[data-db-skin-enabled="true"]
[data-db-skin-message="assistant"] {
    background: var(--db-skin-assistant-message);
    border: 1px solid var(--db-skin-border);
    border-radius: var(--db-skin-panel-radius);
    backdrop-filter: blur(16px);
}
```

主题只修改消息容器的外观，不应该：

- 修改消息文本；
- 改写 Markdown；
- 移动或删除代码；
- 修改引用来源；
- 改变重新生成操作；
- 修改复制按钮业务逻辑；
- 读取并上传用户对话。

---

## 十七、代码块主题

代码块应使用相对不透明的背景，以保证可读性：

```css
html[data-db-skin-enabled="true"] pre {
    background: var(--db-skin-code-background) !important;
    border: 1px solid rgba(120, 190, 255, 0.14);
    border-radius: 14px;
    box-shadow:
        inset 0 1px rgba(255, 255, 255, 0.04),
        0 8px 24px rgba(0, 0, 0, 0.16);
}

html[data-db-skin-enabled="true"] pre code {
    font-family:
        "JetBrains Mono",
        "Cascadia Code",
        Consolas,
        monospace;
    text-shadow: none;
}
```

主题可以修改代码字体和配色，但不应改写代码文本。

---

## 十八、输入区域主题

输入区域是最重要的交互控件，应优先保证稳定性。

```css
html[data-db-skin-enabled="true"]
[data-db-skin-role="composer"] {
    background: rgba(10, 18, 30, 0.78) !important;
    backdrop-filter: blur(24px) saturate(135%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 22px;
    box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.26),
        inset 0 1px rgba(255, 255, 255, 0.05);
}
```

不能通过装饰层覆盖：

- 文本输入框；
- 文件上传按钮；
- 模型选择器；
- 深度思考按钮；
- 联网搜索按钮；
- 停止生成按钮；
- 发送按钮。

主题不得监听并保存用户在输入框中输入的内容。

---

## 十九、弹窗和 Portal 处理

菜单、下拉框、Toast 和 Dialog 可能挂载到 `document.body` 或独立 Portal 节点中。

因此不能只给主应用容器加主题，还要识别：

- `role="dialog"`；
- `role="menu"`；
- `role="listbox"`；
- `role="tooltip"`；
- `aria-modal="true"`；
- Toast 容器；
- 文件预览层。

```css
html[data-db-skin-enabled="true"] [role="dialog"],
html[data-db-skin-enabled="true"] [role="menu"],
html[data-db-skin-enabled="true"] [role="listbox"] {
    background: rgba(9, 16, 28, 0.94) !important;
    color: var(--db-skin-text-primary);
    backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
}
```

通用 `role` 规则需要谨慎使用。更稳妥的方式是由弹窗适配器确认它确实属于 Doubao 主应用后，再添加主题语义标记。

---

## 二十、单页应用路由监控

Doubao 网页通常会在不完整刷新的情况下切换欢迎页、对话页和历史会话。

可能触发页面变化的操作：

- 新建对话；
- 打开历史会话；
- 切换对话；
- 浏览器前进和后退；
- 登录状态变化；
- 打开分享页面；
- 页面内部重定向。

需要监控：

```text
history.pushState
history.replaceState
popstate
hashchange
```

但 Content Script 不应无条件破坏页面自身的 History API。可以优先结合 URL 定时比较、`popstate` 和 DOM 变化进行判断；如果需要包装 History API，应保证调用原始函数并只触发扩展自己的事件。

示意：

```ts
let previousUrl = location.href;

function detectRouteChange(): void {
  const currentUrl = location.href;

  if (currentUrl === previousUrl) {
    return;
  }

  previousUrl = currentUrl;
  schedulePageAdaptation("route-change");
}

window.addEventListener("popstate", detectRouteChange);
window.addEventListener("hashchange", detectRouteChange);
```

MutationObserver 触发时也可以顺便检查 URL 是否变化。

---

## 二十一、DOM 变化监控

Doubao 在生成回答、切换会话或打开菜单时会频繁修改 DOM。

```ts
const observer = new MutationObserver((mutations) => {
  const hasRelevantChange = mutations.some((mutation) => {
    return mutation.type === "childList" &&
      (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0);
  });

  if (hasRelevantChange) {
    schedulePageAdaptation("dom-change");
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
```

不能在每次 Mutation 时立即扫描整个页面，否则流式回答期间可能产生大量无效工作。

推荐使用防抖和最小扫描间隔：

```ts
let adaptationTimer: number | undefined;
let lastAdaptationAt = 0;

function schedulePageAdaptation(reason: string): void {
  window.clearTimeout(adaptationTimer);

  adaptationTimer = window.setTimeout(() => {
    const now = Date.now();

    if (now - lastAdaptationAt < 100) {
      return;
    }

    lastAdaptationAt = now;
    adaptCurrentPage(reason);
  }, 150);
}
```

---

## 二十二、幂等注入原理

注入逻辑可能执行很多次，因此必须保证幂等性。

### 背景层幂等创建

```ts
function ensureSkinRoot(): HTMLElement {
  const id = "doubao-web-skin-root";
  const existing = document.getElementById(id);

  if (existing) {
    return existing;
  }

  const root = document.createElement("div");
  root.id = id;
  root.dataset.dbSkinOwned = "true";
  root.setAttribute("aria-hidden", "true");

  const background = document.createElement("div");
  background.id = "doubao-web-skin-background";

  const overlay = document.createElement("div");
  overlay.id = "doubao-web-skin-overlay";

  root.append(background, overlay);
  document.body.prepend(root);

  return root;
}
```

### 元素标记幂等处理

```ts
function markSidebar(sidebar: HTMLElement): void {
  if (sidebar.dataset.dbSkinRole === "sidebar") {
    return;
  }

  sidebar.dataset.dbSkinRole = "sidebar";
}
```

执行多次不会创建重复背景或重复属性。

---

## 二十三、扩展隔离环境原理

浏览器 Content Script 默认运行在隔离世界中：

```text
Doubao 页面 JavaScript 世界
            ↕ 共享 DOM
浏览器扩展 Content Script 隔离世界
```

两者可以看到同一个 DOM，但 JavaScript 全局变量彼此隔离。

皮肤项目通常只需要：

- 查询和标记 DOM；
- 插入 CSS；
- 添加装饰组件；
- 监听 DOM 变化；
- 读取扩展本地配置。

因此大多数情况下不需要进入页面主世界，也不需要读取 Doubao 的内部状态对象。

避免进入主世界有以下优点：

- 降低与官方脚本冲突的概率；
- 不依赖 Doubao 内部变量；
- 减少安全风险；
- 页面升级后更容易兼容；
- 不需要拦截官方函数。

---

## 二十四、主题实时切换流程

用户在扩展弹窗或设置页面选择主题后：

```text
用户选择主题
      ↓
设置页写入 activeThemeId
      ↓
Service Worker 收到设置变化
      ↓
向 Doubao 标签页发送 theme-changed 消息
      ↓
Content Script 读取新主题
      ↓
释放旧背景 Object URL
      ↓
读取新背景 Blob
      ↓
更新 CSS Variables
      ↓
更新根节点 theme ID
      ↓
补齐或删除可选组件
      ↓
不刷新页面完成主题切换
```

```ts
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "theme-changed") {
    void themeController.apply(message.themeId);
  }

  if (message?.type === "theme-disabled") {
    themeController.disable();
  }
});
```

---

## 二十五、恢复默认界面流程

用户关闭主题后，扩展应立即恢复页面：

```text
关闭主题开关
      ↓
停止路由和 DOM 监控
      ↓
移除 HTML 主题属性
      ↓
删除扩展插入的 style
      ↓
删除背景和遮罩层
      ↓
删除欢迎页横幅
      ↓
移除适配器添加的 data 属性
      ↓
恢复记录过的内联样式
      ↓
释放背景 Object URL
      ↓
清理本页面运行状态
```

示意代码：

```ts
function disableTheme(): void {
  document.documentElement.removeAttribute("data-db-skin-enabled");
  document.documentElement.removeAttribute("data-db-skin-theme");
  document.documentElement.removeAttribute("data-db-skin-mode");

  document.getElementById("doubao-web-skin-theme-style")?.remove();
  document.getElementById("doubao-web-skin-root")?.remove();
  document.getElementById("doubao-web-skin-welcome-banner")?.remove();

  document
    .querySelectorAll<HTMLElement>("[data-db-skin-role]")
    .forEach((element) => {
      delete element.dataset.dbSkinRole;
    });

  document
    .querySelectorAll<HTMLElement>("[data-db-skin-message]")
    .forEach((element) => {
      delete element.dataset.dbSkinMessage;
    });
}
```

因为没有修改 Doubao 官方文件，所以不需要重新安装或清理浏览器缓存。

---

## 二十六、浏览器刷新后的恢复

页面刷新时，Content Script 会重新运行：

```text
页面刷新
      ↓
旧页面和旧注入内容销毁
      ↓
浏览器重新加载 Content Script
      ↓
读取扩展启用状态
      ↓
读取 activeThemeId
      ↓
重新验证页面身份
      ↓
重新注入主题
```

因此网页版不需要像 CDP 桌面方案那样运行独立 PowerShell 守护进程。

浏览器本身就是生命周期管理器。

---

## 二十七、标签页管理

用户可能同时打开多个 Doubao 标签页。

每个标签页都应该拥有独立的：

- Content Script 实例；
- MutationObserver；
- Object URL；
- 页面适配状态；
- 当前路由记录。

全局共享的内容包括：

- 当前主题 ID；
- 主题配置；
- 背景资源；
- 扩展启用状态；
- 用户偏好。

主题切换时，Service Worker 可以向所有匹配的 Doubao 标签页广播更新消息。

---

## 二十八、权限设计

皮肤扩展应遵循最小权限原则。

### 必要权限

```text
storage
指定 Doubao 官方域名的 host permission
```

### 可能需要但应谨慎申请

```text
activeTab：用户主动点击后临时访问当前页面
scripting：需要动态注册或执行脚本时
unlimitedStorage：大量本地主题资源确有需要时
```

### 默认不应该申请

```text
<all_urls>
cookies
history
downloads
webRequest
webRequestBlocking
clipboardRead
management
nativeMessaging
```

单纯的皮肤功能不需要读取 Cookie、浏览历史或拦截网络请求。

---

## 二十九、隐私设计

扩展应明确保证：

- 不读取并上传用户对话；
- 不记录输入框内容；
- 不提取登录令牌；
- 不读取 Cookie；
- 不拦截 Doubao API；
- 不收集上传文件；
- 不发送第三方统计请求；
- 不加载未知远程脚本；
- 主题资源默认只保存在本机。

日志中只记录：

```text
扩展版本
适配器版本
页面类型
主题 ID
错误类型
发生时间
浏览器版本（可选）
```

日志不应记录：

```text
对话标题
聊天内容
用户输入
分享链接中的敏感参数
Cookie
Authorization Header
上传文件名和内容
```

---

## 三十、第三方主题包安全

推荐主题包结构：

```text
midnight-ocean.ds-theme.zip
├── theme.json
├── background.webp
├── preview.webp
└── custom.css（可选且受限）
```

导入流程：

```text
选择主题包
      ↓
检查压缩包大小
      ↓
阻止路径穿越
      ↓
限制文件数量
      ↓
检查允许的扩展名
      ↓
读取并校验 theme.json
      ↓
检查图片真实格式
      ↓
净化或拒绝危险 CSS
      ↓
计算资源哈希
      ↓
保存到本地存储
```

普通主题包不应包含 JavaScript。

危险 CSS 示例：

```css
@import url("https://unknown.example/theme.css");
```

```css
background-image: url("https://tracking.example/pixel");
```

主题导入器应拒绝或移除远程 `@import`、远程 URL 和其他不受信任资源引用。

---

## 三十一、CSS 冲突控制

为了降低与 Doubao 官方样式冲突的概率：

1. 所有规则限定在主题根属性下；
2. 主题自建类名统一使用 `db-skin-` 前缀；
3. 自建 DOM 统一设置 `data-db-skin-owned="true"`；
4. 尽量避免通配符选择器；
5. 谨慎使用 `!important`；
6. 不覆盖布局关键属性；
7. 不随意修改 `position` 和 `z-index`；
8. 不隐藏未知元素。

推荐：

```css
html[data-db-skin-enabled="true"]
[data-db-skin-role="sidebar"] {
    background: var(--db-skin-panel);
}
```

不推荐：

```css
body * {
    background: transparent !important;
}
```

后者很容易破坏输入框、弹窗、代码块和加载状态。

---

## 三十二、层级与点击穿透

装饰层必须：

```css
pointer-events: none;
user-select: none;
```

还要避免给主题根节点设置过高的 `z-index`。

推荐层级原则：

```text
背景层：低于 Doubao 主内容
Doubao 原生内容：正常层级
主题横幅：位于对应布局流中
Doubao 原生弹窗：保持最高交互层
扩展设置弹窗：不插入 Doubao 页面，由浏览器管理
```

主题横幅应使用正常文档流插入，减少绝对定位造成的遮挡。

---

## 三十三、性能控制

### 1. 限制 `backdrop-filter`

只用于大块区域：

- 侧边栏；
- 输入区域；
- 消息主面板；
- 大型弹窗。

不要给每一个按钮和文字元素都添加模糊。

### 2. 减少动画

```css
@media (prefers-reduced-motion: reduce) {
    html[data-db-skin-enabled="true"] *,
    html[data-db-skin-enabled="true"] *::before,
    html[data-db-skin-enabled="true"] *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

### 3. 避免重复图片解码

背景 Blob 应缓存，每次路由切换只复用 Object URL，不重新压缩图片。

### 4. DOM 扫描分区

页面适配器应分别处理：

```text
sidebar adapter
message adapter
composer adapter
dialog adapter
```

不要每次都遍历页面全部节点。

### 5. 页面不可见时降频

```ts
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pageWatcher.pauseExpensiveChecks();
  } else {
    pageWatcher.resume();
    schedulePageAdaptation("tab-visible");
  }
});
```

---

## 三十四、无障碍设计

皮肤不能只追求透明和视觉效果，还需要保证：

- 普通正文对比度；
- 次级文字可读性；
- 链接可识别；
- 焦点轮廓清晰；
- 错误提示不只依赖颜色；
- 代码块保持高对比度；
- 支持减少动态效果；
- 支持高透明度关闭选项。

焦点样式示例：

```css
html[data-db-skin-enabled="true"]
:focus-visible {
    outline: 2px solid var(--db-skin-accent) !important;
    outline-offset: 2px;
}
```

主题不应该隐藏官方 `aria-*` 属性或改变键盘 Tab 顺序。

---

## 三十五、兼容性检测与安全降级

Doubao 更新后可能出现：

- DOM 层级变化；
- 类名变化；
- 输入框组件变化；
- Shadow DOM；
- 弹窗结构变化；
- 页面路由变化；
- CSP 策略变化；
- 新的多栏布局；
- 新的消息组件。

适配器启动后可以计算兼容性评分：

```text
找到应用根节点：+20
找到侧边栏：+15
找到主内容区：+15
找到输入区域：+25
找到消息列表或欢迎页：+15
URL 和页面类型匹配：+10
```

示意：

```text
80～100：完整主题模式
60～79：安全兼容模式
低于 60：停止结构性注入
```

安全兼容模式只启用：

- 全局背景；
- 遮罩；
- 基础颜色变量；

并停止：

- 欢迎页横幅；
- 消息类型标记；
- 输入框结构修改；
- 未知弹窗适配。

---

## 三十六、错误处理

主题系统中的错误不应该影响 Doubao 正常使用。

```ts
async function safeStartTheme(): Promise<void> {
  try {
    await themeController.start();
  } catch (error) {
    console.warn("[Doubao Skin] 主题启动失败", error);
    themeController.disable();
  }
}
```

失败时应优先：

1. 停止主题监控；
2. 移除自建组件；
3. 移除主题标记；
4. 保留 Doubao 原生页面；
5. 在扩展弹窗显示错误；
6. 将脱敏错误保存到本地。

不能因为主题失败而持续刷新 Doubao 页面。

---

## 三十七、推荐目录结构

```text
doubao-web-skin/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── manifest.json
│
├── src/
│   ├── background/
│   │   └── index.ts
│   │
│   ├── content/
│   │   ├── index.ts
│   │   ├── bootstrap.ts
│   │   ├── identity.ts
│   │   ├── route-watcher.ts
│   │   ├── mutation-watcher.ts
│   │   └── cleanup.ts
│   │
│   ├── adapters/
│   │   ├── index.ts
│   │   ├── app-root.ts
│   │   ├── sidebar.ts
│   │   ├── welcome.ts
│   │   ├── messages.ts
│   │   ├── composer.ts
│   │   └── dialogs.ts
│   │
│   ├── themes/
│   │   ├── theme-engine.ts
│   │   ├── theme-schema.ts
│   │   ├── css-compiler.ts
│   │   ├── asset-loader.ts
│   │   └── built-in/
│   │       └── midnight-ocean.json
│   │
│   ├── storage/
│   │   ├── settings.ts
│   │   ├── themes.ts
│   │   └── assets.ts
│   │
│   ├── image/
│   │   ├── validate.ts
│   │   ├── resize.ts
│   │   └── preview.ts
│   │
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.ts
│   │   └── style.css
│   │
│   ├── options/
│   │   ├── index.html
│   │   ├── index.ts
│   │   └── style.css
│   │
│   └── shared/
│       ├── messages.ts
│       ├── logger.ts
│       └── types.ts
│
├── styles/
│   ├── base.css
│   ├── components.css
│   ├── accessibility.css
│   └── fallback.css
│
├── tests/
│   ├── unit/
│   └── e2e/
│
└── docs/
    ├── theme-format.md
    ├── privacy.md
    └── adapter-guide.md
```

---

## 三十八、开发实施流程

### 第一阶段：页面结构研究

1. 手动打开 Doubao 网页版；
2. 确认官方域名和聊天页面路径；
3. 观察欢迎页和对话页结构；
4. 查找稳定的 `data-*`、ARIA 和 role 属性；
5. 确认输入区域和消息容器；
6. 检查弹窗是否通过 Portal 挂载；
7. 记录页面路由变化方式；
8. 形成页面适配器文档。

### 第二阶段：最小可用主题

先实现：

- 扩展启用和关闭；
- 根节点主题标记；
- 全局背景；
- 暗色遮罩；
- 侧边栏磨砂；
- 输入区域磨砂；
- 一键恢复。

这一阶段尽量不插入复杂 JavaScript 组件。

### 第三阶段：稳定适配

加入：

- 欢迎页识别；
- 对话页识别；
- 消息类型标记；
- 路由切换监控；
- MutationObserver；
- 幂等重新注入；
- 安全兼容模式。

### 第四阶段：主题工作室

加入：

- 选择背景图片；
- 图片裁剪；
- 背景焦点位置；
- 亮度和饱和度；
- 面板透明度；
- 模糊强度；
- 强调色；
- 实时预览；
- 主题导入和导出。

### 第五阶段：安全加固

加入：

- 严格域名白名单；
- 最小权限；
- 主题 Schema 校验；
- 图片真实格式校验；
- ZIP 路径穿越防护；
- CSS 远程资源检查；
- 日志脱敏；
- 第三方主题安全提示。

### 第六阶段：测试与发布

测试内容包括：

- 新建对话；
- 历史会话切换；
- 流式回答；
- 深度思考；
- 联网搜索；
- 文件上传；
- 模型切换；
- 设置弹窗；
- 页面刷新；
- 浏览器前进和后退；
- 多个标签页；
- 窗口缩放；
- 深色和浅色模式；
- 扩展升级；
- 一键恢复。

---

## 三十九、测试策略

### 单元测试

- 主题 JSON 校验；
- CSS 变量生成；
- 图片尺寸计算；
- URL 白名单判断；
- 兼容性评分；
- 主题导入安全检查；
- 存储读写。

### DOM 适配测试

使用保存的、经过脱敏的 HTML 结构样本测试：

- 侧边栏识别；
- 输入区域识别；
- 欢迎页识别；
- 用户消息识别；
- AI 消息识别；
- 弹窗识别。

测试样本不应包含真实用户对话。

### E2E 测试

使用 Playwright 加载扩展，验证：

- 页面打开后主题自动出现；
- 点击功能仍然可用；
- 路由变化后主题仍然存在；
- 主题切换不需要刷新；
- 关闭主题后恢复默认；
- 页面结构异常时进入安全模式。

---

## 四十、网页版方案不需要守护进程的原因

桌面 CDP 方案需要守护进程，是因为注入器需要持续管理外部应用和调试连接。

网页版中：

```text
浏览器
├── 管理标签页生命周期
├── 页面刷新后重新加载 Content Script
├── 管理扩展 Service Worker
├── 管理扩展存储
└── 管理权限边界
```

所以通常不需要：

- PowerShell 守护进程；
- 独立 Node.js 注入器；
- 调试端口；
- PID 状态文件；
- 重启 Doubao；
- 检查端口归属。

这也是网页版方案比 Electron/CDP 方案更轻量的主要原因。

---

## 四十一、与桌面 CDP 方案对比

| 项目 | Doubao 网页版扩展 | Electron/CDP 桌面方案 |
|---|---|---|
| 注入入口 | Content Script | CDP WebSocket |
| 调试端口 | 不需要 | 需要 |
| 首次重启 | 不需要 | 可能需要 |
| 页面刷新恢复 | 浏览器自动重新加载 | 注入器重新连接 |
| 生命周期管理 | 浏览器 | 守护进程 |
| 进程验证 | 不需要 | 需要验证 PID 和路径 |
| 站点验证 | 域名与 DOM | 页面协议、DOM 和进程 |
| 主题存储 | Extension Storage / IndexedDB | 本地文件系统 |
| 大图访问 | Blob URL / 扩展资源 | 本地协议或受控服务 |
| 权限重点 | Host Permission | 本机 CDP 安全 |
| 安装方式 | 浏览器扩展 | 桌面启动器和注入器 |
| 恢复方式 | 关闭扩展或主题 | 停止注入器并重启客户端 |

---

## 四十二、它会修改什么

网页版主题扩展只会创建或修改：

- 扩展自己的本地设置；
- 扩展自己的 IndexedDB 数据；
- 处理后的背景图片；
- 用户创建的主题配置；
- 当前页面中的临时主题 DOM；
- 当前页面中的临时 `<style>`；
- 当前页面原生元素上的临时语义属性；
- 扩展自己的脱敏日志。

页面关闭或刷新后，页面中的运行时修改会被浏览器销毁。

---

## 四十三、它不会修改什么

项目不会修改：

- Doubao 官方服务器文件；
- Doubao 官方前端部署包；
- 浏览器可执行文件；
- 浏览器安装目录；
- Doubao 的模型请求内容；
- 用户对话数据库；
- 登录 Cookie；
- 身份认证令牌；
- 上传文件；
- 官方业务 JavaScript。

也不会：

- 绕过登录；
- 拦截模型请求；
- 修改模型输出；
- 自动发送消息；
- 上传用户对话；
- 远程执行主题脚本；
- 在非白名单网站中注入皮肤。

---

## 四十四、一句话理解

可以把 Doubao 网页版皮肤系统理解为：

> 一个只在 Doubao 官方聊天页面中运行的浏览器主题扩展。它识别页面中的真实侧边栏、消息区、输入框和弹窗，在这些原生控件外增加背景、遮罩和磨砂效果，并在页面刷新或内部路由切换后自动补回。

它的主要优点是：

- 不修改官方程序和服务器文件；
- 不需要 CDP 调试端口；
- 不需要独立守护进程；
- 不需要重启浏览器；
- 页面刷新后可以自动恢复；
- 可以实时切换主题；
- 可以随时一键关闭；
- 权限可限制在指定站点；
- Doubao 原生功能继续可用。

它的主要缺点是：

- 页面结构变化后需要更新适配器；
- 过度依赖随机类名会导致主题失效；
- 大量模糊和动画可能影响性能；
- 第三方主题中的远程 CSS 和脚本存在安全风险；
- 浏览器扩展需要针对不同浏览器版本测试。

最终推荐架构：

```text
Doubao 官方网页
        ↓
浏览器域名白名单
        ↓
Manifest V3 Content Script
        ↓
页面身份与结构验证
        ↓
Page Adapter 添加语义标记
        ↓
Theme Engine 注入 CSS Variables
        ↓
背景、遮罩与磨砂视觉层
        ↓
MutationObserver + 路由监控
        ↓
自动重注入与安全降级
```

**总体原则：只改变视觉层，不读取对话内容，不修改请求逻辑；页面身份或结构无法确认时，停止结构性注入并安全恢复原生界面。**
