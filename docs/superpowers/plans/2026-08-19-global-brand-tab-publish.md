# Global Brand And Tab Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved deployment-center brand language, square Logo treatment, and matchstick-style Tabs to both Tab groups, then publish the verified result to GitHub Pages.

**Architecture:** Keep the current native HTML/CSS/JavaScript structure and fixed 720x540 installer canvas. Update static brand strings in `index.html` and the generated checklist title in `app.js`; implement the Logo and shared Tab treatment in `styles.css` without changing state, accessibility attributes, or event handlers. Verify locally, merge the feature branch into `master`, push `origin/master`, and verify the public Pages content.

**Tech Stack:** HTML5, CSS3, native JavaScript, Node.js smoke tests, browser interaction checks, Git, GitHub Pages.

---

### Task 1: Add failing assertions for brand copy, Logo treatment, and both Tab groups

**Files:**
- Modify: `tests/smoke.mjs`
- Test: `tests/smoke.mjs`

- [x] **Step 1: Add exact copy assertions**

Add these checks after the existing static UI assertions:

```js
assert.ok(html.includes('<title>运营管理系统部署</title>'), "Page title must use deployment wording");
assert.ok(html.includes('<strong>部署中心</strong>'), "Sidebar brand must be 部署中心");
assert.ok(html.includes('<small>运营管理系统部署</small>'), "Sidebar subtitle must be 运营管理系统部署");
assert.ok(script.includes("部署中心 - 运营管理系统部署交付清单"), "Generated checklist title must use the deployment-center wording");
```

- [x] **Step 2: Add structure and style assertions**

Add assertions that both Tab groups retain their semantics and the stylesheet defines the approved visual rules:

```js
assert.equal((html.match(/role="tablist"/g) || []).length, 2, "Both Tab groups must remain present");
assert.match(styles, /\.brand-mark\{[^}]*border-radius:8px/);
assert.match(styles, /\.brand-mark::after\{[^}]*display:none/);
assert.match(styles, /\.tabs button\[aria-selected="true"\]::after\{[^}]*background:var\(--orange\)/);
assert.match(styles, /\.tabs button\[aria-selected="true"\]\{[^}]*background:transparent/);
```

- [x] **Step 3: Run the smoke test before implementation**

Run:

```powershell
node tests\smoke.mjs
```

Expected: `FAIL` because the current copy and CSS still use the old brand and filled rectangular Tabs.

### Task 2: Update brand strings and generated checklist title

**Files:**
- Modify: `index.html:7,14`
- Modify: `app.js:135`

- [x] **Step 1: Update document and sidebar brand text**

Change the page metadata and brand block to:

```html
<title>运营管理系统部署</title>
<div class="brand"><span class="brand-mark"><img src="assets/logo.png" alt="部署中心"></span><span><strong>部署中心</strong><small>运营管理系统部署</small></span></div>
```

- [x] **Step 2: Update the generated checklist heading**

In `checklistText()`, replace the first line with:

```js
const lines = ["部署中心 - 运营管理系统部署交付清单", `文件路径：${state.credentials.path}`, ...];
```

Keep all credential fields, masking, copy, and download behavior unchanged.

- [x] **Step 3: Run syntax and smoke tests**

Run:

```powershell
node --check app.js
node tests\smoke.mjs
```

Expected: syntax check succeeds and smoke tests still fail only on the pending CSS assertions.

### Task 3: Implement the square Logo and matchstick Tabs

**Files:**
- Modify: `styles.css:4,6`

- [x] **Step 1: Change the Logo container**

Update the Logo rules so the white background is square with 8px corners and the existing pseudo-element dot is hidden:

```css
.brand-mark{position:relative;width:34px;height:34px;display:grid;place-items:center;background:#fff;border-radius:8px;overflow:hidden}
.brand-mark::after{display:none}
```

Keep the existing image size and orange/blue asset.

- [x] **Step 2: Replace both Tab groups with matchstick styling**

Use transparent buttons with a short orange underline for the selected state:

```css
.tabs button{position:relative;height:38px;padding:0 14px;border:0;border-bottom:2px solid transparent;background:transparent;color:#657a88;font-size:10px;cursor:pointer;white-space:nowrap}
.tabs button[aria-selected="true"]{border-color:transparent;background:transparent;color:var(--orange);font-weight:700}
.tabs button[aria-selected="true"]::after{content:"";position:absolute;left:50%;bottom:-1px;width:26px;height:3px;transform:translateX(-50%);background:var(--orange);border-radius:2px}
.tabs button:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
```

Remove the old first/last button corner-radius rules because the new style has no filled tab body. Keep the shared border line on `.tabs` so both Tab groups retain a stable alignment edge.

- [x] **Step 3: Run static checks**

Run:

```powershell
node --check app.js
node tests\smoke.mjs
git diff --check
```

Expected: all checks pass and smoke tests print `Smoke checks passed.`

### Task 4: Verify visual and interaction behavior at 720x540

**Files:**
- Test: `index.html`, `styles.css`, `app.js` through `http://127.0.0.1:4180/`

- [x] **Step 1: Verify branding and Step 1 Tabs**

At a 720x540 viewport, confirm the sidebar displays `部署中心` and `运营管理系统部署`, the Logo has a square white background with 8px corners and no dot, and the selected `远程 SSH`/`本机部署` Tab has only an orange underline.

- [x] **Step 2: Verify Step 3 Tabs**

Complete the local demo flow to Step 3 and confirm all four delivery Tabs use the same transparent/underline treatment. Click at least one non-default delivery Tab and confirm `aria-selected` and the visible panel still update.

- [x] **Step 3: Verify generated checklist title and fixed canvas**

Trigger copy or download after Step 3 is rendered, inspect the generated text source, and confirm its first line is `部署中心 - 运营管理系统部署交付清单`. Confirm the installer remains 720x540 with no document overflow and no console errors.

### Task 5: Commit, merge, publish, and verify GitHub Pages

**Files:**
- Modify: `docs/superpowers/plans/2026-08-19-global-brand-tab-publish.md`

- [x] **Step 1: Mark completed implementation steps and commit**

```powershell
git add index.html app.js styles.css tests\smoke.mjs docs\superpowers\plans\2026-08-19-global-brand-tab-publish.md
git commit -m "feat: apply deployment center brand styling"
```

- [x] **Step 2: Merge the feature branch into master**

Record the feature branch before switching branches, update `master` without rewriting history, then merge:

```powershell
$featureBranch = "codex/deployment-target-preflight-delivery"
git switch master
git pull --ff-only origin master
git merge --no-ff $featureBranch -m "merge: publish deployment center brand styling"
```

Expected: merge succeeds without conflicts and the worktree is clean.

- [x] **Step 3: Push master to GitHub**

```powershell
git push origin master
```

Expected: `origin/master` advances successfully.

- [x] **Step 4: Verify GitHub Pages**

Open `https://jimzl2016.github.io/qichuang-deployment-center/` and verify the public page contains `部署中心`, `运营管理系统部署`, and the underline Tab CSS, while the old `启创动力` and `运营管理系统安装` labels are absent. Report push success separately from Pages propagation status.
