# X 帖子截图

<img src="assets/icon.svg" width="96" height="96" alt="X 帖子截图图标" />

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

一个将 X（旧名 Twitter）帖子保存为 PNG 图片的用户脚本。它会把 **保存帖子截图** 注入 X 原生的帖子“更多”菜单，并尽量保持截图与当前屏幕所见一致。

> **AI 生成说明：** 本项目的代码完全由 AI 生成。

## 功能

- 在信息流和帖子详情页的原生“更多”菜单中注入一个截图项。
- 截取当前帖子卡片，包括作者、正文、引用帖、媒体和互动栏。
- 保留多图轮播当前所在的位置。
- 截取视频/GIF 当前帧；无法取得当前帧时回退到封面。
- 使用 `html-to-image` 渲染图片、背景图、遮罩和字体。
- 通过 GM API 提供跨域资源获取，不依赖页面自身的 CORS 行为。
- 适配 X 的浅色、dim 和 lights-out 主题。
- 提供英文、简体中文和繁体中文界面与提示。
- 不包含遥测、统计、远程代码或外部运行时服务。

## 安装

### GitHub Release

安装最新 GitHub Release 中的构建：

<https://github.com/PYUDNG/x-post-screenshot/releases/latest/download/x-post-screenshot.user.js>

### Greasyfork

Greasyfork 发布后，请从 Greasyfork 的 **X Post Screenshot / X 帖子截图** 页面安装。仓库内提供了可直接用于 Greasyfork 的站点合规文案：[README.greasyfork.zh-CN.md](README.greasyfork.zh-CN.md)。

## 使用

1. 打开 X，找到一条帖子。
2. 打开帖子右上角的“更多”菜单。
3. 点击“保存帖子截图”。
4. 截图会通过用户脚本管理器下载，页面底部会显示生成中、成功或失败提示。

脚本只截取帖子卡片，不包含页面页头、侧栏或当前打开的菜单。

## 兼容性

- 最新稳定版 Chrome、Edge、Firefox、Safari。
- Tampermonkey、Violentmonkey、ScriptCat。
- 仅限官方网页域名：`x.com`、`www.x.com`、`mobile.x.com`、`twitter.com`、`www.twitter.com`、`mobile.twitter.com`。
- 脚本在 `document-start` 运行，不进入 iframe，不申请列表之外的 GM 权限。

## 权限与网络

脚本使用：

- `GM_xmlhttpRequest`，仅请求 `*.twimg.com` 和 `*.pscp.tv` 下的资源。
- `GM_getValue` / `GM_setValue` 保存诊断日志和诊断开关，不使用 `localStorage`、`sessionStorage` 或页面 IndexedDB。
- `GM_registerMenuCommand` 注册诊断菜单。
- `GM_setClipboard` 作为导出诊断日志的剪贴板回退。
- `GM_download` 下载 PNG 和诊断 JSON。

不会向任意第三方主机上传数据。外部链接卡片中不属于 X 媒体 CDN 白名单的图片会显示中性占位图。脚本不上传 Cookie、凭据或帖子正文。

## 诊断日志

生产构建默认不向浏览器控制台输出日志。诊断记录保存在用户脚本管理器私有的 GM 存储中：

- 最多 100 条；
- 最多 64 KiB；
- 保留 7 天；
- 消息和堆栈会被脱敏，不包含帖子正文或完整媒体 URL。

在用户脚本管理器菜单中：

- **切换诊断日志**：开启详细诊断；若管理器提供 `unsafeWindow`，还会暴露 `__XPS_DEBUG__`；
- **导出诊断日志**：下载 JSON 报告；下载不可用时复制到剪贴板；
- **清空诊断日志**：删除已有记录。

导出内容包含捕获到的错误、耗时、主题、语言、版本、浏览器 UA 和构建类型，便于提交 Issue。

## 开发

要求 Node.js 22+ 和 pnpm。

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:browser
pnpm build
```

`pnpm build` 产出：

- `dist/x-post-screenshot.user.js`：GitHub Release 版，压缩并包含更新地址；
- `dist/x-post-screenshot.greasyfork.user.js`：Greasyfork 版，不压缩，不含 GitHub 更新地址；
- 对应的 `.meta.js` 和 `SHA256SUMS.txt`。

构建时会仅把 `html-to-image` 内部两处资源 `fetch` 和日志 `console` 注入为 GM 适配器，保留库自身的图片、字体和 CSS 内联逻辑，不使用 iframe、运行时 `eval` 或页面全局 monkey-patch。

## 已知限制

- 不在 X 媒体 CDN 白名单内的外部卡片图片可能显示占位图。
- X 随时可能修改 DOM，重大 UI 变更后需要用真实登录态重新验证选择器。
- 浏览器污染 canvas 时，视频帧会回退到封面图。
- 只截取当前帖子卡片，不拼接整个串推或对话。

## 许可证

MIT。内联的 `html-to-image` 同样使用 MIT 许可证，并在生成产物中保留来源和版本声明。
