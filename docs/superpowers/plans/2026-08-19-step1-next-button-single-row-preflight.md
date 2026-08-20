# Step 1 Next Button And Single-Row Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the 720x540 deployment installer so Step 1 uses a clean `下一步` action and Step 2 presents Docker availability, architecture, disk, and permission checks in one row.

**Architecture:** Keep the existing single-page state model and fixed 180px/540px installer canvas. Step 1 keeps connection gating in `app.js`, but removes the footer status text from the DOM and changes the shared primary button label to `下一步`. Step 2 keeps the existing four `.check` status cards and changes only their grid track layout, preserving the current status and error behavior.

**Tech Stack:** Native HTML, CSS, JavaScript, Node.js smoke test, browser interaction checks at 720x540.

---

### Task 1: Add failing static assertions for the approved copy and layout

**Files:**
- Modify: `tests/smoke.mjs`
- Test: `tests/smoke.mjs`

- [x] **Step 1: Replace the old Step 1 footer assertion**

Update the static assertions so the page must contain exactly the new primary action and local deployment copy:

```js
assert.ok(html.includes('id="to-step2" type="button" disabled>下一步</button>'), "Step 1 primary action must be 下一步");
assert.ok(!html.includes("下一步：环境预检内容"), "Step 1 footer status copy must be removed");
assert.ok(html.includes("Windows/macOS 会通过 Docker Desktop 在本机启动服务与中间件，openGauss 当前操作系统不支持。"), "Local deployment copy must explain openGauss support");
```

Add a CSS assertion for the one-row preflight layout:

```js
assert.match(styles, /\.preflight-grid\{[^}]*grid-template-columns:repeat\(4,1fr\)/, "Preflight cards must use four columns");
```

- [x] **Step 2: Run the smoke test and confirm it fails before implementation**

Run:

```powershell
node tests\smoke.mjs
```

Expected: `FAIL` because the current HTML still contains `下一步：环境预检内容` and the button text is `检测环境`.

- [x] **Step 3: Commit the failing test only**

```powershell
git add tests\smoke.mjs
git commit -m "test: specify next button and single-row preflight"
```

### Task 2: Update Step 1 labels and local deployment description

**Files:**
- Modify: `index.html:42-60`
- Modify: `app.js:52-63`

- [x] **Step 1: Remove the Step 1 footer status element and rename the button**

Change the Step 1 footer to contain only the primary action:

```html
<footer class="screen-actions"><button class="btn primary" id="to-step2" type="button" disabled>下一步</button></footer>
```

Do not add a replacement left-side placeholder; the footer should allow the button to remain aligned to the right through the existing `.screen-actions` rule.

- [x] **Step 2: Replace the local deployment note copy**

Use this exact text in the local tab:

```html
<div class="info-strip">Windows/macOS 会通过 Docker Desktop 在本机启动服务与中间件，openGauss 当前操作系统不支持。</div>
```

Keep the existing `local-note` block and field behavior unchanged.

- [x] **Step 3: Remove JavaScript writes to the deleted footer status**

In `setStepTab()` and `resetTargetState()`, remove calls that write `target-status`. Preserve the connection gating behavior by leaving the `#to-step2.disabled` assignments and `connection-action-status` updates intact:

```js
$("#to-step2").disabled = tab === "ssh" ? !state.connectionTested : false;
setText("connection-action-status", tab === "ssh" ? "需要先测试 SSH 连接" : "本机配置完成后检测环境");
```

and:

```js
$("#connection-error").hidden = true;
$("#to-step2").disabled = state.targetMode === "ssh";
setText("connection-action-status", state.targetMode === "ssh" ? "需要先测试 SSH 连接" : "本机配置完成后检测环境");
```

- [x] **Step 4: Run syntax and smoke checks after the minimal implementation**

Run:

```powershell
node --check app.js
node tests\smoke.mjs
```

Expected: both commands exit with status `0` and the smoke test prints `Smoke checks passed.`

- [x] **Step 5: Commit the Step 1 copy and DOM changes**

```powershell
git add index.html app.js tests\smoke.mjs
git commit -m "fix: simplify step one next action"
```

### Task 3: Put all Step 2 checks on one row without changing status behavior

**Files:**
- Modify: `styles.css:8`
- Modify: `tests/smoke.mjs`

- [x] **Step 1: Change the preflight grid to four equal columns**

Update the existing `.preflight-grid` rule from two columns to one row of four cards:

```css
.preflight-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}
```

Keep `.check` height, status classes (`is-running`, `is-pass`, `is-fail`), and the existing detail dialog unchanged. The cards must remain inside the fixed `.tab-panel` height.

- [x] **Step 2: Run static checks**

Run:

```powershell
node tests\smoke.mjs
git diff --check
```

Expected: both commands pass with no whitespace errors.

- [x] **Step 3: Commit the one-row layout**

```powershell
git add styles.css tests\smoke.mjs
git commit -m "fix: show preflight checks in one row"
```

### Task 4: Verify remote and local interactions at the fixed installer size

**Files:**
- Test: `index.html`, `app.js`, `styles.css` through the local preview at `http://127.0.0.1:4180/`

- [x] **Step 1: Verify initial remote SSH state**

At a 720x540 viewport, confirm:

- Step 1 footer has no left-side status text.
- The only footer action is `下一步` and it is disabled.
- `测试连接` remains directly below the SSH authentication area.
- The document has no horizontal or vertical overflow beyond the fixed installer canvas.

- [x] **Step 2: Verify remote failure and success gating**

Fill the remote fields with valid values and set the server address to `offline`; click `测试连接` and wait for the simulated result. Confirm the error summary is visible, `下一步` remains disabled, and the page stays on Step 1.

Change the server address to `192.168.10.21`; click `测试连接` again. Confirm `下一步` becomes orange with white text, the page remains on Step 1, and clicking `下一步` enters Step 2.

- [x] **Step 3: Verify local deployment path**

Reload, select `本机部署`, confirm the exact updated openGauss support copy is visible, and confirm `下一步` is enabled. Click it and confirm Step 2 is visible.

- [x] **Step 4: Verify one-row preflight geometry**

On Step 2, inspect `.preflight-grid` and confirm the four `.check` cards have the same top coordinate and appear in four columns. Capture a screenshot at 720x540 and verify all four labels are readable and the footer remains visible.

### Task 5: Final validation and handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-08-19-step1-next-button-single-row-preflight.md`

- [x] **Step 1: Run the complete local validation set**

Run:

```powershell
node --check app.js
node tests\smoke.mjs
git diff --check
git status --short
```

Expected: syntax and smoke checks pass, diff check is clean, and only the intended implementation files are changed.

- [x] **Step 2: Mark completed plan steps and commit the final handoff**

Update this plan's checkboxes with the actual results, then commit any remaining plan bookkeeping together with the implementation if needed:

```powershell
git add index.html app.js styles.css tests\smoke.mjs docs\superpowers\plans\2026-08-19-step1-next-button-single-row-preflight.md
git commit -m "feat: refine deployment wizard step actions"
```

The final response must include the local preview URL, the commit hash, the validation commands, and any browser-check limitation if the browser could not be controlled.
