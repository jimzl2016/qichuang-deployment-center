(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const state = {
    step: 1, targetMode: "ssh", authMode: "password", preflightDone: false,
    preflightRunning: false, deploying: false, deploymentDone: false, deploymentFailed: false,
    simulateFailure: false,
    progress: 0, completedAt: null, credentials: null
  };

  const preflightData = {
    docker: ["Docker", "Docker Engine 26.1 · 运行正常"],
    arch: ["架构", "linux / amd64 · 兼容"],
    disk: ["磁盘", "可用 186 GB · 满足要求"],
    permission: ["权限", "部署目录与 Docker 权限正常"]
  };

  const deployTasks = [
    ["获取 Runtime Bundle", "已获取并验证 Runtime Bundle 清单"],
    ["登录 Harbor", "Harbor 凭据验证成功，登录态由 Docker 管理"],
    ["拉取镜像", "应用与中间件镜像拉取完成"],
    ["准备运行根", "运行目录、配置与网络已准备"],
    ["启动中间件", "openGauss 连接、时序库与文件存储就绪"],
    ["启动应用", "后台服务与管理前端已启动"],
    ["健康检查", "全部服务健康检查通过"]
  ];

  function value(id) { return $("#" + id).value.trim(); }
  function setText(id, text) { $("#" + id).textContent = text; }
  function showToast(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("is-visible");
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }
  function clearErrors(form) {
    $$("[aria-invalid='true']", form).forEach((el) => el.removeAttribute("aria-invalid"));
    $$(".error", form).forEach((el) => { el.textContent = ""; });
  }
  function setError(id, message) {
    const input = $("#" + id); input.setAttribute("aria-invalid", "true");
    const error = $(`[data-error-for='${id}']`); if (error) error.textContent = message;
  }
  function required(id, label, errors) { if (!value(id)) errors.push([id, `请输入${label}`]); }
  function port(id, label, errors) {
    const number = Number(value(id)); if (!Number.isInteger(number) || number < 1 || number > 65535) errors.push([id, `${label}应为 1-65535 的整数`]);
  }
  function applyErrors(form, errors) {
    clearErrors(form); errors.forEach(([id, message]) => setError(id, message));
    if (errors.length) { $("#" + errors[0][0]).focus(); showToast("请完成必填项后继续"); return false; }
    return true;
  }

  function validateStepOne() {
    const errors = [], form = $("#step1-form");
    if (state.targetMode === "ssh") {
      required("target-name", "目标名称", errors); required("server-host", "服务器地址", errors); port("ssh-port", "SSH 端口", errors); required("ssh-user", "登录用户", errors);
      if (state.authMode === "password") required("ssh-password", "SSH 密码", errors); else required("key-path", "私钥路径", errors);
    } else {
      required("db-owner", "数据库 Owner", errors); required("og-host", "远程 openGauss 地址", errors); port("og-port", "openGauss 端口", errors); required("ops-user", "运维用户名", errors); required("ops-password", "运维密码", errors);
    }
    return applyErrors(form, errors);
  }

  function validateStepTwo() {
    const errors = [], form = $("#step2-form");
    required("bundle-version", "Runtime Bundle 版本", errors); required("generic-user", "云效 Generic 用户名", errors); required("generic-token", "云效 Generic 密码或令牌", errors); required("harbor-user", "Harbor 用户名", errors); required("harbor-token", "Harbor 密码或机器人令牌", errors);
    return applyErrors(form, errors);
  }

  function renderTargetMode() {
    $("#ssh-fields").hidden = state.targetMode !== "ssh"; $("#local-fields").hidden = state.targetMode !== "local";
    $$(".local-only").forEach((el) => { el.hidden = state.targetMode !== "local"; });
    setText("sum-target", state.targetMode === "ssh" ? "远程 SSH" : "本机 Docker"); updateNodeSummary();
  }
  function renderAuthMode() { $("#password-auth").hidden = state.authMode !== "password"; $("#key-auth").hidden = state.authMode !== "key"; }
  function updateNodeSummary() {
    const node = state.targetMode === "ssh" ? (value("target-name") || value("server-host")) : (value("og-host") ? `本机 / ${value("og-host")}` : "本机 Docker Desktop");
    setText("sum-node", node || "尚未配置");
  }
  function setProgress(percent) {
    state.progress = percent; setText("sum-progress", percent + "%"); $("#sum-progress-bar").style.width = percent + "%";
    if ($("#progress-value")) { setText("progress-value", percent + "%"); $("#progress-bar").style.width = percent + "%"; }
  }
  function renderStepper() {
    $$('[data-step-nav]').forEach((button) => {
      const step = Number(button.dataset.stepNav); button.classList.toggle("is-active", step === state.step); button.classList.toggle("is-complete", step < state.step || (step === 3 && state.deploymentDone));
      button.disabled = step > state.step || (step === 2 && !state.preflightDone) || (step === 3 && !state.deploymentDone);
      if (step === state.step) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
  }
  function setStep(step) {
    state.step = step;
    $$(".step-view").forEach((view) => { const visible = view.id === `step-${step}`; view.hidden = !visible; view.classList.toggle("is-visible", visible); });
    const phases = ["", "连接配置", "安装与部署", "部署完成"]; setText("sum-phase", phases[step]);
    renderStepper(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetPreflight() {
    if (state.preflightRunning) return; state.preflightDone = false; $("#to-step2").disabled = true; setText("preflight-label", "等待连接"); setProgress(0);
    $$(".check").forEach((el) => { el.className = "check"; $(".check-icon", el).textContent = "·"; $("small", el).textContent = `等待检查${preflightData[el.dataset.check][0]}`; $("em", el).textContent = "待检查"; });
  }

  async function runPreflight() {
    if (!validateStepOne() || state.preflightRunning) return;
    state.preflightRunning = true; toggleStepOneDisabled(true); setText("preflight-label", "检查进行中");
    const checks = $$(".check");
    for (let index = 0; index < checks.length; index += 1) {
      const el = checks[index], info = preflightData[el.dataset.check]; el.classList.add("is-running"); $(".check-icon", el).textContent = "↻"; $("em", el).textContent = "检查中";
      await wait(420); el.classList.remove("is-running"); el.classList.add("is-pass"); $(".check-icon", el).textContent = "✓"; $("small", el).textContent = info[1]; $("em", el).textContent = "通过"; setProgress(6 + (index + 1) * 3);
    }
    state.preflightRunning = false; state.preflightDone = true; toggleStepOneDisabled(false); $("#to-step2").disabled = false; setText("preflight-label", "4 / 4 通过"); showToast("环境预检通过，可以继续部署"); renderStepper();
  }
  function toggleStepOneDisabled(disabled) {
    $$("#step1-form input, .segment input, #check-env").forEach((el) => { el.disabled = disabled; });
  }

  function sanitize(text) { return String(text).replace(/[<>&"']/g, (char) => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#039;"})[char]); }
  function log(message, type = "info") {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    $("#deploy-log").insertAdjacentHTML("beforeend", `<span class="log-${type}">[${time}] ${sanitize(message)}</span>\n`); $("#deploy-log").scrollTop = $("#deploy-log").scrollHeight;
  }
  function toggleStepTwoDisabled(disabled) { $$("#step2-form input, #simulate-failure, #back-step1, #start-deploy").forEach((el) => { el.disabled = disabled; }); }
  function resetDeploymentView() {
    state.deploymentFailed = false; $("#deploy-error").hidden = true; $("#deploy-console").classList.remove("is-failed");
    $("#deploy-log").textContent = ""; setText("elapsed", "00:00"); setText("current-task", "准备部署"); setProgress(20); setText("sum-phase", "安装与部署");
  }
  function handleDeploymentFailure() {
    state.deploying = false; state.deploymentFailed = true; setProgress(49); setText("current-task", "部署失败"); setText("sum-phase", "部署失败");
    log("错误 [DEPLOY-IMG-401]：Harbor 身份认证未通过，镜像拉取已中止", "error");
    $("#deploy-console").classList.add("is-failed"); $("#deploy-error").hidden = false; showToast("部署已中断，请检查 Harbor 认证信息");
  }
  function editCredentials() {
    toggleStepTwoDisabled(false); $("#deploy-error").hidden = true; $("#deploy-console").classList.remove("is-failed"); setText("sum-phase", "等待重试");
    $("#harbor-user").focus(); showToast("请修改 Harbor 认证信息后重新部署");
  }
  async function startDeployment() {
    if (!validateStepTwo() || state.deploying) return;
    state.deploying = true; state.simulateFailure = $("#simulate-failure").checked; $("#deploy-console").hidden = false; toggleStepTwoDisabled(true); resetDeploymentView(); setText("sum-version", value("bundle-version"));
    const started = Date.now(); const timer = setInterval(() => { const sec = Math.floor((Date.now() - started) / 1000); setText("elapsed", `${String(Math.floor(sec / 60)).padStart(2,"0")}:${String(sec % 60).padStart(2,"0")}`); }, 250);
    log(`部署会话已建立 · ${state.targetMode === "ssh" ? "远程 Linux" : "本机 Docker Desktop"}`); log("敏感凭据已载入内存，不写入部署日志");
    for (let index = 0; index < deployTasks.length; index += 1) {
      const [task, done] = deployTasks[index]; setText("current-task", task); log(`开始：${task}`); await wait(650);
      if (state.simulateFailure && task === "拉取镜像") { clearInterval(timer); handleDeploymentFailure(); return; }
      log(`完成：${done}`, "success"); setProgress(20 + Math.round(((index + 1) / deployTasks.length) * 80));
    }
    clearInterval(timer); state.deploying = false; state.deploymentDone = true; state.completedAt = new Date(); state.credentials = generateCredentials(); renderHandoff(); setStep(3); showToast("部署完成，交付清单已生成");
  }

  function randomString(length, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#_") {
    const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
  }
  function generateCredentials() {
    const host = state.targetMode === "ssh" ? value("server-host") : "127.0.0.1";
    return {
      groups: [
        { title: "关系数据库 / openGauss", fields: [["访问地址", state.targetMode === "local" ? value("og-host") : host],["端口", state.targetMode === "local" ? value("og-port") : "5432"],["数据库名", "qcdl_platform"],["Owner / 用户名", state.targetMode === "local" ? value("db-owner") : "qcdl_owner"],["密码", randomString(18), true]] },
        { title: "时序数据库 / InfluxDB", fields: [["访问地址", `http://${host}:8086`],["组织", "qichuang"],["存储桶", "digital_twin"],["访问令牌", randomString(32, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"), true]] },
        { title: "文件存储 / MinIO", fields: [["服务地址", `http://${host}:9000`],["控制台地址", `http://${host}:9001`],["Access Key", `QCDL${randomString(12, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")}`],["Secret Key", randomString(28), true]] },
        { title: "后台系统", fields: [["访问地址", `http://${host}:8080/admin/`],["管理员账号", "admin"],["管理员密码", randomString(16), true]] },
        { title: "部署信息", fields: [["部署目标", state.targetMode === "ssh" ? `${value("target-name")} (${value("server-host")})` : `本机 Docker / ${value("og-host")}`],["运行根", state.targetMode === "ssh" ? "/opt/qcdl/runtime" : "qcdl-managed-runtime"],["Runtime Bundle", value("bundle-version")],["部署时间", formatDate(state.completedAt)]] }
      ]
    };
  }
  function formatDate(date) { return new Intl.DateTimeFormat("zh-CN", { year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false }).format(date).replaceAll("/", "-"); }
  function renderHandoff() {
    setText("complete-time", formatDate(state.completedAt));
    $("#handoff-sections").innerHTML = state.credentials.groups.map((group, gi) => `<section class="handoff-group"><h3>${sanitize(group.title)}</h3>${group.fields.map(([label, fieldValue, secret], fi) => `<div class="credential-row"><span>${sanitize(label)}</span><code class="credential-value" data-raw="${sanitize(fieldValue)}" data-secret="${secret ? "true" : "false"}">${secret ? "••••••••••••••••" : sanitize(fieldValue)}</code><div class="row-actions">${secret ? `<button class="tiny-btn" type="button" data-reveal="${gi}-${fi}">显示</button>` : ""}<button class="tiny-btn" type="button" data-copy="${gi}-${fi}">复制</button></div></div>`).join("")}</section>`).join("");
  }
  function checklistText() {
    const lines = ["启创动力 - 部署交付清单", `生成时间：${formatDate(new Date())}`, "", "注意：本文件包含敏感凭据，请妥善保管。", ""];
    state.credentials.groups.forEach((group) => { lines.push(`【${group.title}】`); group.fields.forEach(([label, fieldValue]) => lines.push(`${label}：${fieldValue}`)); lines.push(""); }); return lines.join("\r\n");
  }
  async function copyText(text, success) { try { await navigator.clipboard.writeText(text); showToast(success); } catch { showToast("复制失败，请检查浏览器权限"); } }
  function downloadChecklist() {
    const date = new Date(), stamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}-${String(date.getHours()).padStart(2,"0")}${String(date.getMinutes()).padStart(2,"0")}`;
    const blob = new Blob(["\ufeff" + checklistText()], { type: "text/plain;charset=utf-8" }), url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `启创动力-部署交付清单-${stamp}.txt`; link.hidden = true; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); showToast("交付清单已下载");
  }

  $$('input[name="target-mode"]').forEach((input) => input.addEventListener("change", () => { state.targetMode = input.value; renderTargetMode(); resetPreflight(); clearErrors($("#step1-form")); }));
  $$('input[name="auth-mode"]').forEach((input) => input.addEventListener("change", () => { state.authMode = input.value; renderAuthMode(); resetPreflight(); clearErrors($("#step1-form")); }));
  $$("#step1-form input").forEach((input) => input.addEventListener("input", () => { updateNodeSummary(); if (state.preflightDone) resetPreflight(); }));
  $$("[data-toggle-password]").forEach((button) => button.addEventListener("click", () => { const input = $("#" + button.dataset.togglePassword), reveal = input.type === "password"; input.type = reveal ? "text" : "password"; button.textContent = reveal ? "隐藏" : "显示"; button.setAttribute("aria-label", reveal ? "隐藏密码" : "显示密码"); }));
  $("#check-env").addEventListener("click", runPreflight); $("#to-step2").addEventListener("click", () => setStep(2)); $("#back-step1").addEventListener("click", () => setStep(1)); $("#start-deploy").addEventListener("click", startDeployment);
  $("#edit-credentials").addEventListener("click", editCredentials); $("#retry-deploy").addEventListener("click", startDeployment);
  $$('[data-step-nav]').forEach((button) => button.addEventListener("click", () => { if (!button.disabled && Number(button.dataset.stepNav) <= state.step) setStep(Number(button.dataset.stepNav)); }));
  $("#handoff-sections").addEventListener("click", (event) => {
    const reveal = event.target.closest("[data-reveal]"), copy = event.target.closest("[data-copy]");
    if (reveal) { const [gi, fi] = reveal.dataset.reveal.split("-").map(Number), code = reveal.closest(".credential-row").querySelector("code"), showing = reveal.textContent === "隐藏"; code.textContent = showing ? "••••••••••••••••" : state.credentials.groups[gi].fields[fi][1]; reveal.textContent = showing ? "显示" : "隐藏"; }
    if (copy) { const [gi, fi] = copy.dataset.copy.split("-").map(Number); copyText(state.credentials.groups[gi].fields[fi][1], "已复制到剪贴板"); }
  });
  $("#copy-all").addEventListener("click", () => copyText(checklistText(), "完整交付清单已复制"));
  $("#download-checklist").addEventListener("click", () => $("#download-dialog").showModal()); $("#cancel-download").addEventListener("click", () => $("#download-dialog").close()); $("#confirm-download").addEventListener("click", () => { $("#download-dialog").close(); downloadChecklist(); });
  $("#login-system").addEventListener("click", () => { const group = state.credentials.groups.find((item) => item.title === "后台系统"), url = group.fields.find((item) => item[0] === "访问地址")[1]; try { const parsed = new URL(url); window.open(parsed.href, "_blank", "noopener,noreferrer"); } catch { showToast("后台系统地址无效"); } });

  renderTargetMode(); renderAuthMode(); renderStepper(); setProgress(0);
})();
