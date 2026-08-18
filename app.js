(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const state = {
    step: 1, stepTabs: { 1: "ssh", 2: "runtime", 3: "deployment" }, targetMode: "ssh", authMode: "password",
    preflightDone: false, preflightRunning: false, deploying: false, deploymentDone: false,
    deploymentFailed: false, simulateFailure: false, progress: 0, completedAt: null, credentials: null
  };

  const preflightData = {
    docker: "Docker 26.1 正常", arch: "linux / amd64", disk: "可用 186 GB", permission: "部署权限正常"
  };
  const deployTasks = [
    ["获取 Runtime Bundle", "Runtime Bundle 清单验证完成"], ["登录 Harbor", "Harbor 登录成功"],
    ["拉取镜像", "应用与中间件镜像完成"], ["准备运行根", "运行目录与网络已准备"],
    ["启动中间件", "数据服务与文件存储就绪"], ["启动应用", "后台服务与管理前端已启动"],
    ["健康检查", "全部服务健康检查通过"]
  ];

  function updateScale() {
    const scale = Math.min(window.innerWidth / 720, window.innerHeight / 540, 1);
    document.documentElement.style.setProperty("--installer-scale", String(scale));
  }
  function value(id) { return $("#" + id).value.trim(); }
  function setText(id, text) { $("#" + id).textContent = text; }
  function showToast(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("is-visible");
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2100);
  }
  function clearErrors(form) {
    $$("[aria-invalid='true']", form).forEach((el) => el.removeAttribute("aria-invalid"));
    $$(".error", form).forEach((el) => { el.textContent = ""; });
  }
  function setError(id, message) {
    $("#" + id).setAttribute("aria-invalid", "true"); const error = $(`[data-error-for='${id}']`); if (error) error.textContent = message;
  }
  function required(id, label, tab, errors) { if (!value(id)) errors.push({ id, tab, message: `请输入${label}` }); }
  function port(id, label, tab, errors) { const number = Number(value(id)); if (!Number.isInteger(number) || number < 1 || number > 65535) errors.push({ id, tab, message: `${label}应为 1-65535` }); }
  function applyErrors(form, errors, step) {
    clearErrors(form); errors.forEach(({ id, message }) => setError(id, message));
    if (!errors.length) return true;
    if (errors[0].tab) setStepTab(step, errors[0].tab);
    setTimeout(() => $("#" + errors[0].id).focus(), 0); showToast("请完成必填项后继续"); return false;
  }

  function setStepTab(step, tab) {
    state.stepTabs[step] = tab;
    $$(`[data-step-tab^='${step}:']`).forEach((button) => {
      const selected = button.dataset.stepTab === `${step}:${tab}`; button.setAttribute("aria-selected", String(selected));
      const panel = $("#" + button.getAttribute("aria-controls")); if (panel) panel.hidden = !selected;
    });
    if (step === 1) { state.targetMode = tab; $$(".local-only").forEach((el) => { el.hidden = tab !== "local"; }); }
  }
  function renderAuthMode() { $("#password-auth").hidden = state.authMode !== "password"; $("#key-auth").hidden = state.authMode !== "key"; }

  function validateStepOne() {
    const errors = [], form = $("#step1-form"), tab = state.targetMode;
    if (tab === "ssh") {
      required("target-name", "目标名称", tab, errors); required("server-host", "服务器地址", tab, errors); port("ssh-port", "SSH 端口", tab, errors); required("ssh-user", "登录用户", tab, errors);
      if (state.authMode === "password") required("ssh-password", "SSH 密码", tab, errors); else required("key-path", "私钥路径", tab, errors);
    } else {
      required("db-owner", "数据库 Owner", tab, errors); required("og-host", "openGauss 地址", tab, errors); port("og-port", "openGauss 端口", tab, errors); required("ops-user", "运维用户名", tab, errors); required("ops-password", "运维密码", tab, errors);
    }
    return applyErrors(form, errors, 1);
  }
  function validateStepTwo() {
    const errors = [], form = $("#step2-form");
    required("bundle-version", "Runtime Bundle 版本", "runtime", errors); required("generic-user", "云效用户名", "runtime", errors); required("generic-token", "云效密码或令牌", "runtime", errors);
    required("harbor-user", "Harbor 用户名", "harbor", errors); required("harbor-token", "Harbor 密码或令牌", "harbor", errors);
    return applyErrors(form, errors, 2);
  }

  function renderStepper() {
    $$('[data-step-nav]').forEach((button) => {
      const step = Number(button.dataset.stepNav); button.classList.toggle("is-active", step === state.step); button.classList.toggle("is-complete", step < state.step || (step === 3 && state.deploymentDone));
      button.disabled = state.deploymentDone || step > state.step || (step === 2 && !state.preflightDone) || (step === 3 && !state.deploymentDone);
      if (step === state.step) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
  }
  function setStep(step) {
    if (state.deploymentDone && step !== 3) return;
    state.step = step; $$(".screen").forEach((screen) => { const visible = screen.id === `step-${step}`; screen.hidden = !visible; screen.classList.toggle("is-visible", visible); }); renderStepper();
  }
  function setProgress(percent) { state.progress = percent; setText("progress-value", `${percent}%`); $("#progress-bar").style.width = `${percent}%`; }

  function resetPreflight() {
    if (state.preflightRunning) return; state.preflightDone = false; $("#to-step2").disabled = true; setText("preflight-label", "等待环境检查");
    $$(".check").forEach((el) => { el.className = "check"; $("i", el).textContent = "·"; $("small", el).textContent = "待检查"; });
  }
  function toggleStepOneDisabled(disabled) { $$("#step1-form input, [data-step-tab^='1:'], #check-env").forEach((el) => { el.disabled = disabled; }); }
  async function runPreflight() {
    if (!validateStepOne() || state.preflightRunning) return;
    state.preflightRunning = true; toggleStepOneDisabled(true); setText("preflight-label", "正在检查目标环境");
    for (const el of $$(".check")) {
      el.classList.add("is-running"); $("i", el).textContent = "↻"; $("small", el).textContent = "检查中"; await wait(300);
      el.classList.remove("is-running"); el.classList.add("is-pass"); $("i", el).textContent = "✓"; $("small", el).textContent = preflightData[el.dataset.check];
    }
    state.preflightRunning = false; state.preflightDone = true; toggleStepOneDisabled(false); $("#to-step2").disabled = false; setText("preflight-label", "环境检查通过"); renderStepper(); showToast("环境检查通过，可以继续安装");
  }

  function sanitize(text) { return String(text).replace(/[<>&"']/g, (char) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;", "'":"&#039;" })[char]); }
  function log(message, type = "info") {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12:false }); $("#deploy-log").insertAdjacentHTML("beforeend", `<span class="log-${type}">[${time}] ${sanitize(message)}</span>\n`); $("#deploy-log").scrollTop = $("#deploy-log").scrollHeight;
  }
  function toggleStepTwoDisabled(disabled) { $$("#step2-form input, [data-step-tab^='2:']:not([data-step-tab='2:progress']), #back-step1, #start-deploy").forEach((el) => { el.disabled = disabled; }); }
  function resetDeploymentView() { state.deploymentFailed = false; $("#deploy-error").hidden = true; $("#deploy-log").textContent = ""; setText("elapsed", "00:00"); setText("current-task", "准备部署"); setProgress(0); }
  function handleDeploymentFailure() {
    state.deploying = false; state.deploymentFailed = true; setProgress(49); setText("current-task", "部署失败"); log("错误 [DEPLOY-IMG-401]：Harbor 身份认证未通过，镜像拉取已中止", "error"); $("#deploy-error").hidden = false; showToast("部署已中断，请检查 Harbor 认证信息");
  }
  function editCredentials() { toggleStepTwoDisabled(false); $("#deploy-error").hidden = true; setStepTab(2, "harbor"); $("#harbor-user").focus(); showToast("请修改 Harbor 认证信息后重新部署"); }
  async function startDeployment() {
    if (!validateStepTwo() || state.deploying) return;
    state.deploying = true; state.simulateFailure = $("#simulate-failure").checked; toggleStepTwoDisabled(true); resetDeploymentView(); setStepTab(2, "progress");
    const started = Date.now(); const timer = setInterval(() => { const seconds = Math.floor((Date.now() - started) / 1000); setText("elapsed", `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`); }, 250);
    log(`部署会话已建立 · ${state.targetMode === "ssh" ? "远程 Linux" : "本机 Docker"}`); log("敏感凭据仅在内存中使用，不写入日志");
    for (let index = 0; index < deployTasks.length; index += 1) {
      const [task, done] = deployTasks[index]; setText("current-task", task); log(`开始：${task}`); await wait(520);
      if (state.simulateFailure && task === "拉取镜像") { clearInterval(timer); handleDeploymentFailure(); return; }
      log(`完成：${done}`, "success"); setProgress(Math.round(((index + 1) / deployTasks.length) * 100));
    }
    clearInterval(timer); state.deploying = false; state.deploymentDone = true; state.completedAt = new Date(); state.credentials = generateCredentials(); renderHandoff(); setStep(3); showToast("安装完成，交付清单已生成");
  }

  function randomString(length, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#_") { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join(""); }
  function formatDate(date) { return new Intl.DateTimeFormat("zh-CN", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).format(date).replaceAll("/", "-"); }
  function generateCredentials() {
    const host = state.targetMode === "ssh" ? value("server-host") : "127.0.0.1";
    return { groups: [
      { title:"部署信息", fields:[["部署目标", state.targetMode === "ssh" ? `${value("target-name")} (${value("server-host")})` : `本机 Docker / ${value("og-host")}`],["运行根", state.targetMode === "ssh" ? "/opt/qcdl/runtime" : "qcdl-managed-runtime"],["Runtime Bundle", value("bundle-version")],["部署时间", formatDate(state.completedAt)]] },
      { title:"关系数据库 / openGauss", fields:[["访问地址", state.targetMode === "local" ? value("og-host") : host],["端口", state.targetMode === "local" ? value("og-port") : "5432"],["数据库名", "qcdl_platform"],["Owner / 用户名", state.targetMode === "local" ? value("db-owner") : "qcdl_owner"],["密码", randomString(18), true]] },
      { title:"时序数据库 / InfluxDB", fields:[["访问地址", `http://${host}:8086`],["组织", "qichuang"],["存储桶", "digital_twin"],["访问令牌", randomString(32, "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"), true]] },
      { title:"文件存储 / MinIO", fields:[["服务地址", `http://${host}:9000`],["控制台地址", `http://${host}:9001`],["Access Key", `QCDL${randomString(12, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")}`],["Secret Key", randomString(28), true]] },
      { title:"后台系统", fields:[["访问地址", `http://${host}:8080/admin/`],["管理员账号", "admin"],["管理员密码", randomString(16), true]] }
    ] };
  }
  function renderGroup(group) {
    return `<section class="handoff-group"><h3>${sanitize(group.title)}</h3>${group.fields.map(([label, fieldValue, secret], fi) => `<div class="credential-row"><span>${sanitize(label)}</span><code class="credential-value">${secret ? "••••••••••••••••" : sanitize(fieldValue)}</code><div class="row-actions">${secret ? `<button class="tiny-btn" type="button" data-reveal="${group.title}:${fi}">显示</button>` : ""}<button class="tiny-btn" type="button" data-copy="${group.title}:${fi}">复制</button></div></div>`).join("")}</section>`;
  }
  function renderHandoff() {
    setText("complete-time", `完成时间：${formatDate(state.completedAt)}`);
    $("#tab-deployment").innerHTML = renderGroup(state.credentials.groups[0]);
    $("#tab-data").innerHTML = state.credentials.groups.slice(1,3).map(renderGroup).join("");
    $("#tab-services").innerHTML = state.credentials.groups.slice(3,5).map(renderGroup).join("");
  }
  function findCredential(key) {
    const split = key.lastIndexOf(":"); const title = key.slice(0, split), index = Number(key.slice(split + 1)); return state.credentials.groups.find((group) => group.title === title).fields[index];
  }
  function checklistText() {
    const lines = ["启创动力 - 运营管理系统部署交付清单", `生成时间：${formatDate(new Date())}`, "", "注意：本文件包含敏感凭据，请妥善保管。", ""];
    state.credentials.groups.forEach((group) => { lines.push(`【${group.title}】`); group.fields.forEach(([label, fieldValue]) => lines.push(`${label}：${fieldValue}`)); lines.push(""); }); return lines.join("\r\n");
  }
  async function copyText(text, success) { try { await navigator.clipboard.writeText(text); showToast(success); } catch { showToast("复制失败，请检查浏览器权限"); } }
  function downloadChecklist() {
    const date = new Date(), stamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,"0")}${String(date.getDate()).padStart(2,"0")}-${String(date.getHours()).padStart(2,"0")}${String(date.getMinutes()).padStart(2,"0")}`;
    const blob = new Blob(["\ufeff" + checklistText()], { type:"text/plain;charset=utf-8" }), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `启创动力-部署交付清单-${stamp}.txt`; link.hidden = true; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); showToast("交付清单已下载");
  }

  $$('[data-step-tab]').forEach((button) => {
    button.addEventListener("click", () => {
      const [stepValue, tab] = button.dataset.stepTab.split(":"), step = Number(stepValue);
      if (step === 1 && state.stepTabs[1] !== tab) resetPreflight();
      setStepTab(step, tab);
    });
    button.addEventListener("keydown", (event) => { if (!["ArrowLeft","ArrowRight"].includes(event.key)) return; const tabs = $$(`[data-step-tab^='${button.dataset.stepTab.split(":")[0]}:']:not(:disabled)`), index = tabs.indexOf(button), next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]; next.focus(); next.click(); });
  });
  $$('input[name="auth-mode"]').forEach((input) => input.addEventListener("change", () => { state.authMode = input.value; renderAuthMode(); resetPreflight(); }));
  $$("#step1-form input").forEach((input) => input.addEventListener("input", () => { if (state.preflightDone) resetPreflight(); }));
  $$("[data-toggle-password]").forEach((button) => button.addEventListener("click", () => { const input = $("#" + button.dataset.togglePassword), reveal = input.type === "password"; input.type = reveal ? "text" : "password"; button.textContent = reveal ? "隐藏" : "显示"; }));
  $$('[data-step-nav]').forEach((button) => button.addEventListener("click", () => { if (!button.disabled && Number(button.dataset.stepNav) <= state.step) setStep(Number(button.dataset.stepNav)); }));
  $("#check-env").addEventListener("click", runPreflight); $("#to-step2").addEventListener("click", () => setStep(2)); $("#back-step1").addEventListener("click", () => setStep(1)); $("#start-deploy").addEventListener("click", startDeployment);
  $("#edit-credentials").addEventListener("click", editCredentials); $("#retry-deploy").addEventListener("click", startDeployment);
  $$('div[id^="tab-"][id$="deployment"], #tab-data, #tab-services').forEach((panel) => panel.addEventListener("click", (event) => {
    const reveal = event.target.closest("[data-reveal]"), copy = event.target.closest("[data-copy]");
    if (reveal) { const field = findCredential(reveal.dataset.reveal), code = reveal.closest(".credential-row").querySelector("code"), showing = reveal.textContent === "隐藏"; code.textContent = showing ? "••••••••••••••••" : field[1]; reveal.textContent = showing ? "显示" : "隐藏"; }
    if (copy) copyText(findCredential(copy.dataset.copy)[1], "已复制到剪贴板");
  }));
  $("#copy-all").addEventListener("click", () => copyText(checklistText(), "完整交付清单已复制"));
  $("#download-checklist").addEventListener("click", () => $("#download-dialog").showModal()); $("#cancel-download").addEventListener("click", () => $("#download-dialog").close()); $("#confirm-download").addEventListener("click", () => { $("#download-dialog").close(); downloadChecklist(); });
  $("#login-system").addEventListener("click", () => { const group = state.credentials.groups.find((item) => item.title === "后台系统"), url = group.fields.find((item) => item[0] === "访问地址")[1]; try { window.open(new URL(url).href, "_blank", "noopener,noreferrer"); } catch { showToast("后台系统地址无效"); } });

  updateScale(); window.addEventListener("resize", updateScale); renderAuthMode(); renderStepper(); setStepTab(1, "ssh"); setStepTab(2, "runtime"); setStepTab(3, "deployment"); setProgress(0);
})();
