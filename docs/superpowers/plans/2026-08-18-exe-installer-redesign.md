# 运营管理系统 EXE 安装器重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将部署中心重构为固定 720×540、左侧步骤、右侧表单的明亮 EXE 安装向导。

**Architecture:** 保留原生 HTML/CSS/JavaScript 和单一内存状态，将页面骨架改为固定安装器画布，并为每个步骤增加内部 Tab 状态。现有预检、部署、失败恢复、凭据生成和下载能力继续复用，但渲染目标改为紧凑的当前步骤面板。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 冒烟测试、浏览器交互与像素尺寸验收

---

### Task 1: 固定安装器骨架与明亮视觉

**Files:**
- Modify: `index.html`
- Replace: `styles.css`
- Modify: `tests/smoke.mjs`

- [x] **Step 1: 扩展静态测试并验证失败**

在 `tests/smoke.mjs` 断言“运营管理系统安装”、三个步骤名称、步骤内部 Tab、固定画布类名，并断言页面不包含主题切换文案。运行 `node tests/smoke.mjs`，预期旧页面因缺少新标题或类名失败。

- [x] **Step 2: 重建 720×540 页面骨架**

将 `index.html` 改为一个 `.installer` 画布，内部使用 `180px 540px` 两列。左侧包含品牌和三个步骤，右侧包含标题、当前内容和固定底部操作栏。保留现有输入字段 `id`，以便状态逻辑继续使用。

- [x] **Step 3: 重写单一明亮主题样式**

`styles.css` 使用橙色 `#ff6f2c` 和蓝色 `#2788c9`，固定 `.installer` 为 `720px × 540px`，右侧三行为 `84px 394px 62px`。删除主题选择器和旧桌面/移动响应式布局；小视口通过外部 `.stage` 等比缩放安装器画布。

### Task 2: 三步内部 Tab 与状态适配

**Files:**
- Replace: `app.js`
- Modify: `index.html`

- [x] **Step 1: 实现步骤和 Tab 状态**

状态对象增加 `stepTabs: {1:"ssh",2:"runtime",3:"deployment"}`。实现 `setStepTab(step, tab)`，更新 Tab 的 `aria-selected`、面板 `hidden` 和键盘焦点；Tab 切换不清空字段。

- [x] **Step 2: 适配 Step 1 预检**

远程 SSH 与本机部署使用 Tab。保留可见字段校验、密码与私钥切换、四项预检和下一步门禁。检查结果使用四个紧凑状态项，不增加内容高度。

- [x] **Step 3: 适配 Step 2 部署与失败恢复**

运行材料、镜像仓库和部署进度使用三个 Tab。开始部署前校验全部字段，错误时切换到对应 Tab；开始后切换到进度 Tab。故障演示失败时显示 `DEPLOY-IMG-401`，修改认证信息切换回镜像仓库。

- [x] **Step 4: 适配 Step 3 交付清单**

部署信息、数据服务、文件与后台使用三个 Tab。保留密码遮罩、显示/隐藏、复制、下载和登录系统；完成后前两步导航禁用。

### Task 3: 自动检查与浏览器验收

**Files:**
- Modify: `tests/smoke.mjs`
- Modify: `docs/superpowers/plans/2026-08-18-exe-installer-redesign.md`

- [x] **Step 1: 运行语法与静态测试**

Run: `node --check app.js && node tests/smoke.mjs`
Expected: 退出码均为 `0`，输出 `Smoke checks passed.`。

- [x] **Step 2: 验证 720×540 几何尺寸**

在浏览器 720×540 视口检查 `.installer` 的边界为 720×540、左栏为 180、右栏为 540，`scrollWidth` 与 `scrollHeight` 不超过视口。

- [x] **Step 3: 验证三步成功流程**

完成本机部署路径，确认 Step 1 预检、Step 2 三个 Tab、部署进度、Step 3 三个清单 Tab、下载确认和完成态锁定均可用，控制台无错误。

- [x] **Step 4: 验证故障与小视口预览**

启用故障演示并确认错误恢复；在小于 720×540 的视口确认安装器等比缩放且无内容遮挡。

- [x] **Step 5: 提交分支**

Run: `git add index.html styles.css app.js tests/smoke.mjs docs/superpowers/plans/2026-08-18-exe-installer-redesign.md && git commit -m "feat: redesign deployment center as exe installer"`
Expected: 提交位于 `codex/exe-installer-redesign`，不推送或合并到 `master`。
