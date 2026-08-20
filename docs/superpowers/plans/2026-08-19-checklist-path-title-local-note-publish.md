# Checklist Path Title, Local Note Removal, And GitHub Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the local Docker hint block, add a compact title above the Step 3 checklist path, and publish the verified prototype to GitHub Pages.

**Architecture:** Keep the existing native HTML/CSS/JavaScript page and fixed 720x540 canvas. Remove the obsolete local hint from `index.html`; convert the existing checklist path strip into a two-line semantic block while preserving the dynamic `#checklist-path` target used by `app.js`. After local and browser verification, merge the feature branch into `master`, push `origin/master`, and verify the public Pages URL.

**Tech Stack:** HTML5, CSS3, native JavaScript, Node.js smoke tests, Git, GitHub Pages.

---

### Task 1: Specify the new path heading and removed local note

**Files:**
- Modify: `tests/smoke.mjs`
- Test: `tests/smoke.mjs`

- [ ] **Step 1: Add static assertions for the approved UI**

Add these assertions after the existing local deployment copy assertion:

```js
assert.ok(html.includes('<b>交付清单文件路径</b>'), "Checklist path must have a visible title");
assert.ok(html.includes('id="checklist-path"'), "Dynamic checklist path target must remain available");
assert.ok(!html.includes('<div class="local-note">'), "Local Docker hint block must be removed");
```

- [ ] **Step 2: Run the smoke test before implementation**

Run:

```powershell
node tests\smoke.mjs
```

Expected: the test fails because `交付清单文件路径` is not yet rendered as a `<b>` title and `.local-note` still exists.

### Task 2: Implement the two focused markup changes

**Files:**
- Modify: `index.html:49-56`
- Modify: `index.html:80-83`

- [ ] **Step 1: Remove the local Docker hint block**

Delete this complete element from the local deployment panel:

```html
<div class="local-note"><b>本机 Docker 部署</b><span>运行根由安装器管理，服务启动后可在 Step 3 查看交付路径。</span></div>
```

Do not add a replacement spacer.

- [ ] **Step 2: Convert the checklist path strip to a two-line block**

Replace the current path-only element with:

```html
<div class="checklist-path">
  <b>交付清单文件路径</b>
  <code id="checklist-path">C:\Users\87188\AppData\Local\Programs\OMS\delivery\deployment-checklist.txt</code>
</div>
```

Keep `id="checklist-path"` on the `<code>` element so `renderHandoff()` continues to update the dynamic path without JavaScript changes.

- [ ] **Step 3: Run syntax and static validation**

Run:

```powershell
node --check app.js
node tests\smoke.mjs
git diff --check
```

Expected: both Node commands exit `0`, the smoke test prints `Smoke checks passed.`, and the diff check produces no errors.

### Task 3: Style the path block inside the fixed canvas

**Files:**
- Modify: `styles.css:12`

- [ ] **Step 1: Replace the path-only strip rule**

Use a 38px two-line block and explicit title/value styles:

```css
.checklist-path{height:38px;padding:6px 10px;background:#edf5fb;border-left:3px solid var(--blue);overflow:hidden}
.checklist-path b{display:block;color:#365c73;font:700 8px/12px var(--sans)}
.checklist-path code{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#557181;font:8px/14px var(--mono)}
```

Reduce the delivery Tab top margin from `8px` to `4px` so the extra title line does not consume space from the handoff content:

```css
.delivery-tabs{margin-top:4px;margin-bottom:8px}
```

- [ ] **Step 2: Run the complete local validation set**

Run:

```powershell
node --check app.js
node tests\smoke.mjs
git diff --check
```

Expected: all checks pass.

### Task 4: Verify the 720x540 interaction and visual result

**Files:**
- Test: `index.html`, `styles.css`, and `app.js` through `http://127.0.0.1:4180/`

- [ ] **Step 1: Verify the local deployment panel**

Open Step 1, select `本机部署`, and confirm:

- The text `本机 Docker 部署` and the old run-root hint are absent.
- No empty bordered or colored block remains below the form.
- The `下一步` button stays visible and enabled.

- [ ] **Step 2: Reach Step 3 through the normal flow**

Click `下一步`, run the environment check, then start the deployment and wait for completion. Confirm the flow reaches Step 3 without console errors.

- [ ] **Step 3: Verify checklist heading and geometry**

At Step 3, confirm:

- `交付清单文件路径` appears on the first line.
- The full path appears on the second line and remains dynamically populated.
- The path block, delivery Tabs, handoff content, and footer all stay inside the fixed installer canvas.
- The document does not gain horizontal or vertical overflow.

Capture a screenshot for visual inspection.

### Task 5: Commit, merge, publish, and verify GitHub Pages

**Files:**
- Modify: `docs/superpowers/plans/2026-08-19-checklist-path-title-local-note-publish.md`

- [ ] **Step 1: Mark completed plan items and commit the implementation**

Run:

```powershell
git add index.html styles.css tests\smoke.mjs docs\superpowers\plans\2026-08-19-checklist-path-title-local-note-publish.md
git commit -m "feat: refine local target and checklist path"
```

- [ ] **Step 2: Merge the feature branch into master**

Record the feature branch name, switch to `master`, update it with a fast-forward-only pull, and merge the feature branch:

```powershell
$featureBranch = git branch --show-current
git switch master
git pull --ff-only origin master
git merge --no-ff $featureBranch -m "merge: publish deployment center refinements"
```

Expected: the merge completes without conflicts and `git status --short` is empty.

- [ ] **Step 3: Push the published branch**

Run:

```powershell
git push origin master
```

Expected: Git reports that `origin/master` advanced to the local merge commit.

- [ ] **Step 4: Verify the public GitHub Pages deployment**

Open:

```text
https://jimzl2016.github.io/qichuang-deployment-center/
```

Allow GitHub Pages propagation time, then verify the live HTML contains `交付清单文件路径`, does not contain the old local note, and serves the latest `index.html` successfully. Report separately whether the push succeeded and whether the live Pages content finished updating.
