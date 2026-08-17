import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("app.js", root), "utf8");
for (const text of ["部署目标", "远程 SSH", "本机部署", "安装方式与部署", "部署完成", "下载交付清单", "登录系统"]) assert.ok(html.includes(text), `Missing static UI text: ${text}`);
for (const text of ["关系数据库", "时序数据库", "文件存储", "后台系统"]) assert.ok(script.includes(text), `Missing generated handoff section: ${text}`);
for (const file of ["styles.css", "app.js", "assets/logo.png"]) await access(new URL(file, root));
const check = spawnSync(process.execPath, ["--check", fileURLToPath(new URL("app.js", root))], { encoding: "utf8" });
assert.equal(check.status, 0, check.stderr);
console.log("Smoke checks passed.");
