# 部署失败状态 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Step 2 增加可演示、可恢复且不泄露敏感凭据的部署失败状态。

**Architecture:** 在现有单页内存状态中加入故障演示与失败状态，部署任务循环在“拉取镜像”阶段按开关进入失败分支。失败视图保持在 Step 2，通过内联面板提供修改配置和重新部署，复用现有校验与日志边界。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 冒烟测试、浏览器交互验收

---

### Task 1: 失败状态界面与静态测试

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `tests/smoke.mjs`

- [x] **Step 1: 先扩展冒烟测试并验证失败**

在 `tests/smoke.mjs` 的静态界面断言中加入“故障演示”“部署失败”“修改认证信息”“重新部署”和 `DEPLOY-IMG-401`。运行 `node tests/smoke.mjs`，预期因页面尚未包含这些内容而失败。

- [x] **Step 2: 添加故障演示控制与内联错误面板**

在 Step 2 的安全说明后添加可访问的复选开关 `#simulate-failure`。在部署控制台内、日志上方添加 `#deploy-error`，包含失败阶段、错误代码 `DEPLOY-IMG-401`、脱敏原因、处理建议，以及 `#edit-credentials` 和 `#retry-deploy` 两个按钮；面板默认隐藏并使用 `role="alert"`。

- [x] **Step 3: 添加失败视觉与响应式规则**

在 `styles.css` 为错误面板、红色日志、失败进度和故障开关定义状态样式。`640px` 以下错误摘要与按钮切换为单栏，按钮宽度不超过容器。

- [x] **Step 4: 运行静态测试**

Run: `node tests/smoke.mjs`
Expected: 输出 `Smoke checks passed.`。

### Task 2: 失败状态机与恢复操作

**Files:**
- Modify: `app.js`

- [x] **Step 1: 扩展部署状态**

在 `state` 中加入 `simulateFailure` 和 `deploymentFailed`。开始部署时清除旧错误面板、失败类、进度与日志，并从第一项任务开始。

- [x] **Step 2: 实现拉取镜像失败分支**

当 `simulateFailure` 为真且当前任务为“拉取镜像”时，停止任务循环和计时，将当前任务改为“部署失败”，追加不包含任何输入凭据的红色日志，显示 `#deploy-error`，解锁恢复按钮，并保持在 Step 2。

- [x] **Step 3: 实现修改配置与重新部署**

“修改认证信息”解锁 Step 2 表单、隐藏失败面板并聚焦 `#harbor-user`；“重新部署”复用 `startDeployment()`，重新校验表单并清空旧进度与日志。故障演示开关保持原值。

- [x] **Step 4: 运行脚本检查与冒烟测试**

Run: `node --check app.js && node tests/smoke.mjs`
Expected: 两个命令退出码均为 `0`，并输出 `Smoke checks passed.`。

### Task 3: 浏览器验收、提交与发布

**Files:**
- Modify: `docs/superpowers/plans/2026-08-18-deployment-failure-state.md`

- [x] **Step 1: 验证故障流程**

在桌面视口进入 Step 2，启用故障演示并开始部署。确认进度在“拉取镜像”阶段停止、错误面板可见、代码为 `DEPLOY-IMG-401`、日志不含填写的云效和 Harbor 密码。

- [x] **Step 2: 验证两个恢复操作**

点击“修改认证信息”，确认表单重新启用并聚焦 Harbor 用户名；再次启用失败流程后点击“重新部署”，确认旧日志和进度被重置后重新执行。

- [x] **Step 3: 验证成功回归与移动端布局**

关闭故障演示后重新部署，确认自动进入 Step 3。以 `390x844` 视口检查错误面板无横向溢出，浏览器控制台无错误。

- [x] **Step 4: 提交并推送 GitHub Pages**

Run: `git add index.html styles.css app.js tests/smoke.mjs docs/superpowers/plans/2026-08-18-deployment-failure-state.md && git commit -m "feat: add recoverable deployment failure state" && git push origin master`
Expected: `master` 推送成功，GitHub Pages 构建完成后公网页面包含故障演示入口。
