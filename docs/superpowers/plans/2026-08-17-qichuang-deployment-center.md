# 启创动力部署中心交互原型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个无需安装依赖、可直接在浏览器运行的三步部署中心交互原型。

**Architecture:** 原生 HTML、CSS 和 JavaScript 单页应用，以单一内存状态对象驱动目标方式、表单、预检、部署进度和交付清单。视图渲染与业务校验分离，敏感输入不写入本地存储或日志，所有部署行为均为前端模拟。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 静态校验、浏览器交互验收

---

### Task 1: 页面骨架与深色运维视觉

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `assets/logo.png`

- [ ] **Step 1: 创建三步语义化页面结构**

在 `index.html` 中创建品牌栏、三步进度、主工作区、右侧摘要、Step 1 两种目标表单、Step 2 Runtime Bundle 与 Harbor 表单、Step 3 交付清单和全局提示区域。所有输入建立唯一 `id`，标签使用 `for` 关联。

- [ ] **Step 2: 接入品牌资产**

将 `D:/张乐工作空间/0产品部/logo11@4x.png` 复制为 `assets/logo.png`，在品牌栏中以固定高度和自适应宽度显示。

- [ ] **Step 3: 实现深色终端视觉与响应式布局**

在 `styles.css` 定义颜色、间距、字体、状态和阴影令牌。桌面端采用主区加摘要双栏，`900px` 以下切换单栏，`640px` 以下压缩步骤文字并让底部操作纵向排列。为 `:focus-visible`、禁用、错误、加载和成功状态提供明确样式。

- [ ] **Step 4: 运行静态资源检查**

Run: `Test-Path index.html,styles.css,assets/logo.png`
Expected: 三项均为 `True`。

### Task 2: 部署目标、认证切换与环境预检

**Files:**
- Create: `app.js`
- Modify: `index.html`

- [ ] **Step 1: 建立内存状态与视图渲染边界**

在 `app.js` 定义 `state`，包含 `step`、`targetMode`、`authMode`、`preflight`、`deployment` 和 `credentials`。实现 `setStep()`、`renderTargetMode()`、`renderAuthMode()`、`renderPreflight()`、`renderSummary()` 与 `showToast()`。

- [ ] **Step 2: 实现当前可见字段校验**

实现 `validateStepOne()`：远程 SSH 校验目标名称、服务器地址、端口、用户，以及当前认证方式对应的密码或私钥路径；本机部署校验 Owner、openGauss 地址、端口、运维用户名和密码。端口范围为 1 至 65535，错误关联到字段并聚焦首项。

- [ ] **Step 3: 实现模拟环境预检**

点击“检查环境”后依次将 Docker、架构、磁盘和权限从等待改为检查中再改为通过；运行期间锁定目标切换和表单。全部通过后启用“下一步”，目标配置发生变化时重置预检状态。

- [ ] **Step 4: 验证步骤门禁**

Run: `node --check app.js`
Expected: exit code `0`，无语法错误。

### Task 3: Runtime Bundle、部署模拟与交付清单

**Files:**
- Modify: `app.js`
- Modify: `index.html`

- [ ] **Step 1: 实现 Step 2 校验与安全说明**

校验 Runtime Bundle 版本、云效 Generic 用户名、云效密码或令牌、Harbor 用户名和 Harbor 密码或机器人令牌。根据目标方式显示通用 Harbor 安全说明和本机运行根说明。

- [ ] **Step 2: 实现部署任务状态机**

按“获取 Runtime Bundle、登录 Harbor、拉取镜像、准备运行根、启动中间件、启动应用、健康检查”七项任务更新进度、当前任务、耗时和终端日志。日志仅记录脱敏后的地址与动作，不包含任何密码、令牌、私钥路径或口令。完成后自动进入 Step 3。

- [ ] **Step 3: 生成随机演示凭据**

使用 `crypto.getRandomValues()` 生成数据库密码、时序库令牌、对象存储密钥和后台管理员密码。凭据只保存在 `state.credentials`，首次部署完成时生成，刷新后消失。

- [ ] **Step 4: 实现清单操作**

实现密码显隐、单项复制、复制完整清单，以及“下载交付清单”。下载前通过确认对话提示敏感信息，确认后用 Blob 生成 `启创动力-部署交付清单-YYYYMMDD-HHmm.txt`。实现“登录系统”并使用 `noopener,noreferrer` 打开后台地址。

- [ ] **Step 5: 运行脚本语法检查**

Run: `node --check app.js`
Expected: exit code `0`，无语法错误。

### Task 4: 完整流程与响应式验收

**Files:**
- Create: `server.mjs`
- Create: `tests/smoke.mjs`

- [ ] **Step 1: 添加零依赖本地静态服务器**

`server.mjs` 使用 Node `http`、`fs` 和 `path` 模块，仅服务项目目录内的 HTML、CSS、JS 和 PNG 文件，默认监听 `127.0.0.1:4178`，支持通过 `PORT` 覆盖。

- [ ] **Step 2: 添加静态冒烟测试**

`tests/smoke.mjs` 使用 Node `assert` 检查 HTML 中三步标题、两种目标方式、四类交付区块和两个完成操作，并检查 CSS、JS、Logo 文件存在且脚本语法有效。

- [ ] **Step 3: 运行自动检查**

Run: `node tests/smoke.mjs`
Expected: 输出 `Smoke checks passed.`。

- [ ] **Step 4: 浏览器验证桌面完整流程**

启动 `node server.mjs`，在 `1440x1000` 视口完成本机部署路径：填写 openGauss、环境预检、填写云效与 Harbor、开始部署、进入完成页、切换密码可见性并触发下载。确认没有控制台错误，步骤、日志和进度同步。

- [ ] **Step 5: 浏览器验证移动端布局**

在 `390x844` 视口检查三步标题、表单、预检结果、日志和完成页；确认无横向滚动、文字遮挡或按钮超出容器。

- [ ] **Step 6: 提交交互原型**

Run: `git add index.html styles.css app.js assets/logo.png server.mjs tests/smoke.mjs docs/superpowers/plans/2026-08-17-qichuang-deployment-center.md && git commit -m "feat: build deployment center prototype"`
Expected: 创建包含原型、测试和实现计划的提交。
