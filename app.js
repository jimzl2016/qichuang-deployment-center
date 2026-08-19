(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const state = {
    step: 1, stepTabs: { 1: "ssh", 3: "deployment" }, targetMode: "ssh", authMode: "password",
    connectionTested: false, connectionFailed: false, preflightDone: false, preflightFailed: false,
    preflightErrorOpen: false, preflightRunning: false, deploying: false, deploymentDone: false,
    deploymentFailed: false, completedAt: null, credentials: null
  };
  const preflightData = {
    docker: "守护进程运行", arch: "arm64 / arm64", disk: "可用内存 15 GB", permission: "端口与权限正常"
  };
  const preflightErrorCode = "ENV-DOCKER-001";
  const deployTasks = ["准备运行材料", "创建服务网络", "启动数据服务", "启动文件服务", "启动后台系统", "健康检查"];

  function updateScale() {
    const scale = Math.min(window.innerWidth / 720, window.innerHeight / 540, 1);
    document.documentElement.style.setProperty("--installer-scale", String(scale));
  }
  function value(id) { const element = $("#" + id); return element ? element.value.trim() : ""; }
  function setText(id, text) { const element = $("#" + id); if (element) element.textContent = text; }
  function showToast(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("is-visible");
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }
  function clearErrors(form) {
    $$('[aria-invalid="true"]', form).forEach((element) => element.removeAttribute("aria-invalid"));
    $$(".error", form).forEach((element) => { element.textContent = ""; });
  }
  function setError(id, message) {
    const input = $("#" + id); if (!input) return;
    input.setAttribute("aria-invalid", "true"); const error = $(`[data-error-for="${id}"]`); if (error) error.textContent = message;
  }
  function required(id, label, errors) { if (!value(id)) errors.push({ id, message: `请输入${label}` }); }
  function port(id, label, errors) {
    const number = Number(value(id)); if (!Number.isInteger(number) || number < 1 || number > 65535) errors.push({ id, message: `${label}应为 1-65535` });
  }
  function applyErrors(form, errors) {
    clearErrors(form); errors.forEach(({ id, message }) => setError(id, message));
    if (!errors.length) return true;
    setTimeout(() => $("#" + errors[0].id)?.focus(), 0); showToast("请完成必填项后继续"); return false;
  }
  function setStepTab(step, tab) {
    state.stepTabs[step] = tab;
    $$(`[data-step-tab^="${step}:"]`).forEach((button) => {
      const selected = button.dataset.stepTab === `${step}:${tab}`;
      button.setAttribute("aria-selected", String(selected));
      const panel = $("#" + button.getAttribute("aria-controls")); if (panel) panel.hidden = !selected;
    });
    if (step === 1) {
      state.targetMode = tab;
      $("#test-connection").hidden = tab !== "ssh";
      $("#view-connection-error-footer").hidden = tab !== "ssh" || !state.connectionFailed;
      $("#to-step2").hidden = tab !== "local";
      if (tab === "local") setText("target-status", "本机部署配置就绪");
    }
  }
  function resetTargetState() {
    state.connectionTested = false; state.connectionFailed = false; state.preflightDone = false; state.preflightFailed = false; state.preflightErrorOpen = false;
    $("#connection-error").hidden = true; $("#view-connection-error-footer").hidden = true; $("#to-step2").disabled = false;
    resetPreflight(); renderStepper();
  }
  function renderAuthMode() { $("#password-auth").hidden = state.authMode !== "password"; $("#key-auth").hidden = state.authMode !== "key"; }
  function validateTarget() {
    const errors = [], form = $("#step1-form");
    if (state.targetMode === "ssh") {
      required("target-name", "部署目标", errors); port("server-port", "服务端口", errors); required("server-host", "服务器地址", errors); port("ssh-port", "SSH 端口", errors); required("ssh-user", "登录用户", errors);
      if (state.authMode === "password") required("ssh-password", "SSH 密码", errors); else required("key-path", "私钥路径", errors);
    } else { required("install-dir", "安装目录", errors); port("local-server-port", "服务端口", errors); }
    return applyErrors(form, errors);
  }
  function renderStepper() {
    $$('[data-step-nav]').forEach((button) => {
      const step = Number(button.dataset.stepNav);
      button.classList.toggle("is-active", step === state.step);
      button.classList.toggle("is-complete", step < state.step || (step === 3 && state.deploymentDone));
      button.disabled = state.deploymentDone || step > state.step || (step === 2 && !state.connectionTested) || (step === 3 && !state.deploymentDone);
      if (step === state.step) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
  }
  function setStep(step) {
    if (state.deploymentDone && step !== 3) return;
    state.step = step; $$(".screen").forEach((screen) => { const visible = screen.id === `step-${step}`; screen.hidden = !visible; screen.classList.toggle("is-visible", visible); });
    if (step === 2) { setText("preflight-target-label", state.targetMode === "ssh" ? `远程 SSH：${value("server-host")}` : "本机 Docker 部署"); resetPreflight(); }
    renderStepper();
  }
  function resetPreflight() {
    if (state.preflightRunning) return;
    state.preflightDone = false; state.preflightFailed = false; state.preflightErrorOpen = false;
    $("#start-deploy").disabled = true; $("#preflight-error").hidden = true; $("#preflight-error-detail").hidden = true;
    setText("preflight-label", "等待检测环境");
    $$(".check").forEach((element) => { element.className = "check"; $("i", element).textContent = "·"; $("small", element).textContent = "等待检测"; });
  }
  function toggleTargetDisabled(disabled) { $$("#step1-form input, #step1-form button, [data-step-tab^='1:']").forEach((element) => { element.disabled = disabled; }); }
  async function testConnection() {
    if (!validateTarget() || state.preflightRunning) return;
    toggleTargetDisabled(true); $("#test-connection").disabled = true; setText("target-status", "正在测试连接"); await wait(700); toggleTargetDisabled(false); $("#test-connection").disabled = false;
    const failed = /fail|offline|error/i.test(value("server-host"));
    if (failed) { state.connectionFailed = true; state.connectionTested = false; $("#connection-error").hidden = false; $("#view-connection-error-footer").hidden = false; setText("target-status", "连接失败"); showToast("连接失败，请查看错误详情"); return; }
    state.connectionFailed = false; state.connectionTested = true; setText("target-status", "连接测试通过"); showToast("连接测试通过，可以进行环境预检"); setStep(2);
  }
  function openConnectionError() { $("#connection-error").hidden = false; showToast("请检查服务器地址、端口和认证信息"); }
  async function runPreflight() {
    if (state.preflightRunning || !state.connectionTested) return;
    resetPreflight(); state.preflightRunning = true; state.preflightFailed = false; $("#run-preflight").disabled = true; $("#back-step1").disabled = true; $("#simulate-preflight-failure").disabled = true; setText("preflight-label", "正在检测环境");
    const simulateFailure = $("#simulate-preflight-failure").checked;
    for (const element of $$(".check")) {
      element.classList.add("is-running"); $("i", element).textContent = "↻"; $("small", element).textContent = "检测中"; await wait(260);
      if (simulateFailure && element.dataset.check === "docker") { element.classList.remove("is-running"); element.classList.add("is-fail"); $("i", element).textContent = "!"; $("small", element).textContent = "未运行"; state.preflightFailed = true; break; }
      element.classList.remove("is-running"); element.classList.add("is-pass"); $("i", element).textContent = "✓"; $("small", element).textContent = preflightData[element.dataset.check];
    }
    state.preflightRunning = false; $("#back-step1").disabled = false; $("#simulate-preflight-failure").disabled = false; $("#run-preflight").disabled = false;
    if (state.preflightFailed) { state.preflightDone = false; setText("preflight-error-code", preflightErrorCode); $("#preflight-error").hidden = false; setText("preflight-label", "环境检查失败"); showToast("环境检查失败，请查看错误详情"); return; }
    state.preflightDone = true; $("#start-deploy").disabled = false; setText("preflight-label", "环境检查通过"); showToast("环境检查通过，可以安装部署");
  }
  function togglePreflightError() { state.preflightErrorOpen = !state.preflightErrorOpen; $("#preflight-error-detail").hidden = !state.preflightErrorOpen; $("#view-preflight-error").textContent = state.preflightErrorOpen ? "收起错误" : "查看错误"; }
  function randomString(length, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789") { return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(""); }
  function formatDate(date) { return new Intl.DateTimeFormat("zh-CN", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).format(date).replaceAll("/", "-"); }
  function generateCredentials() {
    const ssh = state.targetMode === "ssh", host = ssh ? value("server-host") : "127.0.0.1", portValue = ssh ? value("server-port") : value("local-server-port"), db = value(ssh ? "ssh-db" : "local-db") || "mysql";
    return { path: "C:\\Users\\87188\\AppData\\Local\\Programs\\OMS\\delivery\\deployment-checklist.txt", groups: [
      { title:"部署信息", fields:[["部署目标", ssh ? value("target-name") : "本机 Docker"],["安装目录", ssh ? "/qcdl/jar-project" : value("install-dir")],["服务端口", portValue],["数据库", db === "mysql" ? "Mysql" : "openGauss"],["完成时间", formatDate(state.completedAt)]] },
      { title:"数据服务", fields:[["关系数据库地址", ssh ? host : "远程 openGauss"],["数据库账号", ssh ? value("ssh-user") : "oms_owner"],["数据库密码", randomString(18), true],["时序数据库", `http://${host}:8086`],["时序访问令牌", randomString(28), true]] },
      { title:"文件服务", fields:[["文件服务地址", `http://${host}:9000`],["控制台地址", `http://${host}:9001`],["Access Key", `OMS${randomString(12, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")}`],["Secret Key", randomString(28), true]] },
      { title:"后台账号", fields:[["访问地址", `http://${host}:${portValue}/admin/`],["管理员账号", "admin"],["管理员密码", randomString(16), true]] }
    ] };
  }
  function renderGroup(group) { return `<section class="handoff-group"><h3>${group.title}</h3>${group.fields.map(([label, fieldValue, secret], index) => `<div class="credential-row"><span>${label}</span><code class="credential-value">${secret ? "••••••••••••••••" : fieldValue}</code><div class="row-actions">${secret ? `<button class="tiny-btn" type="button" data-reveal="${group.title}:${index}">显示</button>` : ""}<button class="tiny-btn" type="button" data-copy="${group.title}:${index}">复制</button></div></div>`).join("")}</section>`; }
  function renderHandoff() {
    $("#checklist-path").textContent = state.credentials.path; setText("complete-time", `完成时间：${formatDate(state.completedAt)}`);
    const [deployment, data, files, admin] = state.credentials.groups; $("#tab-deployment").innerHTML = renderGroup(deployment); $("#tab-data").innerHTML = renderGroup(data); $("#tab-files").innerHTML = renderGroup(files); $("#tab-admin").innerHTML = renderGroup(admin);
  }
  function findCredential(key) { const split = key.lastIndexOf(":"); const title = key.slice(0, split); return state.credentials.groups.find((group) => group.title === title).fields[Number(key.slice(split + 1))]; }
  function checklistText() { const lines = ["启创动力 - 运营管理系统部署交付清单", `文件路径：${state.credentials.path}`, `生成时间：${formatDate(new Date())}`, "", "注意：本文件包含敏感凭据，请妥善保管。", ""]; state.credentials.groups.forEach((group) => { lines.push(`【${group.title}】`); group.fields.forEach(([label, fieldValue]) => lines.push(`${label}：${fieldValue}`)); lines.push(""); }); return lines.join("\r\n"); }
  async function copyText(text, success) { try { await navigator.clipboard.writeText(text); showToast(success); } catch { showToast("复制失败，请检查浏览器权限"); } }
  function downloadChecklist() { const date = new Date(), stamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}-${String(date.getHours()).padStart(2,"0")}${String(date.getMinutes()).padStart(2,"0")}`; const blob = new Blob(["\ufeff" + checklistText()], { type:"text/plain;charset=utf-8" }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `启创动力-部署交付清单-${stamp}.txt`; link.hidden = true; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); showToast("交付清单已下载"); }
  async function startDeployment() {
    if (!state.preflightDone || state.deploying) return; state.deploying = true; $("#start-deploy").disabled = true; $("#run-preflight").disabled = true; setText("preflight-label", "正在安装部署");
    for (const task of deployTasks) { setText("preflight-label", task); await wait(260); }
    state.deploying = false; state.deploymentDone = true; state.completedAt = new Date(); state.credentials = generateCredentials(); renderHandoff(); setStep(3); showToast("部署完成，交付清单已生成");
  }

  $$('[data-step-tab]').forEach((button) => button.addEventListener("click", () => { const [step, tab] = button.dataset.stepTab.split(":"); if (Number(step) === 1 && state.stepTabs[1] !== tab) resetTargetState(); setStepTab(Number(step), tab); }));
  $$('input[name="auth-mode"]').forEach((input) => input.addEventListener("change", () => { state.authMode = input.value; renderAuthMode(); resetTargetState(); }));
  $$("#step1-form input").forEach((input) => input.addEventListener("input", () => { if (state.connectionTested || state.connectionFailed) resetTargetState(); }));
  $$('[data-toggle-password]').forEach((button) => button.addEventListener("click", () => { const input = $("#" + button.dataset.togglePassword), reveal = input.type === "password"; input.type = reveal ? "text" : "password"; button.textContent = reveal ? "隐藏" : "显示"; }));
  $$('[data-step-nav]').forEach((button) => button.addEventListener("click", () => { if (!button.disabled) setStep(Number(button.dataset.stepNav)); }));
  $("#test-connection").addEventListener("click", testConnection); $("#to-step2").addEventListener("click", () => { if (validateTarget()) { state.connectionTested = true; setStep(2); } }); $("#view-connection-error").addEventListener("click", openConnectionError); $("#view-connection-error-footer").addEventListener("click", openConnectionError);
  $("#back-step1").addEventListener("click", () => setStep(1)); $("#run-preflight").addEventListener("click", runPreflight); $("#view-preflight-error").addEventListener("click", togglePreflightError); $("#start-deploy").addEventListener("click", startDeployment);
  $("#view-docker-details").addEventListener("click", () => $("#docker-details-dialog").showModal()); $("#close-docker-details").addEventListener("click", () => $("#docker-details-dialog").close());
  $$("#tab-deployment, #tab-data, #tab-files, #tab-admin").forEach((panel) => panel.addEventListener("click", (event) => { const reveal = event.target.closest("[data-reveal]"), copy = event.target.closest("[data-copy]"); if (reveal) { const field = findCredential(reveal.dataset.reveal), code = reveal.closest(".credential-row").querySelector("code"), showing = reveal.textContent === "隐藏"; code.textContent = showing ? "••••••••••••••••" : field[1]; reveal.textContent = showing ? "显示" : "隐藏"; } if (copy) copyText(findCredential(copy.dataset.copy)[1], "已复制到剪贴板"); }));
  $("#copy-all").addEventListener("click", () => copyText(checklistText(), "完整交付清单已复制")); $("#download-checklist").addEventListener("click", () => $("#download-dialog").showModal()); $("#cancel-download").addEventListener("click", () => $("#download-dialog").close()); $("#confirm-download").addEventListener("click", () => { $("#download-dialog").close(); downloadChecklist(); }); $("#finish-installation").addEventListener("click", () => showToast("安装已完成，可以关闭安装器"));
  updateScale(); window.addEventListener("resize", updateScale); renderAuthMode(); renderStepper(); setStepTab(1, "ssh"); setStepTab(3, "deployment");
})();
