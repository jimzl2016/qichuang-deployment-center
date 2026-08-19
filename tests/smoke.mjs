import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");
const script = await readFile(new URL("app.js", root), "utf8");

for (const text of [
  "运营管理系统安装", "选择部署目标", "远程 SSH", "本机部署", "环境预检", "部署完成",
  "部署目标", "服务端口", "数据库", "安装目录", "测试连接", "检测环境", "查看错误", "安装部署",
  "部署信息", "数据服务", "文件服务", "后台账号", "复制完整清单", "下载清单", "完成"
]) assert.ok(html.includes(text), `Missing static UI text: ${text}`);

assert.match(html, /class="installer"[^>]+data-installer-size="720x540"/);
assert.ok(html.includes("/qcdl/jar-project"));
assert.ok(html.includes("C:\\Users\\87188\\AppData\\Local\\Programs\\OMS"));
assert.ok(html.includes("id=\"ssh-db\"") && html.includes("id=\"local-db\""), "Database controls must be selects");
assert.ok(html.includes("openGauss（暂不支持）") && html.includes("<option value=\"opengauss\" disabled>"), "Local openGauss must be disabled");
assert.ok(!html.includes("C1 远程 SSH") && !html.includes("C2 本机部署"), "C1/C2 prefixes should not be displayed");
assert.ok(!html.includes("暗色") && !html.includes("亮色") && !html.includes("跟随系统"), "Theme switcher should not be displayed");
assert.match(styles, /\.installer\{[^}]*width:720px;height:540px/);
assert.match(styles, /grid-template-columns:180px 540px/);
assert.match(styles, /grid-template-rows:84px 394px 62px/);

for (const text of ["connectionTested", "preflightFailed", "preflightErrorOpen", "ENV-DOCKER-001", "finish-installation"]) {
  assert.ok(script.includes(text), `Missing deployment behavior: ${text}`);
}
assert.ok(script.includes("state.deploymentDone || step > state.step"), "Missing completed-state step lock");
for (const file of ["styles.css", "app.js", "assets/logo.png"]) await access(new URL(file, root));

const check = spawnSync(process.execPath, ["--check", fileURLToPath(new URL("app.js", root))], { encoding: "utf8" });
assert.equal(check.status, 0, check.stderr);
console.log("Smoke checks passed.");
