# X 貼文截圖

<img src="assets/icon.svg" width="96" height="96" alt="X 貼文截圖圖示" />

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

一個將 X（舊名 Twitter）貼文儲存為 PNG 圖片的用戶腳本。它會在 X 原生的貼文「更多」選單中加入 **儲存貼文截圖**，並盡量讓截圖與目前畫面一致。

## 功能

- 在時間軸和貼文詳情頁的原生「更多」選單中加入截圖項目。
- 截取目前貼文卡片：作者、正文、引用貼文、媒體和互動列。
- 保留多圖輪播目前的位置。
- 截取影片/GIF 目前影格；無法取得時回退到封面。
- 透過 `html-to-image` 呈現圖片、背景圖、遮罩和字型。
- 透過 GM API 取得跨域資源，不依賴頁面自身的 CORS 行為。
- 支援 X 的淺色、dim 和 lights-out 主題。
- 提供英文、簡體中文和繁體中文介面與提示。
- 不包含遙測、統計、遠端程式碼或外部執行期服務。

## 安裝

### GitHub Release

安裝最新 GitHub Release 中的建置：

<https://github.com/PY-DNG/x-post-screenshot/releases/latest/download/x-post-screenshot.user.js>

### Greasyfork

Greasyfork 發布後，請從 Greasyfork 的 **X Post Screenshot / X 貼文截圖** 頁面安裝。倉庫內提供可直接用於 Greasyfork 的站點合規文案：[README.greasyfork.zh-TW.md](README.greasyfork.zh-TW.md)。

## 使用

1. 開啟 X，找到一則貼文。
2. 開啟貼文右上角的「更多」選單。
3. 點選「儲存貼文截圖」。
4. 截圖會透過用戶腳本管理器下載，頁面底部會顯示產生中、成功或失敗提示。

腳本只截取貼文卡片，不包含頁首、側欄或目前開啟的選單。

## 相容性

- 最新穩定版 Chrome、Edge、Firefox、Safari。
- Tampermonkey、Violentmonkey、ScriptCat。
- 僅限官方網頁網域：`x.com`、`www.x.com`、`mobile.x.com`、`twitter.com`、`www.twitter.com`、`mobile.twitter.com`。
- 腳本在 `document-start` 執行，不進入 iframe，不申請清單以外的 GM 權限。

## 權限與網路

腳本使用：

- `GM_xmlhttpRequest`，僅請求 `*.twimg.com` 和 `*.pscp.tv` 下的資源。
- `GM_getValue` / `GM_setValue` 儲存診斷日誌和診斷開關，不使用 `localStorage`、`sessionStorage` 或頁面 IndexedDB。
- `GM_registerMenuCommand` 註冊診斷選單。
- `GM_setClipboard` 作為匯出診斷日誌的剪貼簿回退。
- `GM_download` 下載 PNG 和診斷 JSON。

不會向任意第三方主機上傳資料。外部連結卡片中不屬於 X 媒體 CDN 白名單的圖片會顯示中性佔位圖。腳本不上傳 Cookie、憑證或貼文正文。

## 診斷日誌

生產建置預設不向瀏覽器主控台輸出日誌。診斷記錄保存在用戶腳本管理器私有的 GM 儲存中：

- 最多 100 筆；
- 最多 64 KiB；
- 保留 7 天；
- 訊息和堆疊會去識別化，不包含貼文正文或完整媒體 URL。

在用戶腳本管理器選單中：

- **切換診斷日誌**：開啟詳細診斷；若管理器提供 `unsafeWindow`，還會暴露 `__XPS_DEBUG__`；
- **匯出診斷日誌**：下載 JSON 報告；下載不可用時複製到剪貼簿；
- **清空診斷日誌**：刪除既有記錄。

匯出內容包含捕捉到的錯誤、耗時、主題、語言、版本、瀏覽器 UA 和建置類型，方便提交 Issue。

## 開發

需要 Node.js 22+ 和 pnpm。

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:browser
pnpm build
```

`pnpm build` 產出：

- `dist/x-post-screenshot.user.js`：GitHub Release 版，壓縮並包含更新位址；
- `dist/x-post-screenshot.greasyfork.user.js`：Greasyfork 版，不壓縮，不含 GitHub 更新位址；
- 對應的 `.meta.js` 和 `SHA256SUMS.txt`。

建置時只會把 `html-to-image` 內部兩處資源 `fetch` 和日誌 `console` 注入為 GM 轉接器，保留函式庫自身的圖片、字型和 CSS 內嵌邏輯，不使用 iframe、執行期 `eval` 或頁面全域 monkey-patch。

## 已知限制

- 不在 X 媒體 CDN 白名單內的外部卡片圖片可能顯示佔位圖。
- X 隨時可能修改 DOM，重大 UI 變更後需要用真實登入狀態重新驗證選擇器。
- 瀏覽器污染 canvas 時，影片影格會回退到封面圖。
- 只截取目前貼文卡片，不拼接整個串推或對話。

## 授權

MIT。內嵌的 `html-to-image` 同樣使用 MIT 授權，並在產物中保留來源和版本聲明。
