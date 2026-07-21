import type { ResolvedConfig } from "./types";

/** Escape for embedding into an HTML text node / attribute-safe context. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Single-page app shell: PIN login → dual diary notebook with Feishu-like
 * text annotations. All client logic is inline (no build step).
 */
export function appHtml(cfg: ResolvedConfig): string {
  const title = esc(cfg.pageTitle || "我们的小本本");
  const nameA = esc(cfg.personA || "小A");
  const nameB = esc(cfg.personB || "小B");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="light" />
<title>${title}</title>
<style>
  :root {
    --bg: #f6f1ea;
    --bg-elev: #fffdf9;
    --ink: #2a241c;
    --muted: #7a6f62;
    --line: #e6dccf;
    --accent: #c45c4a;
    --accent-soft: #f3d6cf;
    --a: #3d6b8c;
    --a-soft: #d9e7f0;
    --b: #6b5a8c;
    --b-soft: #e5dff0;
    --mark: #ffe08a;
    --mark-active: #ffc94a;
    --shadow: 0 10px 30px rgba(42, 36, 28, 0.08);
    --radius: 16px;
    --font: "Iowan Old Style", "Palatino Linotype", "Songti SC", "Noto Serif SC", Georgia, serif;
    --ui: "SF Pro Text", "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    color: var(--ink);
    background:
      radial-gradient(1200px 600px at 10% -10%, #fff8ef 0%, transparent 60%),
      radial-gradient(900px 500px at 100% 0%, #f0e7ff 0%, transparent 55%),
      var(--bg);
    font-family: var(--ui);
    -webkit-font-smoothing: antialiased;
  }
  button, input, textarea { font: inherit; color: inherit; }
  button {
    cursor: pointer;
    border: none;
    background: none;
  }
  .hidden { display: none !important; }

  /* ---------- Login ---------- */
  #login {
    min-height: 100%;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .login-card {
    width: min(420px, 100%);
    background: var(--bg-elev);
    border: 1px solid var(--line);
    border-radius: 24px;
    box-shadow: var(--shadow);
    padding: 36px 32px 28px;
  }
  .login-card h1 {
    margin: 0 0 6px;
    font-family: var(--font);
    font-weight: 600;
    font-size: 28px;
    letter-spacing: 0.02em;
  }
  .login-card .sub {
    color: var(--muted);
    margin-bottom: 28px;
    font-size: 14px;
  }
  .field { margin-bottom: 18px; }
  .field label {
    display: block;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .field input {
    width: 100%;
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 12px;
    padding: 12px 14px;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .field input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .person-pick {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .person-pick button {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 14px 10px;
    background: #fff;
    transition: all .15s;
  }
  .person-pick button.active-a {
    border-color: var(--a);
    background: var(--a-soft);
    color: var(--a);
    font-weight: 600;
  }
  .person-pick button.active-b {
    border-color: var(--b);
    background: var(--b-soft);
    color: var(--b);
    font-weight: 600;
  }
  .primary {
    width: 100%;
    margin-top: 8px;
    border-radius: 14px;
    padding: 13px 16px;
    background: var(--ink);
    color: #fff;
    font-weight: 600;
    transition: transform .1s, opacity .15s;
  }
  .primary:hover { opacity: 0.92; }
  .primary:active { transform: scale(0.99); }
  .primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .error {
    color: var(--accent);
    font-size: 13px;
    min-height: 1.2em;
    margin: 8px 0 0;
  }

  /* ---------- App shell ---------- */
  #app {
    min-height: 100%;
    display: grid;
    grid-template-columns: 260px 1fr;
  }
  @media (max-width: 860px) {
    #app { grid-template-columns: 1fr; }
    #sidebar { display: none; }
    #sidebar.open {
      display: flex;
      position: fixed;
      inset: 0 auto 0 0;
      width: min(300px, 86vw);
      z-index: 40;
      box-shadow: var(--shadow);
    }
    .backdrop {
      position: fixed; inset: 0; background: rgba(42,36,28,.35); z-index: 30;
    }
  }

  #sidebar {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--line);
    background: rgba(255,253,249,0.85);
    backdrop-filter: blur(10px);
    min-height: 100vh;
  }
  .side-head {
    padding: 20px 18px 12px;
    border-bottom: 1px solid var(--line);
  }
  .side-head h1 {
    margin: 0;
    font-family: var(--font);
    font-size: 20px;
    font-weight: 600;
  }
  .who {
    margin-top: 6px;
    font-size: 12px;
    color: var(--muted);
  }
  .who strong { color: var(--ink); }
  .side-actions {
    display: flex;
    gap: 8px;
    padding: 12px 14px;
  }
  .side-actions button, .icon-btn {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 13px;
  }
  .side-actions .grow { flex: 1; background: var(--ink); color: #fff; border-color: var(--ink); }
  .page-list {
    list-style: none;
    margin: 0;
    padding: 8px;
    overflow: auto;
    flex: 1;
  }
  .page-list li button {
    width: 100%;
    text-align: left;
    border-radius: 12px;
    padding: 12px 12px;
    border: 1px solid transparent;
  }
  .page-list li button:hover { background: rgba(0,0,0,0.03); }
  .page-list li button.active {
    background: #fff;
    border-color: var(--line);
    box-shadow: 0 2px 8px rgba(42,36,28,0.04);
  }
  .page-list .t { font-weight: 600; font-size: 14px; }
  .page-list .d { color: var(--muted); font-size: 12px; margin-top: 2px; }

  #main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--line);
    background: rgba(255,253,249,0.7);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .topbar h2 {
    margin: 0;
    font-family: var(--font);
    font-size: 18px;
    font-weight: 600;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .topbar input.title-edit {
    flex: 1;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 8px 10px;
    background: #fff;
  }
  .ghost {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
  }
  .danger { color: var(--accent); }

  .workspace {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 300px;
    min-height: 0;
  }
  @media (max-width: 1100px) {
    .workspace { grid-template-columns: 1fr; }
    #ann-panel { border-left: none; border-top: 1px solid var(--line); }
  }

  .diaries {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    min-height: 0;
  }
  @media (max-width: 720px) {
    .diaries { grid-template-columns: 1fr; }
  }

  .col {
    display: flex;
    flex-direction: column;
    min-height: 520px;
    border-right: 1px solid var(--line);
    background: var(--bg-elev);
  }
  .col:last-child { border-right: none; }
  .col-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 14px 16px 8px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
  }
  .dot {
    width: 10px; height: 10px; border-radius: 50%;
  }
  .col.a .dot { background: var(--a); }
  .col.b .dot { background: var(--b); }
  .meta-line {
    color: var(--muted);
    font-size: 12px;
    padding: 0 16px 10px;
  }
  .editor-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 12px 16px;
    min-height: 0;
  }
  .body-view, .body-edit {
    flex: 1;
    width: 100%;
    min-height: 360px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: #fff;
    padding: 16px 18px;
    line-height: 1.75;
    font-family: var(--font);
    font-size: 16px;
    white-space: pre-wrap;
    word-break: break-word;
    outline: none;
  }
  .body-edit {
    resize: vertical;
  }
  .body-view mark {
    background: var(--mark);
    border-radius: 3px;
    padding: 0 1px;
    cursor: pointer;
    transition: background .15s;
  }
  .body-view mark.active { background: var(--mark-active); outline: 1px solid rgba(0,0,0,0.08); }
  .body-view mark.mine { box-shadow: inset 0 -2px 0 rgba(196,92,74,0.35); }
  .col.readonly .body-view { background: #fffcf7; }
  .hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--muted);
  }
  .save-row {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    align-items: center;
  }
  .save-row .status { font-size: 12px; color: var(--muted); flex: 1; }

  /* Annotation panel */
  #ann-panel {
    background: rgba(255,253,249,0.9);
    border-left: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  #ann-panel h3 {
    margin: 0;
    padding: 16px 16px 10px;
    font-size: 14px;
    letter-spacing: 0.04em;
  }
  .ann-list {
    list-style: none;
    margin: 0;
    padding: 0 10px 16px;
    overflow: auto;
    flex: 1;
  }
  .ann-card {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 14px;
    padding: 12px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: border-color .15s, box-shadow .15s;
  }
  .ann-card:hover, .ann-card.active {
    border-color: #d8c7a8;
    box-shadow: 0 4px 14px rgba(42,36,28,0.06);
  }
  .ann-card .quote {
    font-family: var(--font);
    font-size: 13px;
    color: var(--muted);
    border-left: 3px solid var(--mark-active);
    padding-left: 8px;
    margin-bottom: 8px;
    white-space: pre-wrap;
  }
  .ann-card .content {
    font-size: 14px;
    line-height: 1.55;
    white-space: pre-wrap;
  }
  .ann-card .foot {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 10px;
    font-size: 11px;
    color: var(--muted);
  }
  .ann-card .actions { display: flex; gap: 6px; }
  .ann-card .actions button {
    font-size: 11px;
    color: var(--muted);
    text-decoration: underline;
  }
  .empty {
    color: var(--muted);
    font-size: 13px;
    padding: 8px 16px 20px;
    line-height: 1.5;
  }

  /* Selection floating toolbar */
  #sel-bar {
    position: fixed;
    z-index: 50;
    transform: translate(-50%, -100%);
    background: var(--ink);
    color: #fff;
    border-radius: 999px;
    padding: 6px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    display: none;
  }
  #sel-bar.visible { display: flex; gap: 4px; }
  #sel-bar button {
    color: #fff;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 999px;
  }
  #sel-bar button:hover { background: rgba(255,255,255,0.12); }

  /* Annotation composer modal */
  #composer {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: none;
    place-items: center;
    background: rgba(42,36,28,0.35);
    padding: 20px;
  }
  #composer.open { display: grid; }
  .composer-card {
    width: min(440px, 100%);
    background: var(--bg-elev);
    border-radius: 18px;
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    padding: 18px;
  }
  .composer-card h4 { margin: 0 0 8px; font-size: 15px; }
  .composer-card .q {
    font-family: var(--font);
    font-size: 13px;
    color: var(--muted);
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 12px;
    margin-bottom: 12px;
    max-height: 90px;
    overflow: auto;
    white-space: pre-wrap;
  }
  .composer-card textarea {
    width: 100%;
    min-height: 110px;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 12px;
    resize: vertical;
    outline: none;
    background: #fff;
  }
  .composer-card textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .composer-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }
  .composer-actions .primary { width: auto; margin: 0; padding: 10px 16px; }

  .blank {
    flex: 1;
    display: grid;
    place-items: center;
    color: var(--muted);
    padding: 40px;
    text-align: center;
  }
  .blank h3 {
    margin: 0 0 8px;
    color: var(--ink);
    font-family: var(--font);
  }
</style>
</head>
<body>
  <div id="login">
    <div class="login-card">
      <h1>${title}</h1>
      <div class="sub">输入共享 PIN，选择你是谁，进入共同日记本。</div>
      <div class="field">
        <label>PIN</label>
        <input id="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="六位或更长" />
      </div>
      <div class="field">
        <label>我是</label>
        <div class="person-pick">
          <button type="button" data-person="A" class="active-a" id="pick-a">${nameA}</button>
          <button type="button" data-person="B" id="pick-b">${nameB}</button>
        </div>
      </div>
      <button class="primary" id="login-btn" type="button">进入小本本</button>
      <p class="error" id="login-error"></p>
    </div>
  </div>

  <div id="app" class="hidden">
    <aside id="sidebar">
      <div class="side-head">
        <h1 id="app-title">${title}</h1>
        <div class="who">当前身份：<strong id="who-label">—</strong></div>
      </div>
      <div class="side-actions">
        <button type="button" class="grow" id="new-page">＋ 新的一页</button>
        <button type="button" id="logout-btn" title="退出">退出</button>
      </div>
      <ul class="page-list" id="page-list"></ul>
    </aside>
    <div id="backdrop" class="backdrop hidden"></div>
    <section id="main">
      <div class="topbar">
        <button type="button" class="icon-btn" id="menu-btn" title="目录">☰</button>
        <h2 id="page-title">选择或创建一页</h2>
        <input class="title-edit hidden" id="title-input" />
        <input type="date" class="ghost" id="date-input" />
        <button type="button" class="ghost" id="rename-btn">改标题</button>
        <button type="button" class="ghost danger" id="delete-btn">删除</button>
      </div>
      <div id="blank" class="blank">
        <div>
          <h3>还没有打开任何一页</h3>
          <p>左侧新建一页，开始写下今天的故事。<br/>选中对方（或自己）的文字，即可添加批注。</p>
        </div>
      </div>
      <div id="workspace" class="workspace hidden">
        <div class="diaries">
          <div class="col a" id="col-a">
            <div class="col-head">
              <span class="badge"><span class="dot"></span><span id="label-a">${nameA}</span></span>
              <button type="button" class="ghost hidden" id="edit-a">编辑</button>
            </div>
            <div class="meta-line" id="meta-a"></div>
            <div class="editor-wrap">
              <div class="body-view" id="view-a" data-target="A"></div>
              <textarea class="body-edit hidden" id="edit-area-a" data-target="A" placeholder="写下这一天……"></textarea>
              <div class="save-row hidden" id="save-row-a">
                <span class="status" id="status-a"></span>
                <button type="button" class="ghost" id="cancel-a">取消</button>
                <button type="button" class="primary" style="width:auto;margin:0;padding:8px 14px" id="save-a">保存</button>
              </div>
              <div class="hint" id="hint-a">选中文字可添加批注</div>
            </div>
          </div>
          <div class="col b" id="col-b">
            <div class="col-head">
              <span class="badge"><span class="dot"></span><span id="label-b">${nameB}</span></span>
              <button type="button" class="ghost hidden" id="edit-b">编辑</button>
            </div>
            <div class="meta-line" id="meta-b"></div>
            <div class="editor-wrap">
              <div class="body-view" id="view-b" data-target="B"></div>
              <textarea class="body-edit hidden" id="edit-area-b" data-target="B" placeholder="写下这一天……"></textarea>
              <div class="save-row hidden" id="save-row-b">
                <span class="status" id="status-b"></span>
                <button type="button" class="ghost" id="cancel-b">取消</button>
                <button type="button" class="primary" style="width:auto;margin:0;padding:8px 14px" id="save-b">保存</button>
              </div>
              <div class="hint" id="hint-b">选中文字可添加批注</div>
            </div>
          </div>
        </div>
        <aside id="ann-panel">
          <h3>批注</h3>
          <div class="empty" id="ann-empty">选中日记中的一段文字，点击「添加批注」。</div>
          <ul class="ann-list" id="ann-list"></ul>
        </aside>
      </div>
    </section>
  </div>

  <div id="sel-bar">
    <button type="button" id="sel-annotate">添加批注</button>
  </div>

  <div id="composer">
    <div class="composer-card">
      <h4 id="composer-title">添加批注</h4>
      <div class="q" id="composer-quote"></div>
      <textarea id="composer-text" placeholder="写下你的想法……"></textarea>
      <div class="composer-actions">
        <button type="button" class="ghost" id="composer-cancel">取消</button>
        <button type="button" class="primary" id="composer-save">保存批注</button>
      </div>
    </div>
  </div>

<script>
(() => {
  const NAME_A = ${JSON.stringify(cfg.personA || "小A")};
  const NAME_B = ${JSON.stringify(cfg.personB || "小B")};
  const PAGE_TITLE = ${JSON.stringify(cfg.pageTitle || "我们的小本本")};

  /** @typedef {"A"|"B"} PersonId */
  /** @typedef {{ id:string, author:PersonId, target:PersonId, start:number, end:number, quote:string, content:string, createdAt:string, updatedAt:string }} Annotation */
  /** @typedef {{ body:string, updatedAt:string|null }} DiaryEntry */
  /** @typedef {{ id:string, date:string, title:string, entries:{A:DiaryEntry,B:DiaryEntry}, annotations:Annotation[], createdAt:string, updatedAt:string }} Page */
  /** @typedef {{ id:string, date:string, title:string, updatedAt:string }} PageSummary */

  const state = {
    person: /** @type {PersonId|null} */ (null),
    names: { A: NAME_A, B: NAME_B },
    title: PAGE_TITLE,
    pages: /** @type {PageSummary[]} */ ([]),
    currentId: /** @type {string|null} */ (null),
    page: /** @type {Page|null} */ (null),
    editing: /** @type {PersonId|null} */ (null),
    activeAnnId: /** @type {string|null} */ (null),
    selection: /** @type {null | { target: PersonId, start: number, end: number, quote: string }} */ (null),
    pick: /** @type {PersonId} */ ("A"),
  };

  const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
  const loginEl = $("login");
  const appEl = $("app");
  const pinEl = /** @type {HTMLInputElement} */ ($("pin"));
  const loginErr = $("login-error");
  const pageList = /** @type {HTMLUListElement} */ ($("page-list"));
  const blank = $("blank");
  const workspace = $("workspace");
  const selBar = $("sel-bar");
  const composer = $("composer");
  const composerText = /** @type {HTMLTextAreaElement} */ ($("composer-text"));
  const composerQuote = $("composer-quote");
  const titleInput = /** @type {HTMLInputElement} */ ($("title-input"));
  const dateInput = /** @type {HTMLInputElement} */ ($("date-input"));
  const pageTitleEl = $("page-title");
  const sidebar = $("sidebar");
  const backdrop = $("backdrop");

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText || "请求失败");
      // @ts-ignore
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function nameOf(p) { return p === "B" ? state.names.B : state.names.A; }
  function fmtTime(iso) {
    if (!iso) return "尚未写下";
    try {
      const d = new Date(iso);
      return d.toLocaleString("zh-CN", { hour12: false });
    } catch { return iso; }
  }
  function today() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  /* ---------- Auth ---------- */
  $("pick-a").addEventListener("click", () => setPick("A"));
  $("pick-b").addEventListener("click", () => setPick("B"));
  function setPick(p) {
    state.pick = p;
    $("pick-a").classList.toggle("active-a", p === "A");
    $("pick-b").classList.toggle("active-b", p === "B");
  }
  $("login-btn").addEventListener("click", doLogin);
  pinEl.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

  async function doLogin() {
    loginErr.textContent = "";
    const pin = pinEl.value.trim();
    if (!pin) { loginErr.textContent = "请输入 PIN"; return; }
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ pin, person: state.pick }),
      });
      state.person = data.person;
      state.names = data.names || state.names;
      state.title = data.title || state.title;
      enterApp();
    } catch (e) {
      loginErr.textContent = e.message || "登录失败";
    }
  }

  $("logout-btn").addEventListener("click", async () => {
    try { await api("/api/logout", { method: "POST", body: "{}" }); } catch {}
    location.reload();
  });

  async function bootstrap() {
    try {
      const me = await api("/api/me");
      if (me.authenticated) {
        state.person = me.person;
        state.names = me.names || state.names;
        state.title = me.title || state.title;
        enterApp();
        return;
      }
    } catch {}
    loginEl.classList.remove("hidden");
  }

  function enterApp() {
    loginEl.classList.add("hidden");
    appEl.classList.remove("hidden");
    $("app-title").textContent = state.title;
    document.title = state.title;
    $("who-label").textContent = nameOf(state.person);
    $("label-a").textContent = state.names.A;
    $("label-b").textContent = state.names.B;
    setupEditButtons();
    refreshPages();
  }

  function setupEditButtons() {
    const mine = state.person;
    $("edit-a").classList.toggle("hidden", mine !== "A");
    $("edit-b").classList.toggle("hidden", mine !== "B");
    $("col-a").classList.toggle("readonly", mine !== "A");
    $("col-b").classList.toggle("readonly", mine !== "B");
    $("hint-a").textContent = mine === "A" ? "点「编辑」写日记；选中文字可批注" : "选中文字可添加批注";
    $("hint-b").textContent = mine === "B" ? "点「编辑」写日记；选中文字可批注" : "选中文字可添加批注";
  }

  /* ---------- Pages ---------- */
  async function refreshPages() {
    const data = await api("/api/pages");
    state.pages = data.pages || [];
    renderPageList();
    if (state.currentId) {
      const still = state.pages.some((p) => p.id === state.currentId);
      if (still) await openPage(state.currentId);
      else if (state.pages[0]) await openPage(state.pages[0].id);
      else showBlank();
    } else if (state.pages[0]) {
      await openPage(state.pages[0].id);
    } else {
      showBlank();
    }
  }

  function renderPageList() {
    pageList.innerHTML = "";
    if (!state.pages.length) {
      const li = document.createElement("li");
      li.innerHTML = '<div class="empty" style="padding:12px">还没有日记页</div>';
      pageList.appendChild(li);
      return;
    }
    for (const p of state.pages) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = p.id === state.currentId ? "active" : "";
      btn.innerHTML =
        '<div class="t"></div><div class="d"></div>';
      btn.querySelector(".t").textContent = p.title || p.date;
      btn.querySelector(".d").textContent = p.date;
      btn.addEventListener("click", () => {
        openPage(p.id);
        closeMobileSidebar();
      });
      li.appendChild(btn);
      pageList.appendChild(li);
    }
  }

  function showBlank() {
    state.currentId = null;
    state.page = null;
    blank.classList.remove("hidden");
    workspace.classList.add("hidden");
    pageTitleEl.textContent = "选择或创建一页";
    dateInput.value = "";
  }

  async function openPage(id) {
    const data = await api("/api/pages/" + encodeURIComponent(id));
    state.currentId = id;
    state.page = data.page;
    state.editing = null;
    state.activeAnnId = null;
    blank.classList.add("hidden");
    workspace.classList.remove("hidden");
    pageTitleEl.textContent = state.page.title || state.page.date;
    titleInput.classList.add("hidden");
    pageTitleEl.classList.remove("hidden");
    dateInput.value = state.page.date || "";
    renderPageList();
    renderDiaries();
    renderAnnotations();
  }

  $("new-page").addEventListener("click", async () => {
    try {
      const data = await api("/api/pages", {
        method: "POST",
        body: JSON.stringify({ date: today(), title: today() }),
      });
      state.pages = [{ id: data.page.id, date: data.page.date, title: data.page.title, updatedAt: data.page.updatedAt }, ...state.pages];
      await openPage(data.page.id);
      // enter edit mode for self
      if (state.person) startEdit(state.person);
      closeMobileSidebar();
    } catch (e) {
      alert(e.message || "创建失败");
    }
  });

  $("delete-btn").addEventListener("click", async () => {
    if (!state.currentId) return;
    if (!confirm("确定删除这一页？批注也会一起消失。")) return;
    try {
      await api("/api/pages/" + encodeURIComponent(state.currentId), { method: "DELETE" });
      state.pages = state.pages.filter((p) => p.id !== state.currentId);
      state.currentId = null;
      state.page = null;
      if (state.pages[0]) await openPage(state.pages[0].id);
      else { renderPageList(); showBlank(); }
    } catch (e) {
      alert(e.message || "删除失败");
    }
  });

  $("rename-btn").addEventListener("click", () => {
    if (!state.page) return;
    pageTitleEl.classList.add("hidden");
    titleInput.classList.remove("hidden");
    titleInput.value = state.page.title || "";
    titleInput.focus();
    titleInput.select();
  });
  titleInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") { e.preventDefault(); await commitMeta(); }
    if (e.key === "Escape") {
      titleInput.classList.add("hidden");
      pageTitleEl.classList.remove("hidden");
    }
  });
  titleInput.addEventListener("blur", () => { commitMeta(); });
  dateInput.addEventListener("change", () => commitMeta());

  async function commitMeta() {
    if (!state.page) return;
    const title = titleInput.classList.contains("hidden")
      ? state.page.title
      : titleInput.value.trim() || state.page.date;
    const date = dateInput.value || state.page.date;
    if (title === state.page.title && date === state.page.date) {
      titleInput.classList.add("hidden");
      pageTitleEl.classList.remove("hidden");
      return;
    }
    try {
      const data = await api("/api/pages/" + encodeURIComponent(state.page.id), {
        method: "PATCH",
        body: JSON.stringify({ title, date }),
      });
      state.page = data.page;
      const idx = state.pages.findIndex((p) => p.id === state.page.id);
      if (idx >= 0) {
        state.pages[idx] = {
          id: state.page.id,
          date: state.page.date,
          title: state.page.title,
          updatedAt: state.page.updatedAt,
        };
      }
      pageTitleEl.textContent = state.page.title;
      titleInput.classList.add("hidden");
      pageTitleEl.classList.remove("hidden");
      renderPageList();
    } catch (e) {
      alert(e.message || "保存失败");
    }
  }

  /* ---------- Diaries ---------- */
  function renderDiaries() {
    if (!state.page) return;
    for (const p of /** @type {PersonId[]} */ (["A", "B"])) {
      const entry = state.page.entries[p] || { body: "", updatedAt: null };
      $("meta-" + p.toLowerCase()).textContent = "更新于 " + fmtTime(entry.updatedAt);
      const view = $("view-" + p.toLowerCase());
      const area = /** @type {HTMLTextAreaElement} */ ($("edit-area-" + p.toLowerCase()));
      const saveRow = $("save-row-" + p.toLowerCase());
      const isEditing = state.editing === p;
      view.classList.toggle("hidden", isEditing);
      area.classList.toggle("hidden", !isEditing);
      saveRow.classList.toggle("hidden", !isEditing);
      if (isEditing) {
        area.value = entry.body || "";
      } else {
        view.innerHTML = renderHighlighted(entry.body || "", p);
        bindMarks(view);
      }
    }
  }

  /**
   * Build highlighted HTML for a diary body using annotations on that target.
   * Offsets are UTF-16 code units (JS string indices).
   */
  function renderHighlighted(text, target) {
    if (!text) return '<span style="color:var(--muted)">（还是空白页）</span>';
    const anns = (state.page?.annotations || [])
      .filter((a) => a.target === target && a.end > a.start)
      .slice()
      .sort((a, b) => a.start - b.start || b.end - a.end);

    // Greedy non-overlapping merge for nesting simplicity: prefer earlier, longer
    const ranges = [];
    let cursor = 0;
    for (const a of anns) {
      const start = Math.max(0, Math.min(a.start, text.length));
      const end = Math.max(start, Math.min(a.end, text.length));
      if (end <= start) continue;
      if (start < cursor) continue; // skip overlaps for MVP
      ranges.push({ start, end, id: a.id, mine: a.author === state.person });
      cursor = end;
    }

    let html = "";
    let i = 0;
    for (const r of ranges) {
      if (i < r.start) html += escapeHtml(text.slice(i, r.start));
      const cls = "ann-mark" + (r.id === state.activeAnnId ? " active" : "") + (r.mine ? " mine" : "");
      html += '<mark class="' + cls + '" data-ann="' + escapeAttr(r.id) + '">' +
        escapeHtml(text.slice(r.start, r.end)) + "</mark>";
      i = r.end;
    }
    if (i < text.length) html += escapeHtml(text.slice(i));
    return html;
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  function bindMarks(view) {
    view.querySelectorAll("mark[data-ann]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = el.getAttribute("data-ann");
        focusAnnotation(id);
      });
    });
  }

  $("edit-a").addEventListener("click", () => startEdit("A"));
  $("edit-b").addEventListener("click", () => startEdit("B"));
  $("cancel-a").addEventListener("click", () => cancelEdit("A"));
  $("cancel-b").addEventListener("click", () => cancelEdit("B"));
  $("save-a").addEventListener("click", () => saveEntry("A"));
  $("save-b").addEventListener("click", () => saveEntry("B"));

  function startEdit(p) {
    if (state.person !== p || !state.page) return;
    state.editing = p;
    hideSelBar();
    renderDiaries();
    const area = /** @type {HTMLTextAreaElement} */ ($("edit-area-" + p.toLowerCase()));
    area.focus();
  }
  function cancelEdit(p) {
    if (state.editing !== p) return;
    state.editing = null;
    renderDiaries();
  }
  async function saveEntry(p) {
    if (!state.page || state.person !== p) return;
    const area = /** @type {HTMLTextAreaElement} */ ($("edit-area-" + p.toLowerCase()));
    const status = $("status-" + p.toLowerCase());
    status.textContent = "保存中…";
    try {
      const data = await api(
        "/api/pages/" + encodeURIComponent(state.page.id) + "/entry",
        { method: "PUT", body: JSON.stringify({ person: p, body: area.value }) },
      );
      state.page = data.page;
      state.editing = null;
      status.textContent = "";
      // refresh list updatedAt
      const idx = state.pages.findIndex((x) => x.id === state.page.id);
      if (idx >= 0) state.pages[idx].updatedAt = state.page.updatedAt;
      renderDiaries();
      renderAnnotations();
    } catch (e) {
      status.textContent = e.message || "保存失败";
    }
  }

  /* ---------- Selection → annotation ---------- */
  document.addEventListener("mouseup", onSelectionChange);
  document.addEventListener("keyup", onSelectionChange);
  document.addEventListener("scroll", hideSelBar, true);
  window.addEventListener("resize", hideSelBar);

  function onSelectionChange() {
    if (state.editing) { hideSelBar(); return; }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      // keep bar if clicking the bar itself
      return;
    }
    const range = sel.getRangeAt(0);
    const view = findViewRoot(range.commonAncestorContainer);
    if (!view) { hideSelBar(); return; }
    const target = /** @type {PersonId} */ (view.getAttribute("data-target"));
    const offsets = rangeToOffsets(view, range);
    if (!offsets || offsets.end <= offsets.start) { hideSelBar(); return; }
    const quote = (view.textContent || "").slice(offsets.start, offsets.end);
    if (!quote.trim()) { hideSelBar(); return; }
    state.selection = { target, start: offsets.start, end: offsets.end, quote };
    placeSelBar(range);
  }

  function findViewRoot(node) {
    let n = node.nodeType === 3 ? node.parentElement : node;
    while (n && n !== document.body) {
      if (n.classList && n.classList.contains("body-view")) return n;
      n = n.parentElement;
    }
    return null;
  }

  /** Map a DOM Range inside a body-view to UTF-16 offsets over its full textContent. */
  function rangeToOffsets(view, range) {
    const pre = document.createRange();
    pre.selectNodeContents(view);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;
    return { start, end };
  }

  function placeSelBar(range) {
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) { hideSelBar(); return; }
    selBar.classList.add("visible");
    const x = rect.left + rect.width / 2;
    const y = Math.max(12, rect.top - 8);
    selBar.style.left = x + "px";
    selBar.style.top = y + "px";
  }
  function hideSelBar() {
    selBar.classList.remove("visible");
  }

  $("sel-annotate").addEventListener("mousedown", (e) => {
    // prevent selection collapse before click
    e.preventDefault();
  });
  $("sel-annotate").addEventListener("click", () => {
    if (!state.selection || !state.page) return;
    openComposer("create");
  });

  let composerMode = /** @type {"create"|"edit"} */ ("create");
  let editingAnnId = /** @type {string|null} */ (null);

  function openComposer(mode, ann) {
    composerMode = mode;
    hideSelBar();
    if (mode === "create") {
      if (!state.selection) return;
      editingAnnId = null;
      $("composer-title").textContent = "添加批注";
      composerQuote.textContent = "「" + state.selection.quote + "」";
      composerText.value = "";
    } else {
      editingAnnId = ann.id;
      $("composer-title").textContent = "编辑批注";
      composerQuote.textContent = "「" + (ann.quote || "") + "」";
      composerText.value = ann.content || "";
    }
    composer.classList.add("open");
    setTimeout(() => composerText.focus(), 30);
  }
  function closeComposer() {
    composer.classList.remove("open");
    composerText.value = "";
    editingAnnId = null;
  }
  $("composer-cancel").addEventListener("click", closeComposer);
  composer.addEventListener("click", (e) => {
    if (e.target === composer) closeComposer();
  });
  $("composer-save").addEventListener("click", async () => {
    if (!state.page) return;
    const content = composerText.value.trim();
    if (!content) { alert("批注内容不能为空"); return; }
    try {
      if (composerMode === "create") {
        if (!state.selection) return;
        const data = await api(
          "/api/pages/" + encodeURIComponent(state.page.id) + "/annotations",
          {
            method: "POST",
            body: JSON.stringify({
              target: state.selection.target,
              start: state.selection.start,
              end: state.selection.end,
              quote: state.selection.quote,
              content,
            }),
          },
        );
        state.page = data.page;
        state.activeAnnId = data.annotation?.id || null;
      } else if (editingAnnId) {
        const data = await api(
          "/api/pages/" + encodeURIComponent(state.page.id) + "/annotations/" + encodeURIComponent(editingAnnId),
          { method: "PATCH", body: JSON.stringify({ content }) },
        );
        state.page = data.page;
        state.activeAnnId = editingAnnId;
      }
      state.selection = null;
      window.getSelection()?.removeAllRanges();
      closeComposer();
      renderDiaries();
      renderAnnotations();
    } catch (e) {
      alert(e.message || "保存批注失败");
    }
  });

  /* ---------- Annotation list ---------- */
  function renderAnnotations() {
    const list = /** @type {HTMLUListElement} */ ($("ann-list"));
    const empty = $("ann-empty");
    list.innerHTML = "";
    const anns = (state.page?.annotations || []).slice().sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || ""),
    );
    if (!anns.length) {
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    for (const a of anns) {
      const li = document.createElement("li");
      const card = document.createElement("div");
      card.className = "ann-card" + (a.id === state.activeAnnId ? " active" : "");
      card.dataset.id = a.id;

      const quote = document.createElement("div");
      quote.className = "quote";
      quote.textContent = a.quote || "";

      const content = document.createElement("div");
      content.className = "content";
      content.textContent = a.content || "";

      const foot = document.createElement("div");
      foot.className = "foot";
      const left = document.createElement("span");
      left.textContent =
        nameOf(a.author) + " · 批 " + nameOf(a.target) + " · " + fmtTime(a.createdAt);
      foot.appendChild(left);

      if (a.author === state.person) {
        const actions = document.createElement("div");
        actions.className = "actions";
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "编辑";
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openComposer("edit", a);
        });
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "删除";
        delBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm("删除这条批注？")) return;
          try {
            const data = await api(
              "/api/pages/" + encodeURIComponent(state.page.id) + "/annotations/" + encodeURIComponent(a.id),
              { method: "DELETE" },
            );
            state.page = data.page;
            if (state.activeAnnId === a.id) state.activeAnnId = null;
            renderDiaries();
            renderAnnotations();
          } catch (err) {
            alert(err.message || "删除失败");
          }
        });
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        foot.appendChild(actions);
      }

      card.appendChild(quote);
      card.appendChild(content);
      card.appendChild(foot);
      card.addEventListener("click", () => focusAnnotation(a.id));
      li.appendChild(card);
      list.appendChild(li);
    }
  }

  function focusAnnotation(id) {
    state.activeAnnId = id;
    renderDiaries();
    renderAnnotations();
    const mark = document.querySelector('mark[data-ann="' + CSS.escape(id) + '"]');
    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const card = document.querySelector('.ann-card[data-id="' + CSS.escape(id) + '"]');
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- Mobile sidebar ---------- */
  $("menu-btn").addEventListener("click", () => {
    sidebar.classList.add("open");
    backdrop.classList.remove("hidden");
  });
  backdrop.addEventListener("click", closeMobileSidebar);
  function closeMobileSidebar() {
    sidebar.classList.remove("open");
    backdrop.classList.add("hidden");
  }

  // Click outside selection clears bar (but not when interacting with bar/composer)
  document.addEventListener("mousedown", (e) => {
    const t = /** @type {Node} */ (e.target);
    if (selBar.contains(t) || composer.contains(t)) return;
    // delay so mouseup selection can run first on drag-end
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) hideSelBar();
    }, 10);
  });

  bootstrap();
})();
</script>
</body>
</html>`;
}
