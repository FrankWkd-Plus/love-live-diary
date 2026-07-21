import type { ResolvedConfig } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Admin console SPA at /admin — multi-session management. */
export function adminHtml(cfg: ResolvedConfig): string {
  const title = esc((cfg.pageTitle || "我们的小本本") + " · 管理");
  const nameA = esc(cfg.personA || "小A");
  const nameB = esc(cfg.personB || "小B");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0f1218" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%93%3C/text%3E%3C/svg%3E" />
<link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%93%3C/text%3E%3C/svg%3E" />
<title>${title}</title>
<style>
  :root {
    --bg: #0c1017;
    --panel: #151b26;
    --ink: #e8edf5;
    --muted: #8b95a8;
    --line: #2a3344;
    --accent: #6ea8fe;
    --danger: #ff7b72;
    --ok: #3fb950;
    --a: #79c0ff;
    --b: #d2a8ff;
    --radius: 14px;
    --shadow: 0 16px 40px rgba(0,0,0,0.28);
    --ui: "SF Pro Text", "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(900px 520px at 8% -12%, #1e2d4d 0%, transparent 55%),
      radial-gradient(700px 400px at 100% 0%, #2a1f3d 0%, transparent 45%),
      var(--bg);
    color: var(--ink);
    font-family: var(--ui);
    -webkit-font-smoothing: antialiased;
  }
  button, input, textarea { font: inherit; color: inherit; }
  button { cursor: pointer; border: none; background: none; }
  .hidden { display: none !important; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  #login {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .card {
    width: min(420px, 100%);
    background: rgba(21,27,38,0.92);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 30px;
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: linear-gradient(90deg, var(--a), var(--accent), var(--b));
  }
  h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: 0.01em; }
  .sub { color: var(--muted); font-size: 13px; margin-bottom: 20px; line-height: 1.5; }
  label {
    display: block;
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 6px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
  }
  input, textarea {
    width: 100%;
    background: #0d1118;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 12px 13px;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  input:focus, textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(110,168,254,0.15);
  }
  .field { margin-bottom: 14px; }
  .primary {
    width: 100%;
    background: linear-gradient(180deg, #82b6ff, var(--accent));
    color: #0b1220;
    font-weight: 700;
    border-radius: 12px;
    padding: 12px;
    margin-top: 4px;
    transition: opacity .15s, transform .1s;
  }
  .primary:hover { opacity: 0.95; }
  .primary:active { transform: scale(0.99); }
  .error { color: var(--danger); font-size: 13px; min-height: 1.2em; margin-top: 8px; }
  .ok { color: var(--ok); font-size: 13px; }

  #app { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--line);
    background: rgba(21,27,38,0.88);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  header h1 { font-size: 16px; margin: 0; flex: 1; }
  header h1::before { content: "📓 "; }
  .ghost {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 7px 12px;
    font-size: 13px;
    background: transparent;
    color: var(--ink);
    transition: border-color .15s, background .15s;
  }
  .ghost:hover { border-color: var(--accent); background: rgba(110,168,254,0.08); }
  .danger { color: var(--danger); border-color: #5a2a2a; }
  .danger:hover { background: rgba(255,123,114,0.08); border-color: #7a3530; }

  .layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    min-height: 0;
  }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }
  aside {
    border-right: 1px solid var(--line);
    padding: 14px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  main { padding: 16px 18px 40px; overflow: auto; min-width: 0; }
  h2 {
    margin: 0 0 12px;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .panel {
    background: rgba(21,27,38,0.92);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 18px;
    margin-bottom: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
  .actions .primary { width: auto; padding: 9px 14px; }

  .session-list, .page-list { list-style: none; margin: 0; padding: 0; }
  .session-list li button, .page-list li button {
    width: 100%;
    text-align: left;
    padding: 11px 12px;
    border-radius: 12px;
    border: 1px solid transparent;
    margin-bottom: 6px;
    transition: background .15s, border-color .15s, transform .1s;
  }
  .session-list li button:hover, .page-list li button:hover {
    background: #121722;
    border-color: rgba(42,51,68,0.8);
  }
  .session-list li button.active, .page-list li button.active {
    border-color: rgba(110,168,254,0.35);
    background: linear-gradient(180deg, #172033, #121722);
    box-shadow: 0 0 0 1px rgba(110,168,254,0.08);
  }
  .t { font-weight: 600; font-size: 14px; }
  .d { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .pin-mask { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.04em; }

  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 800px) { .cols { grid-template-columns: 1fr; } }
  .col-label { font-size: 13px; margin-bottom: 6px; font-weight: 600; }
  .col-label.a { color: var(--a); }
  .col-label.b { color: var(--b); }
  textarea.body {
    min-height: 220px;
    resize: vertical;
    line-height: 1.6;
  }
  .ann-box {
    margin-top: 12px;
    max-height: 200px;
    overflow: auto;
    font-size: 13px;
    color: var(--muted);
  }
  .ann-item {
    border-left: 3px solid var(--line);
    padding: 6px 10px;
    margin-bottom: 8px;
    background: #0d1118;
    border-radius: 0 8px 8px 0;
  }
  .status { font-size: 13px; color: var(--muted); min-height: 1.2em; }
  .badge {
    display: inline-block;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #1b2433;
    color: var(--muted);
    border: 1px solid var(--line);
  }
  .side-actions { display: flex; gap: 8px; }
  .side-actions .primary { width: auto; padding: 8px 12px; font-size: 13px; }
</style>
</head>
<body>
  <div id="login">
    <div class="card">
      <h1>管理后台</h1>
      <div class="sub">管理多组会话：各自 PIN、姓名与日记页完全隔离。</div>
      <div class="field">
        <label>管理员密码</label>
        <input id="admin-pass" type="password" autocomplete="current-password" placeholder="Admin password" />
      </div>
      <button class="primary" id="login-btn" type="button">进入后台</button>
      <p class="error" id="login-error"></p>
      <p class="sub" style="margin:14px 0 0"><a href="/">← 返回日记本</a></p>
    </div>
  </div>

  <div id="app" class="hidden">
    <header>
      <h1>管理 · 会话</h1>
      <a class="ghost" href="/" style="text-decoration:none">日记本</a>
      <button type="button" class="ghost" id="logout-btn">退出</button>
    </header>
    <div class="layout">
      <aside>
        <div>
          <h2>会话</h2>
          <div class="side-actions" style="margin-bottom:10px">
            <button type="button" class="primary" id="new-session-btn">+ 新建会话</button>
          </div>
          <ul class="session-list" id="session-list"></ul>
        </div>
        <div>
          <h2>日记页 <span class="badge" id="session-badge">未选择</span></h2>
          <ul class="page-list" id="page-list"></ul>
        </div>
      </aside>
      <main>
        <div class="panel" id="session-form-panel">
          <h2 id="session-form-title">新建会话</h2>
          <div class="row">
            <div class="field">
              <label>会话名称</label>
              <input id="ses-name" type="text" placeholder="例如：小明 &amp; 小红" />
            </div>
            <div class="field">
              <label>共享 PIN（全局唯一）</label>
              <input id="ses-pin" type="text" autocomplete="off" placeholder="至少 4 位" />
            </div>
            <div class="field">
              <label>身份 A 姓名</label>
              <input id="ses-a" type="text" value="${nameA}" />
            </div>
            <div class="field">
              <label>身份 B 姓名</label>
              <input id="ses-b" type="text" value="${nameB}" />
            </div>
            <div class="field" style="grid-column: 1 / -1">
              <label>页面标题</label>
              <input id="ses-title" type="text" placeholder="我们的小本本" />
            </div>
          </div>
          <div class="actions">
            <button type="button" class="primary" id="save-session">创建会话</button>
            <button type="button" class="ghost danger hidden" id="delete-session">删除会话</button>
            <button type="button" class="ghost hidden" id="cancel-edit">取消编辑</button>
            <span class="status" id="session-status"></span>
          </div>
        </div>

        <div class="panel" id="page-panel">
          <h2>编辑日记页</h2>
          <div id="page-empty" class="status">先选择左侧会话，再选择日记页进行查看与修改。</div>
          <div id="page-editor" class="hidden">
            <div class="row">
              <div class="field">
                <label>标题</label>
                <input id="pg-title" type="text" />
              </div>
              <div class="field">
                <label>日期</label>
                <input id="pg-date" type="date" />
              </div>
            </div>
            <div class="cols">
              <div>
                <div class="col-label a" id="lab-a">${nameA}</div>
                <textarea class="body" id="pg-a"></textarea>
              </div>
              <div>
                <div class="col-label b" id="lab-b">${nameB}</div>
                <textarea class="body" id="pg-b"></textarea>
              </div>
            </div>
            <div class="ann-box" id="ann-box"></div>
            <div class="actions">
              <button type="button" class="primary" id="save-page">保存日记页</button>
              <button type="button" class="ghost danger" id="delete-page">删除此页</button>
              <span class="status" id="page-status"></span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>

<script>
(() => {
  const state = {
    sessions: [],
    currentSessionId: null,
    editingSessionId: null, // null = create mode
    pages: [],
    currentPageId: null,
    page: null,
    names: { A: ${JSON.stringify(cfg.personA || "小A")}, B: ${JSON.stringify(cfg.personB || "小B")} },
    showPins: {},
  };

  const $ = (id) => document.getElementById(id);

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
    if (!res.ok) throw new Error((data && data.error) || res.statusText || "请求失败");
    return data;
  }

  function fmt(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("zh-CN", { hour12: false }); }
    catch { return iso; }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  $("login-btn").addEventListener("click", doLogin);
  $("admin-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
  $("logout-btn").addEventListener("click", async () => {
    try { await api("/api/admin/logout", { method: "POST", body: "{}" }); } catch {}
    location.reload();
  });

  async function doLogin() {
    $("login-error").textContent = "";
    const password = $("admin-pass").value;
    if (!password) { $("login-error").textContent = "请输入密码"; return; }
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      await enterApp();
    } catch (e) {
      $("login-error").textContent = e.message || "登录失败";
    }
  }

  async function bootstrap() {
    try {
      const me = await api("/api/admin/me");
      if (me.authenticated) {
        await enterApp();
        return;
      }
    } catch {}
    $("login").classList.remove("hidden");
  }

  async function enterApp() {
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");
    resetSessionForm();
    await refreshSessions();
  }

  function currentSession() {
    return state.sessions.find((s) => s.id === state.currentSessionId) || null;
  }

  function resetSessionForm() {
    state.editingSessionId = null;
    $("session-form-title").textContent = "新建会话";
    $("ses-name").value = "";
    $("ses-pin").value = "";
    $("ses-a").value = ${JSON.stringify(cfg.personA || "小A")};
    $("ses-b").value = ${JSON.stringify(cfg.personB || "小B")};
    $("ses-title").value = ${JSON.stringify(cfg.pageTitle || "我们的小本本")};
    $("save-session").textContent = "创建会话";
    $("delete-session").classList.add("hidden");
    $("cancel-edit").classList.add("hidden");
    $("session-status").textContent = "";
    $("session-status").className = "status";
  }

  function fillSessionForm(s) {
    state.editingSessionId = s.id;
    $("session-form-title").textContent = "编辑会话";
    $("ses-name").value = s.name || "";
    $("ses-pin").value = s.pin || "";
    $("ses-a").value = s.personA || "";
    $("ses-b").value = s.personB || "";
    $("ses-title").value = s.pageTitle || "";
    $("save-session").textContent = "保存会话";
    $("delete-session").classList.remove("hidden");
    $("cancel-edit").classList.remove("hidden");
    $("session-status").textContent = "";
    $("session-status").className = "status";
  }

  $("new-session-btn").addEventListener("click", () => {
    resetSessionForm();
    $("ses-name").focus();
  });
  $("cancel-edit").addEventListener("click", () => resetSessionForm());

  async function refreshSessions() {
    const data = await api("/api/admin/sessions");
    state.sessions = data.sessions || [];
    renderSessionList();
    if (state.currentSessionId) {
      const still = state.sessions.some((s) => s.id === state.currentSessionId);
      if (still) {
        applySessionLabels(currentSession());
        await refreshPages();
      } else {
        state.currentSessionId = null;
        clearPageEditor();
        state.pages = [];
        renderPageList();
        $("session-badge").textContent = "未选择";
      }
    }
  }

  function renderSessionList() {
    const ul = $("session-list");
    ul.innerHTML = "";
    if (!state.sessions.length) {
      ul.innerHTML = '<li class="status">暂无会话，请先创建</li>';
      return;
    }
    for (const s of state.sessions) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = s.id === state.currentSessionId ? "active" : "";
      const show = !!state.showPins[s.id];
      const pinText = show ? (s.pin || "") : "••••";
      btn.innerHTML =
        '<div class="t"></div>' +
        '<div class="d"></div>' +
        '<div class="d pin-mask"></div>';
      btn.querySelector(".t").textContent = s.name || s.id;
      btn.querySelectorAll(".d")[0].textContent =
        (s.personA || "A") + " / " + (s.personB || "B") + " · " + fmt(s.updatedAt);
      const pinEl = btn.querySelectorAll(".d")[1];
      pinEl.textContent = "PIN " + pinText + "  (点此切换显示)";
      pinEl.addEventListener("click", (e) => {
        e.stopPropagation();
        state.showPins[s.id] = !state.showPins[s.id];
        renderSessionList();
      });
      btn.addEventListener("click", () => selectSession(s.id));
      btn.addEventListener("dblclick", () => {
        selectSession(s.id);
        fillSessionForm(s);
      });
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  function applySessionLabels(s) {
    if (!s) return;
    state.names.A = s.personA || state.names.A;
    state.names.B = s.personB || state.names.B;
    $("lab-a").textContent = state.names.A;
    $("lab-b").textContent = state.names.B;
    $("session-badge").textContent = s.name || s.id;
  }

  async function selectSession(id) {
    state.currentSessionId = id;
    const s = currentSession();
    applySessionLabels(s);
    renderSessionList();
    clearPageEditor();
    await refreshPages();
  }

  $("save-session").addEventListener("click", async () => {
    const status = $("session-status");
    status.textContent = "保存中…";
    status.className = "status";
    const payload = {
      name: $("ses-name").value,
      pin: $("ses-pin").value,
      personA: $("ses-a").value,
      personB: $("ses-b").value,
      pageTitle: $("ses-title").value,
    };
    try {
      let data;
      if (state.editingSessionId) {
        data = await api(
          "/api/admin/sessions/" + encodeURIComponent(state.editingSessionId),
          { method: "PUT", body: JSON.stringify(payload) },
        );
      } else {
        data = await api("/api/admin/sessions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      status.textContent = "已保存";
      status.className = "status ok";
      await refreshSessions();
      if (data.session) {
        await selectSession(data.session.id);
        fillSessionForm(data.session);
      }
    } catch (e) {
      status.textContent = e.message || "保存失败";
      status.className = "status error";
    }
  });

  $("delete-session").addEventListener("click", async () => {
    if (!state.editingSessionId) return;
    const s = state.sessions.find((x) => x.id === state.editingSessionId);
    const label = (s && s.name) || state.editingSessionId;
    if (!confirm("确定删除会话「" + label + "」？将清除该会话全部日记，不可恢复。")) return;
    try {
      await api(
        "/api/admin/sessions/" + encodeURIComponent(state.editingSessionId),
        { method: "DELETE" },
      );
      if (state.currentSessionId === state.editingSessionId) {
        state.currentSessionId = null;
        clearPageEditor();
        state.pages = [];
        renderPageList();
        $("session-badge").textContent = "未选择";
      }
      resetSessionForm();
      await refreshSessions();
    } catch (e) {
      alert(e.message || "删除失败");
    }
  });

  async function refreshPages() {
    if (!state.currentSessionId) {
      state.pages = [];
      renderPageList();
      return;
    }
    const data = await api(
      "/api/admin/sessions/" + encodeURIComponent(state.currentSessionId) + "/pages",
    );
    state.pages = data.pages || [];
    if (data.session) applySessionLabels(data.session);
    renderPageList();
    if (state.currentPageId) {
      const still = state.pages.some((p) => p.id === state.currentPageId);
      if (still) await openPage(state.currentPageId);
      else clearPageEditor();
    }
  }

  function renderPageList() {
    const ul = $("page-list");
    ul.innerHTML = "";
    if (!state.currentSessionId) {
      ul.innerHTML = '<li class="status">请先选择会话</li>';
      return;
    }
    if (!state.pages.length) {
      ul.innerHTML = '<li class="status">此会话暂无日记页</li>';
      return;
    }
    for (const p of state.pages) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = p.id === state.currentPageId ? "active" : "";
      btn.innerHTML = '<div class="t"></div><div class="d"></div>';
      btn.querySelector(".t").textContent = p.title || p.date;
      btn.querySelector(".d").textContent = p.date + " · " + fmt(p.updatedAt);
      btn.addEventListener("click", () => openPage(p.id));
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  function clearPageEditor() {
    state.currentPageId = null;
    state.page = null;
    $("page-empty").classList.remove("hidden");
    $("page-editor").classList.add("hidden");
  }

  async function openPage(id) {
    if (!state.currentSessionId) return;
    const data = await api(
      "/api/admin/sessions/" +
        encodeURIComponent(state.currentSessionId) +
        "/pages/" +
        encodeURIComponent(id),
    );
    state.currentPageId = id;
    state.page = data.page;
    $("page-empty").classList.add("hidden");
    $("page-editor").classList.remove("hidden");
    $("pg-title").value = state.page.title || "";
    $("pg-date").value = state.page.date || "";
    $("pg-a").value =
      (state.page.entries && state.page.entries.A && state.page.entries.A.body) || "";
    $("pg-b").value =
      (state.page.entries && state.page.entries.B && state.page.entries.B.body) || "";
    $("page-status").textContent = "";
    renderAnns();
    renderPageList();
  }

  function renderAnns() {
    const box = $("ann-box");
    const anns = (state.page && state.page.annotations) || [];
    if (!anns.length) {
      box.innerHTML = "<div>本页暂无批注</div>";
      return;
    }
    box.innerHTML = anns.map((a) => {
      const who = a.author === "B" ? state.names.B : state.names.A;
      const tgt = a.target === "B" ? state.names.B : state.names.A;
      return (
        '<div class="ann-item"><strong>' +
        escapeHtml(who) +
        "</strong> 批 " +
        escapeHtml(tgt) +
        " · 「" +
        escapeHtml(a.quote || "") +
        "」<br/>" +
        escapeHtml(a.content || "") +
        '<div style="margin-top:4px;opacity:.7">' +
        escapeHtml(fmt(a.createdAt)) +
        "</div></div>"
      );
    }).join("");
  }

  $("save-page").addEventListener("click", async () => {
    if (!state.page || !state.currentSessionId) return;
    const status = $("page-status");
    status.textContent = "保存中…";
    status.className = "status";
    try {
      const data = await api(
        "/api/admin/sessions/" +
          encodeURIComponent(state.currentSessionId) +
          "/pages/" +
          encodeURIComponent(state.page.id),
        {
          method: "PUT",
          body: JSON.stringify({
            title: $("pg-title").value,
            date: $("pg-date").value,
            entries: {
              A: { body: $("pg-a").value },
              B: { body: $("pg-b").value },
            },
          }),
        },
      );
      state.page = data.page;
      status.textContent = "已保存 " + fmt(state.page.updatedAt);
      status.className = "status ok";
      await refreshPages();
    } catch (e) {
      status.textContent = e.message || "保存失败";
      status.className = "status error";
    }
  });

  $("delete-page").addEventListener("click", async () => {
    if (!state.page || !state.currentSessionId) return;
    if (!confirm("确定删除这一页？不可恢复。")) return;
    try {
      await api(
        "/api/admin/sessions/" +
          encodeURIComponent(state.currentSessionId) +
          "/pages/" +
          encodeURIComponent(state.page.id),
        { method: "DELETE" },
      );
      clearPageEditor();
      await refreshPages();
    } catch (e) {
      alert(e.message || "删除失败");
    }
  });

  bootstrap();
})();
</script>
</body>
</html>`;
}
