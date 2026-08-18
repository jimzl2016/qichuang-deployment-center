import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");
const script = await readFile(new URL("app.js", root), "utf8");

for (const text of [
  "运营管理系统安装",
  "部署目标",
  "安装与部署",
  "完成安装",
  "远程 SSH",
  "本机部署",
  "运行材料",
  "镜像仓库",
  "部署进度",
  "部署信息",
  "数据服务",
  "文件与后台",
  "下载交付清单",
  "登录系统"
]) assert.ok(html.includes(text), `Missing static UI text: ${text}`);

assert.match(html, /class="installer"[^>]+data-installer-size="720x540"/);
assert.ok(!html.includes("暗色") && !html.includes("亮色") && !html.includes("跟随系统"), "Theme switcher should not be displayed");
assert.match(styles, /\.installer\{[^}]*width:720px;height:540px/);
assert.match(styles, /grid-template-columns:180px 540px/);
assert.match(styles, /grid-template-rows:84px 394px 62px/);

for (const text of ["关系数据库", "时序数据库", "文件存储", "后台系统", "DEPLOY-IMG-401"]) {
  assert.ok(script.includes(text), `Missing deployment behavior: ${text}`);
}
assert.ok(script.includes("state.deploymentDone || step > state.step"), "Missing completed-state step lock");
assert.ok(script.includes("if (step === 1 && state.stepTabs[1] !== tab) resetPreflight()"), "Target tab changes must reset preflight");
for (const file of ["styles.css", "app.js", "assets/logo.png"]) await access(new URL(file, root));

const check = spawnSync(process.execPath, ["--check", fileURLToPath(new URL("app.js", root))], { encoding: "utf8" });
assert.equal(check.status, 0, check.stderr);
console.log("Smoke checks passed.");
