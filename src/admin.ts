import type { ResolvedConfig } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Admin console SPA at /admin */
export function adminHtml(cfg: ResolvedConfig): string {
  const title = esc((cfg.pageTitle || "我们的小本本") + " · 管理");
  const nameA = esc(cfg.personA || "小A");
  const nameB = esc(cfg.personB || "小B");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${title}</title>
<style>
  :root {
    --bg: #0f1218;
    --panel: #171c25;
    --ink: #e8edf5;
    --muted: #8b95a8;
    --line: #2a3344;
    --accent: #6ea8fe;
    --danger: #ff7b72;
    --ok: #3fb950;
    --a: #79c0ff;
    --b: #d2a8ff;
    --radius: 12px;
    --ui: "SF Pro Text", "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(900px 500px at 10% -10%, #1b2740 0%, transparent 55%), var(--bg);
    color: var(--ink);
    font-family: var(--ui);
  }
  button, input, textarea { font: inherit; color: inherit; }
  button { cursor: pointer; border: none; background: none; }
  .hidden { display: none !important; }
  a { color: var(--accent); }

  #login {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .card {
    width: min(420px, 100%);
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 28px;
  }
  h1 { margin: 0 0 6px; font-size: 22px; }
  .sub { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
  label {
    display: block;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 6px;
    letter-spacing: 0.04em;
  }
  input, textarea {
    width: 100%;
    background: #0d1118;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 11px 12px;
    outline: none;
  }
  input:focus, textarea:focus { border-color: var(--accent); }
  .field { margin-bottom: 14px; }
  .primary {
    width: 100%;
    background: var(--accent);
    color: #0b1220;
    font-weight: 700;
    border-radius: 10px;
    padding: 12px;
    margin-top: 4px;
  }
  .error { color: var(--danger); font-size: 13px; min-height: 1.2em; margin-top: 8px; }
  .ok { color: var(--ok); font-size: 13px; }

  #app { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--line);
    background: rgba(23,28,37,0.9);
    position: sticky;
    top: 0;
    z-index: 5;
  }
  header h1 { font-size: 16px; margin: 0; flex: 1; }
  .ghost {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 13px;
    background: transparent;
    color: var(--ink);
  }
  .ghost:hover { border-color: var(--accent); }
  .danger { color: var(--danger); border-color: #5a2a2a; }

  .layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: 0;
  }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }
  aside {
    border-right: 1px solid var(--line);
    padding: 14px;
    overflow: auto;
  }
  main { padding: 16px 18px 40px; overflow: auto; min-width: 0; }
  h2 { margin: 0 0 12px; font-size: 15px; color: var(--muted); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  .panel {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 16px;
  }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .actions .primary { width: auto; padding: 9px 14px; }

  .page-list { list-style: none; margin: 0; padding: 0; }
  .page-list li button {
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
    margin-bottom: 6px;
  }
  .page-list li button:hover { background: #121722; }
  .page-list li button.active {
    border-color: var(--line);
    background: #121722;
  }
  .page-list .t { font-weight: 600; font-size: 14px; }
  .page-list .d { color: var(--muted); font-size: 12px; margin-top: 2px; }

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
</style>
</head>
<body>
  <div id="login">
    <div class="card">
      <h1>管理后台</h1>
      <div class="sub">查看 / 修改日记，更新共享 PIN 与双方姓名。</div>
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
      <h1>管理 · ${title.replace(/ · 管理$/, "")}</h1>
      <a class="ghost" href="/" style="text-decoration:none">日记本</a>
      <button type="button" class="ghost" id="logout-btn">退出</button>
    </header>
    <div class="layout">
      <aside>
        <h2>日记页</h2>
        <ul class="page-list" id="page-list"></ul>
      </aside>
      <main>
        <div class="panel">
          <h2>空间设置</h2>
          <div class="row">
            <div class="field">
              <label>共同 PIN</label>
              <input id="set-pin" type="text" autocomplete="off" />
            </div>
            <div class="field">
              <label>页面标题</label>
              <input id="set-title" type="text" />
            </div>
            <div class="field">
              <label>身份 A 姓名</label>
              <input id="set-a" type="text" value="${nameA}" />
            </div>
            <div class="field">
              <label>身份 B 姓名</label>
              <input id="set-b" type="text" value="${nameB}" />
            </div>
          </div>
          <div class="actions">
            <button type="button" class="primary" id="save-settings">保存设置</button>
            <span class="status" id="settings-status"></span>
          </div>
        </div>

        <div class="panel" id="page-panel">
          <h2>编辑日记页</h2>
          <div id="page-empty" class="status">从左侧选择一页进行查看与修改。</div>
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
    pages: [],
    currentId: null,
    page: null,
    names: { A: ${JSON.stringify(cfg.personA || "小A")}, B: ${JSON.stringify(cfg.personB || "小B")} },
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
        applySettings(me.settings);
        await enterApp();
        return;
      }
    } catch {}
    $("login").classList.remove("hidden");
  }

  async function enterApp() {
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");
    await loadSettings();
    await refreshPages();
  }

  function applySettings(s) {
    if (!s) return;
    $("set-pin").value = s.pin || "";
    $("set-title").value = s.pageTitle || "";
    $("set-a").value = s.personA || "";
    $("set-b").value = s.personB || "";
    state.names.A = s.personA || state.names.A;
    state.names.B = s.personB || state.names.B;
    $("lab-a").textContent = state.names.A;
    $("lab-b").textContent = state.names.B;
  }

  async function loadSettings() {
    const s = await api("/api/admin/settings");
    applySettings(s);
  }

  $("save-settings").addEventListener("click", async () => {
    const status = $("settings-status");
    status.textContent = "保存中…";
    status.className = "status";
    try {
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          pin: $("set-pin").value,
          pageTitle: $("set-title").value,
          personA: $("set-a").value,
          personB: $("set-b").value,
        }),
      });
      applySettings(data.settings);
      status.textContent = "已保存";
      status.className = "status ok";
    } catch (e) {
      status.textContent = e.message || "保存失败";
      status.className = "status error";
    }
  });

  async function refreshPages() {
    const data = await api("/api/admin/pages");
    state.pages = data.pages || [];
    renderList();
    if (state.currentId) {
      const still = state.pages.some((p) => p.id === state.currentId);
      if (still) await openPage(state.currentId);
      else clearEditor();
    }
  }

  function renderList() {
    const ul = $("page-list");
    ul.innerHTML = "";
    if (!state.pages.length) {
      ul.innerHTML = '<li class="status">暂无日记页</li>';
      return;
    }
    for (const p of state.pages) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = p.id === state.currentId ? "active" : "";
      btn.innerHTML = '<div class="t"></div><div class="d"></div>';
      btn.querySelector(".t").textContent = p.title || p.date;
      btn.querySelector(".d").textContent = p.date + " · " + fmt(p.updatedAt);
      btn.addEventListener("click", () => openPage(p.id));
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  function clearEditor() {
    state.currentId = null;
    state.page = null;
    $("page-empty").classList.remove("hidden");
    $("page-editor").classList.add("hidden");
  }

  async function openPage(id) {
    const data = await api("/api/admin/pages/" + encodeURIComponent(id));
    state.currentId = id;
    state.page = data.page;
    $("page-empty").classList.add("hidden");
    $("page-editor").classList.remove("hidden");
    $("pg-title").value = state.page.title || "";
    $("pg-date").value = state.page.date || "";
    $("pg-a").value = (state.page.entries && state.page.entries.A && state.page.entries.A.body) || "";
    $("pg-b").value = (state.page.entries && state.page.entries.B && state.page.entries.B.body) || "";
    $("page-status").textContent = "";
    renderAnns();
    renderList();
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
      return '<div class="ann-item"><strong>' + escapeHtml(who) +
        '</strong> 批 ' + escapeHtml(tgt) +
        ' · 「' + escapeHtml(a.quote || "") + '」<br/>' +
        escapeHtml(a.content || "") +
        '<div style="margin-top:4px;opacity:.7">' + escapeHtml(fmt(a.createdAt)) +
        '</div></div>';
    }).join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  $("save-page").addEventListener("click", async () => {
    if (!state.page) return;
    const status = $("page-status");
    status.textContent = "保存中…";
    status.className = "status";
    try {
      const data = await api("/api/admin/pages/" + encodeURIComponent(state.page.id), {
        method: "PUT",
        body: JSON.stringify({
          title: $("pg-title").value,
          date: $("pg-date").value,
          entries: {
            A: { body: $("pg-a").value },
            B: { body: $("pg-b").value },
          },
        }),
      });
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
    if (!state.page) return;
    if (!confirm("确定删除这一页？不可恢复。")) return;
    try {
      await api("/api/admin/pages/" + encodeURIComponent(state.page.id), { method: "DELETE" });
      clearEditor();
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
