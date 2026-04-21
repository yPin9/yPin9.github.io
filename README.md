# λ66 Blog — 開發與寫作規範

Hugo 靜態部落格，使用 charaka theme（已在 `themes/charaka/` 魔改）。這份 README 記錄專案的結構、寫作規範、以及已經內建好的自訂功能，方便 Claude 之後協助改動時快速上手。

---

## 1. Tech stack

- **SSG**：Hugo（build config 在 `config.toml`，舊 config 備份在 `hugo.toml.bak`）
- **Theme**：`charaka`（Bulma-based；SCSS 原檔在 `themes/charaka/scss/styles.scss`）
- **Base URL**：`https://yPin9.github.io`
- **Goldmark**：`unsafe = true` — 可以在 markdown 裡直接寫 HTML 和 inline CSS
- **Highlight**：Chroma + `dracula` style，line numbers 打開，額外在 `custom.css` 中加了 macOS「Carbon」風格裝飾
- **Permalinks**：`posts = ":slug/"` — 所有 posts 的 URL 都是 `/:slug/`（沒有 `/posts/` 前綴）

---

## 2. 常用指令

```bash
# 本機預覽（含 drafts / futures）
hugo server -D -F

# Production build（輸出到 public/）
hugo --minify

# 新增一篇 post
hugo new posts/<slug>/index.md
```

> 建議：寫新 post 時直接用 `index.md`（leaf bundle）而不是 `main.md`，同資料夾的圖片才會被 Hugo 當 page resource 處理。詳見第 4 節。

---

## 3. 目錄結構

```
mysite/
├── config.toml                  # Hugo 主設定
├── content/
│   └── posts/                   # 所有文章
│       ├── <slug>/index.md      # leaf bundle（推薦）
│       ├── <slug>/main.md       # 舊格式，相對圖片會失效
│       └── <slug>/*.jpg         # 同資料夾的圖片 = page resource
├── layouts/                     # 站層級的 override（優先於 theme）
│   ├── _default/
│   ├── partials/header.html     # 自行 inject custom.css 的地方
│   └── shortcodes/              # 自訂 shortcodes（見第 6 節）
├── static/
│   ├── css/custom.css           # ⭐ 全站自訂 CSS（本站 styling 主戰場）
│   └── js/
├── themes/charaka/              # theme 本體（已客製，SCSS 在此）
└── public/                      # build 產物（勿手改）
```

重點：
- `static/` 下的檔案會原樣複製到 site root。`css/custom.css` 已被 `layouts/partials/header.html` 以 `?v={{ now.Unix }}` 的 cache buster 載入，**每次重整都強制重抓新版**
- `layouts/` 跟 `themes/charaka/layouts/` 同名檔時，前者優先 — 要改 theme 行為先在 root 的 `layouts/` 放同路徑的覆寫檔

---

## 4. 文章寫作規範

### 4.1 檔名與資料夾

| 做法 | 適合 | 缺點 |
|------|------|------|
| `<slug>/index.md` | 有圖、有附檔的文章（**推薦**） | — |
| `<slug>/main.md` | 純文字文章（歷史遺留） | 同資料夾圖片 **不會** 被當 page resource，`![](img.jpg)` 無法 render |
| `<slug>.md` | 超短文 | 無法帶附件 |

`main.md` 能 render 是因為 Hugo 把它當單一頁面處理；但它**不是** leaf bundle，所以 `math_book.jpg` 放在旁邊也不會被 copy 進 output。如果要加圖，**先改名成 `index.md`**。

### 4.2 Frontmatter

常用格式（YAML）：
```yaml
---
title: <標題>
date: 2026-04-21
tags: notes           # 或 [notes, ctf] 等
categories: [xxx]     # 可選；出現時右側會多一個 sidebar
---
```

特殊 tags：
- `notes` → 啟用 `.notes` class，套用首段首字放大（drop cap）與段落縮排
- `ctf` / `cs` / `compiler` / `notes` → 有對應的 `.post-tag-*` 樣式

### 4.3 Layout 與 sidebar

`single.html` 的結構：
```
.single-layout (grid)
├── .single-main         ← 文章內容（包含 h1、<div class="content notes">）
└── .single-sidebar      ← 僅當 categories 或 tags 存在時出現（桌機 250px 寬）
```

**注意**：有 tag 的文章右邊會有 250px 的 sidebar。浮動元素（float: right + 負 margin）推太遠會撞到它。

---

## 5. 內建自訂樣式與 pattern

所有自訂樣式都在 `static/css/custom.css`。目前已經寫好的可用 pattern：

### 5.1 圖片與圖說（論文風格 figure）

```html
<figure id="fig1" style="float: right; clear: right; width: 250px;
                         margin: 0.35rem -15rem 1rem 1.5rem;">
  <img src="xxx.jpg" alt="..." style="width: 100%; display: block;">
  <figcaption style="margin-top: 0.4em; font-size: 0.85em;
                     color: #6e5631; text-align: center; font-style: italic;">
    1.　圖說文字
  </figcaption>
</figure>
```

負的 `margin-right` 會把圖推到文章欄外（進入右邊的留白區）。預設 `-15rem` 對應 250px 左右的圖；如果圖變大/變小，對應調整。

### 5.2 內文的 figure reference（`.fig-ref`）

```html
...某段文字<a href="#fig1" class="fig-ref">1</a>。
```

視覺效果：小、下沉、括號包起來（CSS 會自動加 `[` `]`）、hover 變色、點擊平滑捲動到 `#fig1` 並閃一下紫紅外框。要改成圓括號就改 `.fig-ref::before/::after` 的 `content`。

### 5.3 `.sidenote`（浮右的註解框）

`custom.css` 有樣式，但用起來要搭配 shortcode：

```markdown
{{< sidenote title="注" >}}
這裡是註解內文，可寫 markdown。
{{< /sidenote >}}
```

桌機（`min-width: 900px`）會浮到右邊、margin-right: -16.5rem 推進留白區。

### 5.4 `{{< quote >}}` shortcode

```markdown
{{< quote >}}
置中、斜體、無邊框的引言
{{< /quote >}}
```

和 `>` blockquote 不同 — `>` 會套用左側棕線 + 淡黃底的樣式（`body blockquote` in custom.css）。

### 5.5 Post tags（inline chip）

內文中手動標示用：
```html
<span class="post-tag-inline post-tag-ctf">CTF</span>
```
可用：`post-tag-ctf` / `post-tag-cs` / `post-tag-notes` / `post-tag-compiler`。

### 5.6 Code blocks（Carbon 風）

````markdown
```python
print("hello")
```
````

`.highlight` 已被 override 成：大圓角、深色背景、左上角紅黃綠小圓點、陰影。Chroma 用 `dracula` style。**不用額外做事** — 放普通 fenced code block 就會自動套用。

### 5.7 Drop cap（首字放大）

只在 `tags: notes` 的文章啟動，第一段的首字（`:first-of-type::first-letter`）會放大 3.5em、float: left。

**注意**：如果第一個元素是 `<figure>` 或 `<blockquote>` 而不是 `<p>`，drop cap 會落到下一個 `<p>`。要讓首字放大對「整理房間...」這段有效，`<figure>` 必須放在這段之後（或 inline 進段落）。

### 5.8 Shortcodes

| Shortcode | 位置 | 用途 |
|-----------|------|------|
| `{{< quote >}}` | `layouts/shortcodes/quote.html` | 置中斜體引言 |
| `{{< sidenote title="xxx" >}}` | `layouts/shortcodes/sidenote.html` | 浮右註解框 |
| `{{< gist user id [filename] >}}` | `layouts/shortcodes/gist.html` | Embed GitHub gist |

---

## 6. CSS 編輯準則

1. **優先改 `static/css/custom.css`**，不要直接改 theme 的 SCSS（theme update 會覆蓋）
2. Bulma 的 `.content` 有自己的 reset — 想覆蓋它常常要 `!important` 或用更高 specificity（`.single-main .content`）
3. 標題 `<h1 class="subtitle">` 用 `margin`；如果要讓下方空間真的撐開、不被 margin collapse 吃掉，改用 `padding-top`
4. 要讓 `float: right` 的元素不被主內容遮住：負 `margin-right`，搭配 `clear: right` 避免跟其他浮動物疊
5. 所有顏色盡量跟主題一致：
   - 棕 `#584029` / `#8b6a3e` / `#6e5631`
   - 酒紅（primary）`#a14b7b` / `#760411`
   - 奶油底 `#f7f1e7`

---

## 7. 常見陷阱（Claude 改 code 前先看這裡）

1. **`main.md` ≠ leaf bundle**：有圖的文章要用 `index.md`
2. **路徑含空格會被 URL encode**：建議資料夾名用 snake_case / kebab-case
3. **`title: learing`** 之類的拼字在 frontmatter 裡會直接變成網址 slug — 寫完檢查一下
4. **Hugo server 有時 CSS 不熱更新**：停掉重開；瀏覽器端 Ctrl + F5 強制重抓
5. **Margin collapse**：`.content` 跟它第一個子元素的 `margin-top` 會合併，改用 `padding-top` 避開
6. **有 tag 的文章右邊有 250px sidebar**：浮動圖片推太遠會撞到它（目前 `fig-ref` 的圖 `-15rem` 剛好落在 gap + sidebar 邊緣）
7. **`layouts/partials/header.html`（root）會完全蓋掉 theme 的同名檔** — 改 header 前先 diff 一下兩者
8. **`config.toml` 用的是 `[markup.goldmark.renderer] unsafe = true`**，所以 inline HTML / `<img style="...">` 一定 work；不要因為「Markdown 不該支援」而拒絕用 HTML

---

## 8. 關於這份 README

如果想讓 Claude Code 自動讀取這份文件，把檔名改成 `CLAUDE.md`（Claude Code 會自動載入同名檔到 context）。或乾脆 `cp README.md CLAUDE.md` 兩份都留。
