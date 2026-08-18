# 部署中心主题模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为部署中心增加暗色、亮色和跟随系统三种主题模式，并安全持久化主题偏好。

**Architecture:** 用 `data-theme` 属性和 CSS 令牌切换主题，跟随系统使用 `prefers-color-scheme` 媒体查询。JavaScript 只持久化主题字符串 `dark`、`light` 或 `system`，不触碰现有部署状态和敏感凭据。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 冒烟测试、浏览器验收

---

### Task 1: 主题控件与样式令牌

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `tests/smoke.mjs`

- [x] **Step 1: 扩展冒烟测试并验证失败**

在冒烟测试中加入“暗色”“亮色”“跟随系统”三个静态文本断言；运行 `node tests/smoke.mjs`，预期在控件添加前失败。

- [x] **Step 2: 添加可访问主题控件**

在顶部状态区域加入 `role="group"` 的三段按钮，使用 `aria-pressed` 表示当前主题，不改变现有部署步骤结构。

- [x] **Step 3: 添加亮色令牌和系统模式规则**

在 CSS 中增加 `[data-theme="light"]` 令牌覆盖以及 `@media (prefers-color-scheme: light)` 的 system 覆盖。亮色保持橙色主按钮白字，并确保输入、错误面板、摘要和日志具有足够对比度。

### Task 2: 主题状态与验收

**Files:**
- Modify: `app.js`

- [x] **Step 1: 实现主题初始化与切换**

读取 `localStorage` 中的 `qcdl-theme`，无值时使用 `system`；切换时更新 `document.documentElement.dataset.theme`、按钮 `aria-pressed` 和本地偏好。无效值回退为 `system`。

- [x] **Step 2: 运行静态检查**

Run: `node --check app.js && node tests/smoke.mjs`
Expected: 两个命令退出码为 `0`，并输出 `Smoke checks passed.`。

- [x] **Step 3: 浏览器验证三种模式**

验证按钮即时切换、刷新后偏好保留、跟随系统模式使用媒体查询；检查部署表单不会被主题偏好写入或恢复。

- [x] **Step 4: 提交并推送**

Run: `git add index.html styles.css app.js tests/smoke.mjs docs/superpowers/specs/2026-08-17-qichuang-deployment-center-design.md docs/superpowers/plans/2026-08-18-theme-modes.md && git commit -m "feat: add theme mode switcher" && git push origin master`
Expected: GitHub Pages 构建完成后公网版本出现主题控件。
