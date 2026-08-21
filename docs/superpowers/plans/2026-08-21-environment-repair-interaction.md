# Environment Repair Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-panel environment repair action that simulates Docker recovery, automatically reruns the preflight, preserves the failure-demo state, and keeps the 720x540 installer stable.

**Architecture:** Extend the existing single-page `state` with a `repairing` flag and add a focused `repairEnvironment()` asynchronous workflow. Reuse `runPreflight()` for automatic rechecking so detection cards, failure codes, and installation gating remain in one path. Keep repair progress inside the existing error panel and lock conflicting controls while repair or detection is running.

**Tech Stack:** HTML5, CSS3, native JavaScript, Node.js smoke tests, browser interaction checks, Git, GitHub Pages.

---

### Task 1: Specify the environment repair UI and state contract

**Files:**
- Modify: `tests/smoke.mjs`
- Test: `tests/smoke.mjs`

- [ ] **Step 1: Add static UI assertions**

Add these assertions after the existing preflight assertions:

```js
assert.ok(html.includes('id="repair-environment"'), "Missing environment repair action");
assert.ok(html.includes('class="error-actions"'), "Repair and error actions must share the error header");
assert.ok(html.includes("环境修复"), "Missing environment repair label");
```

- [ ] **Step 2: Add behavior and style assertions**

```js
for (const text of ["repairing", "repairEnvironment", "正在分析环境故障", "正在启动 Docker Desktop", "正在等待 Docker 守护进程", "正在校验 Docker 权限"]) {
  assert.ok(script.includes(text), `Missing repair behavior: ${text}`);
}
assert.match(styles, /\.error-actions\{[^}]*display:flex/);
assert.match(styles, /\.repair-btn\{[^}]*background:var\(--orange\)/);
```

- [ ] **Step 3: Run the smoke test before implementation**

Run:

```powershell
node tests\smoke.mjs
```

Expected: `FAIL` with `Missing environment repair action`.

### Task 2: Add the repair action to the existing error panel

**Files:**
- Modify: `index.html:71`

- [ ] **Step 1: Replace the error header markup**

Keep the existing title, code, summary, and detail elements, but group two actions in the top-right corner:

```html
<div class="preflight-error" id="preflight-error" role="alert" hidden>
  <div class="error-head">
    <span><b>环境检查失败</b><code id="preflight-error-code">ENV-DOCKER-001</code></span>
    <div class="error-actions">
      <button class="repair-btn" id="repair-environment" type="button">环境修复</button>
      <button class="tiny-btn" id="view-preflight-error" type="button">查看错误</button>
    </div>
  </div>
  <p id="preflight-error-summary">Docker Desktop 未运行，请启动 Docker 后重试。</p>
  <pre id="preflight-error-detail" hidden>检测到 Docker Desktop 未响应。请启动 Docker Desktop，确认当前用户拥有 Docker 权限后重新检测环境。</pre>
</div>
```

- [ ] **Step 2: Run the smoke test**

Run `node tests\smoke.mjs`.

Expected: the UI assertions pass; behavior assertions still fail because `repairEnvironment()` does not exist yet.

### Task 3: Implement the repair state machine and control locking

**Files:**
- Modify: `app.js:3-16,88-117,150`

- [ ] **Step 1: Extend state and define repair stages**

Add `repairing: false` to `state` and define:

```js
const repairStages = [
  "正在分析环境故障",
  "正在启动 Docker Desktop",
  "正在等待 Docker 守护进程",
  "正在校验 Docker 权限"
];
```

- [ ] **Step 2: Add a shared control-lock helper**

```js
function setPreflightControlsLocked(locked) {
  $("#back-step1").disabled = locked;
  $("#run-preflight").disabled = locked;
  $("#simulate-preflight-failure").disabled = locked;
  $("#repair-environment").disabled = locked;
  $("#view-preflight-error").disabled = locked;
}
```

Do not enable `#start-deploy` in this helper; installation remains controlled exclusively by `preflightDone`.

- [ ] **Step 3: Add `repairEnvironment()`**

```js
async function repairEnvironment() {
  if (!state.preflightFailed || state.preflightRunning || state.repairing) return;
  state.repairing = true;
  state.preflightErrorOpen = false;
  $("#preflight-error-detail").hidden = true;
  $("#view-preflight-error").textContent = "查看错误";
  setPreflightControlsLocked(true);
  $("#repair-environment").textContent = "修复中";

  const docker = $('[data-check="docker"]');
  docker.className = "check is-running";
  $("i", docker).textContent = "↻";
  $("small", docker).textContent = "修复中";

  for (const stage of repairStages) {
    setText("preflight-error-summary", stage);
    setText("preflight-label", stage);
    await wait(320);
  }

  state.repairing = false;
  $("#repair-environment").textContent = "环境修复";
  await runPreflight();
}
```

The failure-demo switch remains checked. Therefore `runPreflight()` automatically fails again and restores `ENV-DOCKER-001`.

- [ ] **Step 4: Integrate control locking with detection completion**

At the start of `runPreflight()`, reject repair overlap and use the helper:

```js
if (state.preflightRunning || state.repairing || !state.connectionTested) return;
resetPreflight();
state.preflightRunning = true;
setPreflightControlsLocked(true);
```

After the loop, restore the controls before applying the success/failure result:

```js
state.preflightRunning = false;
setPreflightControlsLocked(false);
```

On failure, explicitly restore the repair button label and failed summary:

```js
$("#repair-environment").textContent = "环境修复";
setText("preflight-error-summary", "Docker Desktop 未运行，请启动 Docker 后重试。");
```

- [ ] **Step 5: Bind the new action**

Add:

```js
$("#repair-environment").addEventListener("click", repairEnvironment);
```

- [ ] **Step 6: Run syntax and smoke checks**

```powershell
node --check app.js
node tests\smoke.mjs
```

Expected: both pass and the smoke test prints `Smoke checks passed.`

### Task 4: Style the compact repair actions without changing panel height

**Files:**
- Modify: `styles.css:11`

- [ ] **Step 1: Add the header action layout and repair button**

```css
.error-actions{display:flex;align-items:center;gap:6px}
.repair-btn{height:24px;padding:0 9px;border:1px solid var(--orange);background:var(--orange);color:#fff;font-size:7px;font-weight:700;cursor:pointer}
.repair-btn:disabled{border-color:#d4dde2;background:#edf1f3;color:#8a9aa3;cursor:not-allowed}
```

Keep `.preflight-error` at its current `102px` height and keep the error detail scrollable.

- [ ] **Step 2: Add disabled feedback for the text action**

```css
.tiny-btn:disabled{color:#9eacb5;cursor:not-allowed}
```

- [ ] **Step 3: Run static validation**

```powershell
node --check app.js
node tests\smoke.mjs
git diff --check
```

Expected: all checks pass.

### Task 5: Verify failure, repair, repeated failure, and recovery at 720x540

**Files:**
- Test: `index.html`, `app.js`, `styles.css` through the local preview

- [ ] **Step 1: Enter the failure state**

Choose `本机部署`, enter Step 2, enable `显示环境报错情况`, and click `检测环境`. Confirm Docker fails with `ENV-DOCKER-001`, while `环境修复` and `查看错误` are both visible in the error header.

- [ ] **Step 2: Verify the repair sequence**

Click `环境修复` and confirm:

- The label changes to `修复中`.
- Back, detection, installation, failure switch, repair, and detail actions are disabled.
- The four repair summaries appear in order.
- Docker shows a running repair state and the error panel stays within 102px.

- [ ] **Step 3: Verify automatic repeated failure**

After repair completes, confirm automatic preflight runs, the failure switch remains checked, and `ENV-DOCKER-001` is displayed again. Confirm `环境修复`, `查看错误`, `上一步`, and `检测环境` are usable again while `安装部署` remains disabled.

- [ ] **Step 4: Verify manual recovery**

Turn off `显示环境报错情况`, click `检测环境`, and confirm all four checks pass and `安装部署` becomes enabled.

- [ ] **Step 5: Verify fixed-canvas geometry**

Confirm the error panel bottom remains inside the Step 2 body, all footer controls remain visible, and the 720x540 installer has no internal overlap or document overflow. Capture failure and repair screenshots.

### Task 6: Commit, merge, publish, and verify GitHub Pages

**Files:**
- Modify: `docs/superpowers/plans/2026-08-21-environment-repair-interaction.md`

- [ ] **Step 1: Mark completed steps and commit implementation**

```powershell
git add index.html app.js styles.css tests\smoke.mjs docs\superpowers\plans\2026-08-21-environment-repair-interaction.md
git commit -m "feat: add environment repair interaction"
```

- [ ] **Step 2: Merge into master**

```powershell
git switch master
git pull --ff-only origin master
git merge --no-ff codex/environment-repair-interaction -m "merge: publish environment repair interaction"
```

- [ ] **Step 3: Push master**

```powershell
git push origin master
```

- [ ] **Step 4: Verify public Pages content**

Open `https://jimzl2016.github.io/qichuang-deployment-center/` with a cache-busting query and confirm the live HTML contains `repair-environment` and `环境修复`. Report push success separately from Pages propagation status.
