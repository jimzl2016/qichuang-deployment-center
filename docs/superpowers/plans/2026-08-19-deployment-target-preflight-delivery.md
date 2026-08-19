# Deployment Target, Preflight, And Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 720x540 安装器调整为“选择部署目标 -> 环境预检 -> 部署完成”的三步流程，并支持远程 SSH/本机部署配置、预检错误详情和四类交付清单。

**Architecture:** 保留原生 HTML/CSS/JavaScript 和单页状态模型。Step 1 负责目标配置和连接入口，Step 2 负责四项环境检查和错误状态，Step 3 负责本地交付清单路径、敏感信息和完成锁定；不引入真实 SSH、Docker 或数据库连接。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js smoke test、浏览器交互验收。

---

### Task 1: 更新静态测试基线

**Files:**
- Modify: tests/smoke.mjs
- Test: index.html, styles.css, app.js

- [x] **Step 1: 写入新流程的失败断言**

在静态断言中加入新标题、Tab、默认值和交付字段，先让旧页面失败：

    for (const text of [
      "选择部署目标", "远程 SSH", "本机部署", "环境预检", "部署完成",
      "部署目标", "服务端口", "数据库", "安装目录", "测试连接",
      "检测环境", "查看错误", "安装部署", "交付清单文件路径",
      "部署信息", "数据服务", "文件服务", "后台账号", "复制完整清单",
      "下载清单", "完成"
    ]) assert.ok(html.includes(text), "Missing static UI text: " + text);
    assert.ok(html.includes("/qcdl/jar-project"));
    assert.ok(html.includes("C:/Users/87188/AppData/Local/Programs/OMS"));
    assert.ok(script.includes("openGauss（暂不支持）"));
    assert.ok(script.includes("preflightFailed"));

- [x] **Step 2: 运行测试确认旧实现失败**

运行：node tests\smoke.mjs

预期：FAIL，报告缺少“选择部署目标”或“环境预检”，证明测试确实覆盖新需求。

- [x] **Step 3: 保留固定画布和完成锁定断言**

继续保留以下几何与锁定断言：

    assert.match(html, /class="installer"[^>]+data-installer-size="720x540"/);
    assert.match(styles, /grid-template-columns:180px 540px/);
    assert.match(styles, /grid-template-rows:84px 394px 62px/);
    assert.ok(script.includes("state.deploymentDone || step > state.step"));

- [x] **Step 4: 提交测试基线**

运行：git add tests/smoke.mjs; git commit -m "test: define target preflight delivery flow"

预期：提交成功，正式页面尚未修改。

### Task 2: 重建三步 HTML 结构

**Files:**
- Modify: index.html

- [x] **Step 1: 替换左侧步骤名称和右侧步骤标题**

左侧导航使用：

    <button data-step-nav="1">选择部署目标</button>
    <button data-step-nav="2" disabled>环境预检</button>
    <button data-step-nav="3" disabled>部署完成</button>

右侧保留固定三行布局，Step 1 标题为“选择部署目标”，Step 2 标题为“环境预检”，Step 3 标题为“部署完成”。

- [x] **Step 2: 重建 Step 1 的远程 SSH/本机部署 Tab 和字段**

使用 data-step-tab="1:ssh" 与 data-step-tab="1:local"，界面只显示“远程 SSH”和“本机部署”，并保留以下可测试 ID：

    <input id="target-name" value="/qcdl/jar-project">
    <input id="server-port" value="8080">
    <input id="ssh-db-mysql" type="radio" checked>
    <input id="ssh-db-opengauss" type="radio">
    <input id="server-host">
    <input id="ssh-port" value="22">
    <input id="ssh-user">
    <input id="ssh-password" type="password">
    <input id="key-path">
    <input id="key-passphrase" type="password">
    <input id="install-dir" value="C:/Users/87188/AppData/Local/Programs/OMS">
    <input id="local-server-port" value="8080">
    <input id="local-db-mysql" type="radio" checked>
    <input id="local-db-opengauss" type="radio" disabled>

C1 底部按钮使用 id="test-connection"，C2 使用 id="to-step2"；C2 的 openGauss 必须带 disabled 和“暂不支持”文本。

- [x] **Step 3: 重建 Step 2 的预检主体和错误面板**

Step 2 只放四个检查项、统一错误面板和详情按钮：

    <div id="preflight-checks">
      <div class="check" data-check="docker"></div>
      <div class="check" data-check="arch"></div>
      <div class="check" data-check="disk"></div>
      <div class="check" data-check="permission"></div>
    </div>
    <div id="preflight-error" role="alert" hidden>
      <code id="preflight-error-code"></code>
      <p id="preflight-error-summary"></p>
      <button id="view-preflight-error">查看错误</button>
      <pre id="preflight-error-detail" hidden></pre>
    </div>

底部操作使用 id="back-step1" 和 id="start-deploy"，后者在预检通过前禁用。

- [x] **Step 4: 重建 Step 3 的四类交付 Tab**

交付面板必须包含 id="tab-deployment"、id="tab-data"、id="tab-files"、id="tab-admin"，并在 Tab 上方显示：

    <div id="checklist-path">C:/Users/87188/AppData/Local/Programs/OMS/delivery/deployment-checklist.txt</div>

底部按钮使用 id="copy-all"、id="download-checklist"、id="finish-installation"。

### Task 3: 重写状态逻辑与交互

**Files:**
- Modify: app.js

- [x] **Step 1: 扩展单一状态对象**

将状态扩展为：

    const state = {
      step: 1,
      stepTabs: { 1: "ssh", 3: "deployment" },
      targetMode: "ssh",
      authMode: "password",
      connectionTested: false,
      connectionFailed: false,
      preflightDone: false,
      preflightFailed: false,
      preflightErrorOpen: false,
      preflightRunning: false,
      deploymentDone: false,
      deploymentFailed: false,
      credentials: null
    };

- [x] **Step 2: 实现 C1/C2 切换和字段校验**

setStepTab(1, tab) 必须同步 state.targetMode、显示对应面板，并调用：

    function resetTargetState() {
      state.connectionTested = false;
      state.connectionFailed = false;
      state.preflightDone = false;
      state.preflightFailed = false;
      state.preflightErrorOpen = false;
      $("#to-step2").disabled = true;
      $("#start-deploy").disabled = true;
      $("#preflight-error").hidden = true;
    }

C1 校验目标、服务器地址、SSH 端口、用户和密码/私钥；C2 校验安装目录和服务端口。C2 openGauss 不参与可选值校验。

- [x] **Step 3: 实现测试连接和预检失败状态**

测试连接按钮使用模拟结果：字段合法时设置 connectionTested=true 并允许进入 Step 2；字段不合法时显示连接错误摘要。预检执行按 Docker、架构、磁盘、权限逐项更新状态；失败时设置：

    state.preflightFailed = true;
    state.preflightDone = false;
    $("#preflight-error-code").textContent = "ENV-DOCKER-001";
    $("#preflight-error-summary").textContent = "Docker Desktop 未运行，请启动 Docker 后重试。";
    $("#preflight-error").hidden = false;

view-preflight-error 只切换 preflight-error-detail.hidden，不改变画布尺寸。

- [x] **Step 4: 实现部署完成和交付清单生成**

部署成功后生成四组清单：

    state.credentials = {
      path: "C:/Users/87188/AppData/Local/Programs/OMS/delivery/deployment-checklist.txt",
      groups: [
        { title: "部署信息", fields: [] },
        { title: "数据服务", fields: [] },
        { title: "文件服务", fields: [] },
        { title: "后台账号", fields: [] }
      ]
    };
    state.deploymentDone = true;
    setStep(3);

敏感字段沿用现有遮罩、显示/隐藏、单行复制和完整清单复制逻辑；下载前继续显示敏感信息确认弹窗。

- [x] **Step 5: 实现完成锁定**

renderStepper() 和步骤导航必须保证：

    button.disabled = state.deploymentDone || step > state.step;

finish-installation 显示完成提示并维持 state.deploymentDone=true，不能返回 Step 1 或 Step 2。

### Task 4: 调整 720x540 视觉样式

**Files:**
- Modify: styles.css

- [x] **Step 1: 保留固定画布和三行布局**

保留以下布局约束：

    .installer { width: 720px; height: 540px; grid-template-columns: 180px 540px; }
    .screen { width: 540px; height: 540px; grid-template-rows: 84px 394px 62px; }
    html, body { overflow: hidden; }

- [x] **Step 2: 为错误状态和详情状态增加紧凑样式**

    #preflight-error { height: 94px; border: 1px solid #e8b8b5; background: #fff4f3; }
    #preflight-error-detail { max-height: 42px; overflow: auto; }
    .check.is-fail { border-color: #e8b8b5; background: #fff4f3; color: #d94b45; }

错误详情使用主体内部滚动，不允许页面滚动或改变 720x540 外框。

- [x] **Step 3: 为交付路径和四 Tab 增加样式**

    #checklist-path { height: 30px; padding: 8px 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: #edf5fb; border-left: 3px solid #2788c9; font: 8px var(--mono); }
    .delivery-tabs { display: flex; }
    .handoff-panel { height: 278px; overflow: hidden; }

### Task 5: 自动化与浏览器验收

**Files:**
- Modify: tests/smoke.mjs
- Modify: docs/superpowers/plans/2026-08-19-deployment-target-preflight-delivery.md

- [x] **Step 1: 运行语法和静态测试**

运行：

    node --check app.js
    node tests\smoke.mjs
    git diff --check

预期：语法检查、Smoke checks 和 diff 检查均成功。

- [x] **Step 2: 验证 720x540 几何尺寸**

在浏览器设置视口 720x540，读取：

    ({
      installer: document.querySelector(".installer").getBoundingClientRect().toJSON(),
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight
    })

预期：安装器为 720x540，文档滚动尺寸不超过视口。

- [x] **Step 3: 验证 C1/C2 与失败恢复**

依次点击 C1/C2，确认字段切换、C2 openGauss 禁用、C1 测试连接错误和成功状态、Step 2 四项检查、查看错误详情展开，以及失败后可返回 Step 1。

- [x] **Step 4: 验证完成交付**

完成模拟部署后确认 Step 3 四个 Tab、路径文本、敏感信息遮罩、复制、下载确认和完成锁定全部可用；检查控制台没有页面脚本错误。

- [x] **Step 5: 更新计划状态并提交实现**

执行：

    git add index.html styles.css app.js tests/smoke.mjs docs/superpowers/plans/2026-08-19-deployment-target-preflight-delivery.md docs/superpowers/specs/2026-08-19-deployment-target-preflight-delivery-design.md
    git commit -m "feat: refine deployment target preflight delivery flow"

预期：提交位于 codex/deployment-target-preflight-delivery，不推送 master，除非用户另行要求。
