# Doubao 皮肤自定义系统：设计流程与实现原理

## 一、项目核心原理

这个项目的核心原理可以概括为：

> 将 Doubao 的真实网页或桌面 WebView 作为渲染目标，在不修改官方程序文件和业务逻辑的前提下，动态插入主题 CSS、背景图片及少量界面增强 JavaScript，从而实现可恢复、可切换的运行时皮肤。

它不是把一张效果图覆盖在 Doubao 窗口上，也不是替换 Doubao 的程序文件。

主题启用后，Doubao 原来的功能仍然存在，例如：

- 新建对话；
- 历史会话；
- 模型选择；
- 深度思考；
- 联网搜索；
- 文件上传；
- 消息编辑；
- 代码复制；
- 输入框和发送按钮。

皮肤系统主要修改这些原生控件的视觉表现，而不接管其业务行为。

---

## 二、整体工作流程

```text
选择 Doubao 运行环境
        ↓
识别网页版 / Electron / WebView
        ↓
选择背景图片和主题颜色
        ↓
压缩、裁剪并生成主题资源
        ↓
生成主题配置文件
        ↓
连接或匹配 Doubao 页面
        ↓
验证页面身份和页面结构
        ↓
注入 CSS、背景和主题组件
        ↓
监听刷新、路由切换和 DOM 重建
        ↓
必要时自动重新注入
        ↓
用户可随时暂停、切换或恢复默认主题
```

项目可以拆分为以下几个模块：

```text
Doubao Skin
├── Theme Studio       主题编辑器
├── Image Processor    图片处理器
├── Theme Compiler     主题编译器
├── Page Detector      页面身份检测器
├── Style Injector     样式注入器
├── DOM Adapter        页面结构适配器
├── Mutation Watcher   DOM 变化监控器
├── Runtime Guardian   运行守护模块
└── Restore Manager    恢复管理器
```

---

## 三、首先识别 Doubao 的运行环境

Doubao 的皮肤方案不能直接假定目标一定是 Electron。项目启动时应先判断目标环境。

### 1. Doubao 网页版

如果用户通过浏览器打开 Doubao，推荐使用浏览器扩展：

```text
Chrome / Edge
    └── Doubao 主题扩展
            ├── content script
            ├── theme.css
            ├── page-adapter.js
            └── theme-config.json
```

浏览器扩展会在匹配到 Doubao 官方页面后注入主题。

这种方案的优点是：

- 不需要重启浏览器；
- 不需要开放 CDP 调试端口；
- 权限范围容易限制；
- 安装和卸载简单；
- 页面刷新后扩展会自动重新执行；
- 更适合普通用户。

### 2. Electron 桌面客户端

如果目标客户端经过检查后确认使用 Electron，则可以采用和 Codex 类似的 CDP 方案：

```text
Doubao Electron 客户端
        ↓
启用仅限本机的 CDP 端口
        ↓
注入器连接真实渲染页面
        ↓
验证页面身份
        ↓
插入主题 CSS 和辅助组件
```

例如只监听：

```text
127.0.0.1:9351
```

端口只用于本机，并且不能绑定到 `0.0.0.0`，否则局域网中的其他设备可能访问调试接口。

### 3. 其他 WebView 客户端

如果客户端使用 WebView2，可以考虑：

- 客户端自身提供的扩展接口；
- WebView2 调试接口；
- 用户自行控制的封装客户端；
- 在自建 Doubao API 客户端中直接实现主题系统。

如果是完全原生 UI，CSS 注入方式就不适用。

---

## 四、为什么能够改变 Doubao 的界面

Doubao 网页界面本质上由以下内容构成：

```text
HTML 负责页面结构
CSS 负责颜色、圆角、尺寸和布局
JavaScript 负责交互和状态更新
```

皮肤系统只需要在页面加载后执行少量操作：

1. 找到 Doubao 页面；
2. 验证页面地址；
3. 检查页面中的原生界面特征；
4. 添加带有固定 ID 的主题样式；
5. 添加背景层和装饰层；
6. 给根元素设置主题标记；
7. 监听单页应用的路由变化；
8. 页面结构被重建后重新应用主题。

其效果类似于用户在浏览器开发者工具中临时修改 CSS，但这里由程序自动完成。

例如，注入器可以向页面添加：

```html
<style id="doubao-custom-theme">
    /* 编译生成的主题样式 */
</style>
```

同时在根节点上设置：

```html
<html data-doubao-theme="midnight-glass">
```

所有主题规则都限定在这个属性下：

```css
html[data-doubao-theme="midnight-glass"] {
    --db-skin-accent: #72d6ff;
    --db-skin-panel: rgba(12, 20, 32, 0.72);
    --db-skin-text: rgba(255, 255, 255, 0.94);
}
```

这样可以降低主题 CSS 污染其他页面的风险。

---

## 五、主题的视觉分层

Doubao 皮肤不是单独一张背景图，而是由多个视觉层组成。

```text
第 1 层：全局背景图片
第 2 层：暗化、模糊和渐变遮罩
第 3 层：氛围光、光晕和纹理
第 4 层：Doubao 原生内容区域
第 5 层：磨砂面板和消息卡片
第 6 层：按钮、输入框和菜单
第 7 层：弹窗、提示框和下拉菜单
```

### 1. 全局背景层

在页面底层创建独立背景元素：

```html
<div id="doubao-skin-background"></div>
```

```css
#doubao-skin-background {
    position: fixed;
    inset: 0;
    z-index: -3;
    background-image: var(--db-skin-background-image);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter:
        brightness(var(--db-skin-brightness))
        saturate(var(--db-skin-saturation));
    transform: scale(1.02);
    pointer-events: none;
}
```

背景层不参与页面交互，也不会挡住输入框和按钮。

### 2. 可读性遮罩层

```css
#doubao-skin-overlay {
    position: fixed;
    inset: 0;
    z-index: -2;
    background:
        linear-gradient(
            180deg,
            rgba(4, 8, 16, 0.28),
            rgba(4, 8, 16, 0.72)
        ),
        radial-gradient(
            circle at 70% 10%,
            rgba(75, 170, 255, 0.16),
            transparent 45%
        );
    pointer-events: none;
}
```

遮罩负责降低背景亮度、保证文字对比度、突出输入区域，并弱化复杂背景细节。

### 3. 左侧会话栏

左侧会话栏仍然使用 Doubao 原生 DOM，只修改视觉样式：

```css
html[data-doubao-theme] [data-ds-role="sidebar"] {
    background: rgba(8, 15, 26, 0.70);
    backdrop-filter: blur(22px) saturate(125%);
    border-right: 1px solid rgba(255, 255, 255, 0.10);
    box-shadow: 12px 0 36px rgba(0, 0, 0, 0.18);
}
```

主题系统可以调整会话栏透明度、当前会话高亮色、新建对话按钮、悬停效果和折叠状态背景。

### 4. 欢迎页主题横幅

在没有打开具体对话时，可以在欢迎区域添加主题横幅：

```text
┌─────────────────────────────────────┐
│  Doubao · Midnight Ocean          │
│  探索问题，也探索答案之外的世界       │
│                                     │
│  “Reason deeply, express clearly.”  │
└─────────────────────────────────────┘
```

横幅可以包含主题名称、标语、日期、问候语、渐变标题和装饰光效。横幅应该插入到明确识别出的欢迎页容器中，而不是使用绝对坐标覆盖页面。

### 5. 用户消息与 AI 消息

```css
html[data-doubao-theme] [data-ds-message="user"] {
    background: rgba(76, 139, 245, 0.20);
    border: 1px solid rgba(111, 181, 255, 0.22);
    border-radius: 18px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}

html[data-doubao-theme] [data-ds-message="assistant"] {
    background: rgba(13, 22, 36, 0.62);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
}
```

主题系统不应该改变消息文本、Markdown 内容、代码内容、模型输出或复制按钮行为。

### 6. 代码块

代码块需要优先保证可读性，因此不建议过度透明：

```css
html[data-doubao-theme] pre {
    background: rgba(3, 8, 15, 0.90);
    border: 1px solid rgba(120, 190, 255, 0.14);
    border-radius: 14px;
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
}

html[data-doubao-theme] code {
    font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
}
```

### 7. 输入区域

```css
html[data-doubao-theme] [data-ds-role="composer"] {
    background: rgba(10, 18, 30, 0.76);
    backdrop-filter: blur(24px) saturate(135%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 22px;
    box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.26),
        inset 0 1px rgba(255, 255, 255, 0.05);
}
```

必须保留输入、粘贴、文件上传、模型选择、深度思考、联网搜索、停止生成和发送消息等原生操作。

### 8. 弹窗和下拉菜单

Doubao 的菜单或弹窗可能通过 Portal 挂载到页面根节点，因此主题还要处理模型菜单、设置弹窗、文件预览、提示消息和确认对话框。

```css
html[data-doubao-theme] [role="dialog"],
html[data-doubao-theme] [role="menu"],
html[data-doubao-theme] [role="listbox"] {
    background: rgba(9, 16, 28, 0.92);
    backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
}
```

---

## 六、点击穿透和层级控制

所有纯装饰元素都必须设置：

```css
#doubao-skin-background,
#doubao-skin-overlay,
#doubao-skin-glow,
#doubao-skin-particles {
    pointer-events: none;
    user-select: none;
}
```

这样可以避免背景或光晕挡住输入框、发送按钮、侧边栏、文件上传按钮和模型选择菜单。

---

## 七、图片处理原理

用户选择背景图片后，主题工作室应先进行预处理：

1. 检查文件扩展名；
2. 检查真实图片格式；
3. 限制原始文件大小；
4. 解码到内存；
5. 修正 EXIF 旋转方向；
6. 按比例缩放；
7. 裁剪或保留完整画面；
8. 转换为 WebP 或 JPEG；
9. 删除不需要的元数据；
10. 检查处理后的尺寸；
11. 写入主题资源目录；
12. 生成缩略图；
13. 更新主题配置。

推荐限制：

```text
最长边：2560～3200px
推荐背景：1920×1080 或 2560×1440
处理后文件：尽量小于 8MB
硬性上限：16MB
缩略图：480～720px
```

### 背景不建议直接使用超长 Base64

如果图片较大，不建议把完整图片直接拼进 CSS。浏览器扩展可使用扩展资源 URL；本地 Electron 注入器可使用受控的本地资源协议、临时 HTTP 服务或 Blob URL。

如果使用本机 HTTP 服务，应该只监听 `127.0.0.1`，并使用随机令牌限制访问。

---

## 八、主题配置设计

每套主题使用独立配置文件：

```json
{
  "schemaVersion": 1,
  "id": "midnight-ocean",
  "name": "Midnight Ocean",
  "author": "Local User",
  "target": "doubao",
  "mode": "dark",
  "background": {
    "file": "background.webp",
    "position": "center center",
    "size": "cover",
    "brightness": 0.58,
    "saturation": 0.92,
    "blur": 0
  },
  "colors": {
    "accent": "#72d6ff",
    "accentHover": "#9ee4ff",
    "textPrimary": "#f5f9ff",
    "textSecondary": "#aab8ca",
    "panel": "rgba(9, 17, 29, 0.72)",
    "panelStrong": "rgba(7, 13, 23, 0.90)",
    "border": "rgba(255, 255, 255, 0.10)"
  },
  "effects": {
    "glassBlur": 22,
    "panelRadius": 18,
    "shadowStrength": 0.28,
    "animation": true
  },
  "components": {
    "welcomeBanner": true,
    "ambientGlow": true,
    "transparentSidebar": true,
    "glassComposer": true,
    "styledCodeBlocks": true
  },
  "accessibility": {
    "minimumContrast": 4.5,
    "reduceMotion": false,
    "highReadabilityCode": true
  }
}
```

主题编译器将 JSON 转换为 CSS 变量，便于运行时切换主题。

---

## 九、页面识别与适配器设计

Doubao 页面更新后，CSS 类名可能发生变化，因此不应该只依赖随机生成的类名。推荐建立页面适配器：

```text
Doubao Page Adapter
├── 页面身份检测
├── 欢迎页检测
├── 对话页检测
├── 侧边栏检测
├── 消息容器检测
├── 输入区域检测
├── 弹窗检测
└── 页面版本兼容性检测
```

### 选择器优先级

1. 稳定的 `data-*` 属性；
2. ARIA 属性；
3. `role` 属性；
4. 按钮文字和语义；
5. 稳定结构关系；
6. CSS 类名；
7. 模糊结构匹配。

```js
const composer =
    document.querySelector('[data-testid="chat-input"]') ||
    document.querySelector('textarea[placeholder]')?.closest('form') ||
    findComposerByStructure();
```

皮肤系统可以给识别出的原生元素添加自己的语义标记：

```js
composer.dataset.dsRole = "composer";
sidebar.dataset.dsRole = "sidebar";
```

后续 CSS 只使用项目自己的标记，从而将页面结构识别和主题样式分离。

---

## 十、为什么需要持续监控

以下操作可能导致主题组件消失：

- 新建对话；
- 打开历史会话；
- 切换模型；
- 打开设置；
- 页面刷新；
- 登录状态变化；
- 消息列表更新；
- 切换深度思考模式；
- 打开文件预览；
- 客户端重建渲染进程。

项目需要监控页面加载、History API、`hashchange`、`popstate`、`MutationObserver`、CDP 页面目标变化和渲染器重建。

```js
const observer = new MutationObserver(() => {
    scheduleThemeCheck();
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});
```

监控需要防抖，避免 Doubao 流式生成长回答时频繁扫描整个页面：

```js
let checkTimer = null;

function scheduleThemeCheck() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
        ensureThemeInstalled();
        adaptDoubaoPage();
    }, 150);
}
```

---

## 十一、幂等注入原理

主题注入必须是幂等的，也就是执行多次不会创建重复组件。

```js
function ensureBackground() {
    let background = document.getElementById("doubao-skin-background");

    if (!background) {
        background = document.createElement("div");
        background.id = "doubao-skin-background";
        document.body.prepend(background);
    }

    return background;
}
```

主题 CSS 也应固定使用一个 ID：

```js
function installThemeStyle(cssText) {
    let style = document.getElementById("doubao-skin-style");

    if (!style) {
        style = document.createElement("style");
        style.id = "doubao-skin-style";
        document.head.appendChild(style);
    }

    if (style.textContent !== cssText) {
        style.textContent = cssText;
    }
}
```

---

## 十二、浏览器扩展方案

对于 Doubao 网页版，推荐把系统设计成浏览器扩展。

```text
用户安装主题扩展
        ↓
用户打开 Doubao 官方网站
        ↓
扩展检查当前域名
        ↓
content script 验证页面身份
        ↓
读取本地主题配置
        ↓
注入主题 CSS
        ↓
添加背景和横幅
        ↓
监听页面路由和 DOM 变化
        ↓
自动重新适配
```

扩展应遵循最小权限原则，只申请 Doubao 官方页面访问权限、本地主题存储权限和必要的脚本注入权限。

不应该默认申请所有网站读取权限、浏览历史、下载记录、Cookie、网络请求拦截或剪贴板读取权限。

---

## 十三、Electron/CDP 方案

如果目标客户端经过确认确实是 Electron，可以使用 CDP 注入。

```text
确认用户授权
      ↓
定位目标客户端
      ↓
检查客户端类型和程序路径
      ↓
检查调试端口是否空闲
      ↓
以仅限本机的 CDP 参数启动
      ↓
等待端口开放
      ↓
核对端口监听 PID
      ↓
确认 PID 属于目标客户端
      ↓
连接 CDP
      ↓
枚举渲染页面
      ↓
验证页面身份
      ↓
注入主题
```

### 页面身份验证

至少应检查：

1. 页面 URL 是否符合预期；
2. 页面标题是否符合预期；
3. 是否存在 Doubao 界面特征；
4. 是否包含对话区域或输入区域；
5. 页面是否属于已验证的客户端进程；
6. 页面是否不是登录授权页、支付页或第三方网页。

实际实现应将允许的域名和协议写入严格白名单。

---

## 十四、守护进程设计

如果采用桌面 CDP 方案，可以使用：

```text
PowerShell 守护进程
        └── Node.js 主题注入器
```

### Node.js 注入器负责

- 连接 CDP；
- 枚举页面目标；
- 验证页面身份；
- 注入 CSS 和主题组件；
- 监听页面刷新和新渲染器；
- 重新应用主题；
- 输出结构化日志。

### PowerShell 守护进程负责

- 启动目标客户端；
- 启动 Node 注入器；
- 监控注入器是否退出；
- 保存运行状态；
- 检查端口归属；
- 管理恢复操作；
- 防止启动多个重复实例。

运行状态可以记录：

```json
{
  "schemaVersion": 1,
  "port": 9351,
  "clientPid": 12040,
  "clientStartTime": "2026-07-18T10:20:30+08:00",
  "injectorPid": 15800,
  "injectorStartTime": "2026-07-18T10:20:35+08:00",
  "guardianPid": 9300,
  "nodePath": "C:\\...\\node.exe",
  "themeId": "midnight-ocean"
}
```

停止进程时不能只根据 PID 操作，还应检查进程启动时间、可执行文件路径、命令行特征和父子进程关系。

---

## 十五、安全设计原理

### 1. 域名白名单

浏览器扩展只允许在明确的 Doubao 官方域名上执行，不允许使用 `https://*/*` 一类过于宽泛的规则。

### 2. 本机端口限制

CDP 只能监听 `127.0.0.1`，不能监听所有网络接口。

### 3. 端口归属验证

连接 CDP 前必须确认监听端口的 PID、程序路径、安装来源、启动参数，以及是否是由主题项目启动的实例。

### 4. 页面身份验证

登录授权页、外部链接、第三方网页、支付页、OAuth 页面、人机验证页和文件下载页应默认跳过。

### 5. 不读取对话内容

皮肤实现不需要获取用户对话内容。项目不应该上传聊天内容、记录输入、读取登录令牌、导出 Cookie、拦截 API 请求或记录上传文件内容。

### 6. 禁止远程脚本

主题资源应全部保存在本地，并进行完整性检查，不允许从未知远程地址加载脚本。

### 7. 主题包校验

导入第三方主题时，应检查文件类型、解压路径、文件数量、总大小、单文件大小、配置格式、路径穿越、远程 URL 和可执行内容。

普通主题包建议只允许：

```text
JSON
CSS
PNG
JPEG
WebP
SVG（经过净化）
字体文件（可选且受限）
```

---

## 十六、它会修改什么，不会修改什么

### 会创建或修改的内容

- 主题配置；
- 处理后的背景图片；
- 主题缩略图；
- 编译后的 CSS；
- 用户偏好设置；
- 注入状态；
- 运行日志；
- 适配器版本信息。

```text
DoubaoSkin/
├── config/
│   └── settings.json
├── themes/
│   └── midnight-ocean/
│       ├── theme.json
│       ├── theme.css
│       ├── background.webp
│       └── preview.webp
├── runtime/
│   ├── state.json
│   └── logs/
└── adapters/
    └── doubao-page-adapter.js
```

### 不会修改的内容

项目不应该写入或替换：

- Doubao 官方可执行文件；
- 浏览器程序文件；
- Electron 的 `app.asar`；
- 官方 JavaScript 和 CSS 资源；
- 官方安装目录；
- 用户对话数据库；
- 登录凭据；
- Cookie；
- 模型请求参数。

因此它本质上是一个运行时视觉层。

---

## 十七、恢复默认界面的原理

执行恢复操作时，系统应：

1. 停止主题监控；
2. 移除根节点上的主题标记；
3. 删除主题 `<style>`；
4. 删除背景层；
5. 删除遮罩层；
6. 删除欢迎页横幅；
7. 移除添加到原生元素上的 `data-ds-role`；
8. 恢复项目修改过的内联样式；
9. 停止经过验证的注入器；
10. 停止经过验证的守护进程；
11. 清理运行状态；
12. 必要时重新加载 Doubao 页面。

```js
document.documentElement.removeAttribute("data-doubao-theme");
document.getElementById("doubao-skin-style")?.remove();
document.getElementById("doubao-skin-background")?.remove();
document.getElementById("doubao-skin-overlay")?.remove();
```

因为官方程序文件从未被修改，所以恢复时不需要重新安装 Doubao。

---

## 十八、兼容性与失效保护

Doubao 页面更新后，可能出现类名变化、DOM 层级调整、输入框结构变化、Portal 位置变化、CSP 变化或 Shadow DOM。

项目应采用“安全失败”原则：

```text
无法识别页面
      ↓
停止执行增强 JavaScript
      ↓
只保留安全的全局 CSS，或完全停止注入
      ↓
记录适配失败信息
      ↓
提示用户更新适配器
```

不能为了让主题继续显示而模糊匹配任意输入框、删除未知节点、覆盖整个页面或在不确定的页面上执行脚本。

---

## 十九、性能设计

### 1. 控制模糊区域

`backdrop-filter` 开销可能较高，推荐只用于左侧栏、输入区域、主消息面板和大型弹窗。

### 2. 减少持续动画

```css
@media (prefers-reduced-motion: reduce) {
    html[data-doubao-theme] *,
    html[data-doubao-theme] *::before,
    html[data-doubao-theme] *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

### 3. DOM 监控防抖

只检查受影响区域，缓存已识别节点，并使用固定标记避免重复处理。

### 4. 背景资源缓存

背景图片应处理后复用，不要在每次路由切换时重新生成 Base64。

---

## 二十、推荐的开发流程

### 第一阶段：页面研究

1. 确定目标是网页版还是桌面客户端；
2. 确认桌面客户端是否真的使用 Electron；
3. 分析页面的稳定语义结构；
4. 找到侧边栏、消息区和输入区；
5. 记录欢迎页与对话页的差异；
6. 检查弹窗和 Portal；
7. 确定可用的稳定选择器。

### 第二阶段：最小主题验证

只实现全局背景、暗色遮罩、侧边栏透明、输入框磨砂、消息卡片和一键恢复。

### 第三阶段：页面适配器

加入欢迎页识别、对话页识别、语义属性标记、DOM 重建监控、路由切换检测和幂等重新注入。

### 第四阶段：主题工作室

加入图片选择、裁剪、背景焦点调整、颜色选择、模糊强度、面板透明度、实时预览和主题导入导出。

### 第五阶段：安全和恢复

加入页面白名单、端口归属验证、进程启动时间验证、主题包完整性检查、日志脱敏和崩溃恢复。

### 第六阶段：版本适配

```text
adapter-v1
adapter-v2
adapter-safe-fallback
```

如果新版 Doubao 页面无法识别，自动进入安全降级模式。

---

## 二十一、推荐技术选型

### 网页版方案

```text
浏览器扩展：Manifest V3
开发语言：TypeScript
构建工具：Vite
主题样式：CSS Variables
配置校验：JSON Schema / Zod
图片处理：Canvas / createImageBitmap
本地存储：chrome.storage.local
DOM 监控：MutationObserver
测试：Vitest + Playwright
```

### Windows 桌面管理器

```text
控制面板：WPF、WinUI 3 或 Tauri
图片处理：System.Drawing 或 ImageSharp
注入器：Node.js
CDP：chrome-remote-interface 或 WebSocket
配置：JSON
日志：JSON Lines
进程管理：PowerShell / .NET Process API
```

如果只是面向 Doubao 网页版，优先做浏览器扩展，不建议一开始就引入 CDP 和守护进程。

---

## 二十二、和 Codex 方案的主要区别

| 项目 | Codex 桌面运行时注入 | Doubao 推荐方案 |
|---|---|---|
| 主要目标 | Electron 桌面应用 | 优先支持网页版 |
| 注入入口 | 本机 CDP | 浏览器扩展 content script |
| 是否需要重启 | 首次可能需要 | 通常不需要 |
| 是否需要调试端口 | 需要 | 网页版不需要 |
| 守护方式 | PowerShell + Node.js | 浏览器扩展自动管理 |
| 页面识别 | `app://` 和 Codex DOM | 官方域名和 Doubao DOM |
| 背景资源 | 本地注入资源 | 扩展内部资源 |
| 恢复方式 | 停止注入器并重启客户端 | 关闭扩展或停用主题 |
| 风险重点 | CDP 端口和进程归属 | 扩展权限和页面数据 |
| 更新适配 | Electron DOM 变化 | 网页 DOM 和 CSP 变化 |

---

## 二十三、一句话理解

可以把 Doubao 皮肤系统理解为：

> 一个只对 Doubao 页面生效的自动化主题扩展：它识别 Doubao 的真实界面，在不修改官方程序和对话逻辑的前提下，实时添加背景、颜色、磨砂效果和视觉组件，并在页面切换或重建后自动补回。

它与修改官方前端文件的传统换肤方式不同，主要优点是：

- 不修改官方核心文件；
- 原生功能仍然可用；
- 主题可以随时切换；
- 可以一键恢复；
- 网页版不需要重启；
- 背景和配色可视化调整；
- 可以为不同页面使用不同效果；
- 页面不兼容时可以安全停止。

主要缺点是：

- Doubao 更新页面结构后可能需要重新适配；
- 依赖随机类名的主题容易失效；
- 大量磨砂和动画可能影响性能；
- Electron/CDP 版本必须严格保护本机调试端口；
- 第三方主题包可能带来 CSS 或脚本安全风险。

因此，比较合理的最终设计是：

```text
Doubao 网页版
    └── 浏览器扩展运行时注入（首选）

经过确认的 Electron 客户端
    └── 本机 CDP 运行时注入（可选）

自建 Doubao API 客户端
    └── 直接实现原生主题系统（最稳定）
```

**总体原则是：只改变视觉层，不修改业务层；无法确认页面身份时，宁可停止注入，也不操作未知页面。**
