import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");
const script = await readFile(new URL("app.js", root), "utf8");

for (const text of [
  "运营管理系统部署", "选择部署目标", "远程 SSH", "本机部署", "环境预检", "部署完成",
  "部署目标", "服务端口", "数据库", "安装目录", "测试连接", "检测环境", "查看错误", "安装部署",
  "部署信息", "数据服务", "文件服务", "后台账号", "复制完整清单", "下载清单", "完成"
]) assert.ok(html.includes(text), `Missing static UI text: ${text}`);
for (const text of ["Docker 守护进程在运行", "宿主 arm64 / Docker arm64", "25.5.0", "v0.29.1-desktop.1", "harbor.stag.qcdl.com.cn", "15 GB", "16.05GB", "8080 Nginx 统一入口", "所需端口无外部进程冲突"]) assert.ok(html.includes(text), `Missing Docker detail: ${text}`);

assert.match(html, /class="installer"[^>]+data-installer-size="720x540"/);
assert.ok(html.includes("/qcdl/jar-project"));
assert.ok(html.includes("C:\\Users\\87188\\AppData\\Local\\Programs\\OMS"));
assert.ok(html.includes("id=\"ssh-db\"") && html.includes("id=\"local-db\""), "Database controls must be selects");
assert.ok(html.indexOf('id="test-connection"') < html.indexOf('<footer class="screen-actions">'), "SSH connection test must follow authentication inside the form");
assert.ok(html.includes('id="to-step2" type="button" disabled>下一步</button>'), "Step 1 primary action must be 下一步");
assert.ok(!html.includes("下一步：环境预检内容"), "Step 1 footer status copy must be removed");
assert.ok(html.includes("Windows/macOS 会通过 Docker Desktop 在本机启动服务与中间件，openGauss 当前操作系统不支持。"), "Local deployment copy must explain openGauss support");
assert.ok(html.includes('<b>交付清单文件路径</b>'), "Checklist path must have a visible title");
assert.ok(html.includes('id="checklist-path"'), "Dynamic checklist path target must remain available");
assert.ok(!html.includes('<div class="local-note">'), "Local Docker hint block must be removed");
assert.ok(html.includes('<title>运营管理系统部署</title>'), "Page title must use deployment wording");
assert.ok(html.includes('<strong>部署中心</strong>'), "Sidebar brand must be 部署中心");
assert.ok(html.includes('<small>运营管理系统部署</small>'), "Sidebar subtitle must be 运营管理系统部署");
assert.ok(!html.includes("启创动力"), "Old brand copy must be removed from the page");
assert.ok(script.includes("部署中心 - 运营管理系统部署交付清单"), "Generated checklist title must use the deployment-center wording");
assert.ok(script.includes("部署中心-运营管理系统部署交付清单"), "Downloaded checklist filename must use the deployment-center wording");
assert.equal((html.match(/role="tablist"/g) || []).length, 2, "Both Tab groups must remain present");
assert.ok(html.includes("openGauss（暂不支持）") && html.includes("<option value=\"opengauss\" disabled>"), "Local openGauss must be disabled");
assert.ok(!html.includes("C1 远程 SSH") && !html.includes("C2 本机部署"), "C1/C2 prefixes should not be displayed");
assert.ok(!html.includes("暗色") && !html.includes("亮色") && !html.includes("跟随系统"), "Theme switcher should not be displayed");
assert.match(styles, /\.installer\{[^}]*width:720px;height:540px/);
assert.match(styles, /grid-template-columns:180px 540px/);
assert.match(styles, /grid-template-rows:84px 394px 62px/);
assert.match(styles, /#preflight-error-detail\{[^}]*overflow:auto/);
assert.match(styles, /\.preflight-grid\{[^}]*grid-template-columns:repeat\(4,1fr\)/, "Preflight cards must use four columns");
assert.match(styles, /\.brand-mark\{[^}]*border-radius:8px/);
assert.match(styles, /\.brand-mark::after\{[^}]*display:none/);
assert.match(styles, /\.tabs button\[aria-selected="true"\]::after\{[^}]*background:var\(--orange\)/);
assert.match(styles, /\.tabs button\[aria-selected="true"\]\{[^}]*background:transparent/);
assert.ok(script.includes("view-docker-details"), "Missing Docker detail interaction");
assert.ok(script.includes('$("#to-step2").disabled = false') && script.includes('$("#to-step2").disabled = true'), "Missing connection-gated environment detection");
assert.ok(script.includes('#step1-form input, #step1-form select'), "Target input and database changes must reset connection state");
assert.ok(html.includes('id="repair-environment"'), "Missing environment repair action");
assert.ok(html.includes('class="error-actions"'), "Repair and error actions must share the error header");
assert.ok(html.includes("环境修复"), "Missing environment repair label");
assert.ok(script.includes("(state.preflightRunning || state.repairing) && step !== state.step"), "Step navigation must reject changes during detection or repair");
assert.ok(script.includes("if (locked) $$('[data-step-nav]')"), "Step navigation must be disabled while preflight controls are locked");

for (const text of ["repairing", "repairEnvironment", "正在分析环境故障", "正在启动 Docker Desktop", "正在等待 Docker 守护进程", "正在校验 Docker 权限"]) {
  assert.ok(script.includes(text), `Missing repair behavior: ${text}`);
}
assert.match(styles, /\.error-actions\{[^}]*display:flex/);
assert.match(styles, /\.repair-btn\{[^}]*background:var\(--orange\)/);

for (const text of ["connectionTested", "preflightFailed", "preflightErrorOpen", "ENV-DOCKER-001", "finish-installation"]) {
  assert.ok(script.includes(text), `Missing deployment behavior: ${text}`);
}
assert.ok(script.includes("state.deploymentDone || step > state.step"), "Missing completed-state step lock");
for (const file of ["styles.css", "app.js", "assets/logo.png"]) await access(new URL(file, root));

const check = spawnSync(process.execPath, ["--check", fileURLToPath(new URL("app.js", root))], { encoding: "utf8" });
assert.equal(check.status, 0, check.stderr);
console.log("Smoke checks passed.");
