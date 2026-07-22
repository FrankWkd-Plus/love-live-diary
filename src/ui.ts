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
<meta name="theme-color" content="#f6f1ea" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%93%3C/text%3E%3C/svg%3E" />
<link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%93%3C/text%3E%3C/svg%3E" />
<title>${title}</title>
<style>
  :root {
    --bg: #f3ebe2;
    --bg-elev: #fffdf9;
    --ink: #2a241c;
    --muted: #7a6f62;
    --line: #e4d8c8;
    --accent: #c45c4a;
    --accent-soft: #f3d6cf;
    --a: #3d6b8c;
    --a-soft: #d9e7f0;
    --b: #6b5a8c;
    --b-soft: #e5dff0;
    --mark: #ffe08a;
    --mark-active: #ffc94a;
    --shadow: 0 18px 50px rgba(42, 36, 28, 0.10);
    --shadow-sm: 0 6px 18px rgba(42, 36, 28, 0.06);
    --radius: 18px;
    --font: "Iowan Old Style", "Palatino Linotype", "Songti SC", "Noto Serif SC", Georgia, serif;
    --ui: "SF Pro Text", "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    color: var(--ink);
    background:
      radial-gradient(1000px 520px at 8% -8%, #fff6ea 0%, transparent 58%),
      radial-gradient(820px 480px at 100% 0%, #efe6ff 0%, transparent 52%),
      radial-gradient(700px 400px at 50% 100%, #f7e8e2 0%, transparent 50%),
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
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 28px 20px;
    padding:
      max(28px, env(safe-area-inset-top))
      max(20px, env(safe-area-inset-right))
      max(28px, env(safe-area-inset-bottom))
      max(20px, env(safe-area-inset-left));
    position: relative;
  }
  .login-card {
    width: min(420px, 100%);
    background: rgba(255,253,249,0.92);
    border: 1px solid rgba(228,216,200,0.9);
    border-radius: 28px;
    box-shadow: var(--shadow);
    padding: 40px 32px 30px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    position: relative;
    overflow: hidden;
  }
  .login-card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: linear-gradient(90deg, var(--a), var(--accent), var(--b));
  }
  .login-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0 0 28px;
  }
  .login-title .login-icon {
    font-size: 32px;
    line-height: 1;
    filter: drop-shadow(0 4px 10px rgba(42,36,28,0.12));
    flex-shrink: 0;
  }
  .login-card h1 {
    margin: 0;
    font-family: var(--font);
    font-weight: 600;
    font-size: 28px;
    letter-spacing: 0.02em;
    text-align: center;
    line-height: 1.25;
  }
  .field { margin-bottom: 18px; }
  .field label {
    display: block;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px;
    font-weight: 600;
  }
  .field input {
    width: 100%;
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 14px;
    padding: 13px 15px;
    outline: none;
    transition: border-color .15s, box-shadow .15s, transform .1s;
  }
  .field input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }
  #session-label {
    font-weight: 600;
    font-size: 15px;
    padding: 12px 14px;
    border-radius: 14px;
    background: linear-gradient(135deg, #fff8ef, #f5eefc);
    border: 1px solid var(--line);
  }
  .person-pick {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .person-pick button {
    border: 1.5px solid var(--line);
    border-radius: 16px;
    padding: 16px 12px;
    background: #fff;
    transition: all .18s ease;
    font-weight: 500;
  }
  .person-pick button:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  .person-pick button.active-a {
    border-color: var(--a);
    background: linear-gradient(180deg, #eef5fa, var(--a-soft));
    color: var(--a);
    font-weight: 700;
    box-shadow: 0 0 0 3px rgba(61,107,140,0.12);
  }
  .person-pick button.active-b {
    border-color: var(--b);
    background: linear-gradient(180deg, #f4eefc, var(--b-soft));
    color: var(--b);
    font-weight: 700;
    box-shadow: 0 0 0 3px rgba(107,90,140,0.12);
  }
  .primary {
    width: 100%;
    margin-top: 8px;
    border-radius: 14px;
    padding: 13px 16px;
    background: linear-gradient(180deg, #3a3229, var(--ink));
    color: #fff;
    font-weight: 600;
    letter-spacing: 0.02em;
    transition: transform .1s, opacity .15s, box-shadow .15s;
    box-shadow: 0 8px 20px rgba(42,36,28,0.18);
  }
  .primary:hover { opacity: 0.95; box-shadow: 0 10px 24px rgba(42,36,28,0.22); }
  .primary:active { transform: scale(0.99); }
  .primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
  .error {
    color: var(--accent);
    font-size: 13px;
    min-height: 1.2em;
    margin: 10px 0 0;
    text-align: center;
  }

  /* ---------- App shell ---------- */
  #app {
    min-height: 100%;
    min-height: 100dvh;
    display: grid;
    grid-template-columns: 280px 1fr;
  }
  #menu-btn { display: none; }
  @media (max-width: 860px) {
    #app { grid-template-columns: 1fr; }
    #menu-btn { display: inline-flex; align-items: center; justify-content: center; }
    #sidebar {
      display: none;
      padding-top: env(safe-area-inset-top);
    }
    #sidebar.open {
      display: flex;
      position: fixed;
      inset: 0 auto 0 0;
      width: min(300px, 86vw);
      max-width: 100%;
      z-index: 40;
      box-shadow: var(--shadow);
      min-height: 100dvh;
    }
    .backdrop {
      position: fixed; inset: 0; background: rgba(42,36,28,.38); z-index: 30;
      backdrop-filter: blur(2px);
    }
    .topbar {
      padding-top: max(12px, env(safe-area-inset-top));
      padding-left: max(12px, env(safe-area-inset-left));
      padding-right: max(12px, env(safe-area-inset-right));
      flex-wrap: wrap;
      gap: 8px;
    }
    .topbar h2 {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 16px;
    }
    .topbar .ghost,
    .topbar input[type="date"],
    .topbar input.title-edit {
      font-size: 12px;
      padding: 7px 10px;
    }
    .topbar input[type="date"] {
      max-width: 42vw;
    }
    .diaries {
      padding: 10px;
      gap: 10px;
    }
    .col {
      margin: 0;
      min-height: 0;
    }
    .body-view, .body-edit {
      min-height: 240px;
      font-size: 16px; /* avoid iOS zoom on focus */
      padding: 14px;
    }
    .editor-wrap { padding: 0 10px 14px; }
    #ann-panel {
      min-height: 220px;
      max-height: 42vh;
    }
    .blank { padding: 32px 18px; }
    .blank > div { padding: 22px 18px; }
    .login-card {
      padding: 28px 20px 22px;
      border-radius: 22px;
    }
    .login-card h1 { font-size: 22px; }
    .login-title .login-icon { font-size: 28px; }
    .login-title { margin-bottom: 22px; gap: 8px; }
    .person-pick button { padding: 14px 10px; }
    #sel-bar {
      /* keep above home indicator */
      bottom: auto;
    }
    #composer {
      padding:
        max(16px, env(safe-area-inset-top))
        max(16px, env(safe-area-inset-right))
        max(16px, env(safe-area-inset-bottom))
        max(16px, env(safe-area-inset-left));
      align-items: end;
    }
    .composer-card {
      width: 100%;
      border-radius: 18px 18px 14px 14px;
      max-height: min(86dvh, 640px);
      overflow: auto;
    }
  }
  @media (max-width: 480px) {
    .topbar #rename-btn,
    .topbar #delete-btn {
      padding: 7px 8px;
    }
    .topbar #date-input {
      order: 5;
      flex: 1 1 100%;
      max-width: none;
    }
  }

  #sidebar {
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(228,216,200,0.85);
    background: rgba(255,253,249,0.78);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    min-height: 100vh;
  }
  .side-head {
    padding: 22px 18px 14px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255,248,239,0.7), transparent);
  }
  .side-head h1 {
    margin: 0;
    font-family: var(--font);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .side-head h1::before {
    content: "📓 ";
    font-size: 0.92em;
  }
  .who {
    margin-top: 8px;
    font-size: 12px;
    color: var(--muted);
  }
  .who strong {
    color: var(--ink);
    background: linear-gradient(180deg, transparent 60%, var(--accent-soft) 60%);
    padding: 0 2px;
  }
  .side-actions {
    display: flex;
    gap: 8px;
    padding: 14px;
  }
  .side-actions button, .icon-btn {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 12px;
    padding: 9px 12px;
    font-size: 13px;
    transition: background .15s, border-color .15s, transform .1s, box-shadow .15s;
  }
  .side-actions button:hover, .icon-btn:hover {
    border-color: #d4c4ad;
    box-shadow: var(--shadow-sm);
  }
  .side-actions .grow {
    flex: 1;
    background: linear-gradient(180deg, #3a3229, var(--ink));
    color: #fff;
    border-color: var(--ink);
    font-weight: 600;
  }
  .page-list {
    list-style: none;
    margin: 0;
    padding: 8px 10px 16px;
    overflow: auto;
    flex: 1;
  }
  .page-list li button {
    width: 100%;
    text-align: left;
    border-radius: 14px;
    padding: 12px 13px;
    border: 1px solid transparent;
    transition: background .15s, border-color .15s, box-shadow .15s;
  }
  .page-list li button:hover { background: rgba(0,0,0,0.03); }
  .page-list li button.active {
    background: #fff;
    border-color: var(--line);
    box-shadow: var(--shadow-sm);
  }
  .page-list .t { font-weight: 600; font-size: 14px; }
  .page-list .d { color: var(--muted); font-size: 12px; margin-top: 3px; }

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
    border-bottom: 1px solid rgba(228,216,200,0.85);
    background: rgba(255,253,249,0.72);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
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
    border-radius: 12px;
    padding: 8px 12px;
    background: #fff;
  }
  .ghost {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 12px;
    padding: 8px 12px;
    font-size: 13px;
    transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .ghost:hover {
    border-color: #d4c4ad;
    box-shadow: var(--shadow-sm);
  }
  .danger { color: var(--accent); }
  .danger:hover { border-color: #e8b4ab; background: #fff7f5; }

  .workspace {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 320px;
    min-height: 0;
    gap: 0;
    grid-template-rows: auto 1fr;
  }
  @media (max-width: 1100px) {
    .workspace { grid-template-columns: 1fr; }
    #ann-panel { border-left: none; border-top: 1px solid var(--line); }
  }

  /* Daily topic */
  .topic-bar {
    grid-column: 1 / -1;
    margin: 12px 12px 0;
    padding: 14px 16px;
    border: 1px solid rgba(228,216,200,0.95);
    border-radius: 18px;
    background:
      linear-gradient(135deg, rgba(255,248,239,0.95), rgba(245,238,252,0.9));
    box-shadow: var(--shadow-sm);
  }
  .topic-bar h3 {
    margin: 0 0 8px;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
  }
  .topic-head {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .topic-text {
    flex: 1;
    min-width: 180px;
    font-family: var(--font);
    font-size: 17px;
    line-height: 1.5;
    color: var(--ink);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .topic-text.empty-topic {
    color: var(--muted);
    font-style: italic;
    font-size: 15px;
  }
  .topic-edit {
    width: 100%;
    min-height: 64px;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 10px 12px;
    background: #fff;
    resize: vertical;
    font-family: var(--font);
    font-size: 16px;
    outline: none;
  }
  .topic-edit:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .topic-meta {
    margin-top: 6px;
    font-size: 12px;
    color: var(--muted);
  }
  .topic-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 10px;
    align-items: center;
  }
  .topic-replies {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .topic-reply {
    background: rgba(255,255,255,0.75);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px 12px;
  }
  .topic-reply .who {
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--muted);
  }
  .topic-reply .body {
    font-size: 14px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .topic-reply .foot {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 6px;
    font-size: 11px;
    color: var(--muted);
  }
  .topic-reply .foot button {
    color: var(--muted);
    text-decoration: underline;
    font-size: 11px;
  }
  .topic-compose {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    align-items: flex-end;
  }
  .topic-compose textarea {
    flex: 1;
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 10px 12px;
    background: #fff;
    resize: vertical;
    outline: none;
    font-size: 15px;
  }
  .topic-compose .primary {
    width: auto;
    margin: 0;
    padding: 10px 14px;
    box-shadow: none;
  }

  .diaries {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    min-height: 0;
    padding: 12px;
    grid-row: 2;
  }
  @media (max-width: 720px) {
    .diaries { grid-template-columns: 1fr; }
  }

  .col {
    display: flex;
    flex-direction: column;
    min-height: 520px;
    margin: 0 6px;
    background: var(--bg-elev);
    border: 1px solid rgba(228,216,200,0.9);
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .col.a {
    background:
      linear-gradient(180deg, rgba(217,231,240,0.35), transparent 90px),
      var(--bg-elev);
  }
  .col.b {
    background:
      linear-gradient(180deg, rgba(229,223,240,0.4), transparent 90px),
      var(--bg-elev);
  }
  .col-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 16px 16px 8px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.01em;
  }
  .dot {
    width: 10px; height: 10px; border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.7);
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
    border-radius: 16px;
    background: #fff;
    padding: 18px 18px;
    line-height: 1.8;
    font-family: var(--font);
    font-size: 16.5px;
    white-space: pre-wrap;
    word-break: break-word;
    outline: none;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
    transition: border-color .15s, box-shadow .15s;
  }
  .body-edit {
    resize: vertical;
    border-color: #d8c7a8;
    box-shadow: 0 0 0 3px rgba(196,92,74,0.08);
  }
  .body-view mark {
    background: var(--mark);
    border-radius: 3px;
    padding: 0 1px;
    cursor: pointer;
    transition: background .15s;
  }
  .body-view mark:hover { background: var(--mark-active); }
  .body-view mark.active { background: var(--mark-active); outline: 1px solid rgba(0,0,0,0.08); }
  .body-view mark.mine { box-shadow: inset 0 -2px 0 rgba(196,92,74,0.35); }
  .body-view mark.self-note { box-shadow: inset 0 -2px 0 rgba(61,107,140,0.4); }

  /* Hover tooltip for highlighted annotations */
  #ann-tip {
    position: fixed;
    z-index: 60;
    max-width: min(320px, calc(100vw - 24px));
    background: #2a241c;
    color: #fffdf9;
    border-radius: 12px;
    padding: 10px 12px;
    box-shadow: 0 12px 32px rgba(42,36,28,0.28);
    font-size: 13px;
    line-height: 1.5;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -100%) translateY(-10px);
    transition: opacity .12s ease;
    display: none;
  }
  #ann-tip.visible {
    display: block;
    opacity: 1;
  }
  #ann-tip .tip-meta {
    font-size: 11px;
    opacity: 0.72;
    margin-bottom: 4px;
  }
  #ann-tip .tip-quote {
    font-family: var(--font);
    font-size: 12px;
    opacity: 0.8;
    border-left: 2px solid var(--mark-active);
    padding-left: 8px;
    margin-bottom: 6px;
    white-space: pre-wrap;
    max-height: 3.6em;
    overflow: hidden;
  }
  #ann-tip .tip-content {
    white-space: pre-wrap;
    word-break: break-word;
  }
  #ann-tip .tip-arrow {
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 12px;
    height: 12px;
    background: #2a241c;
    transform: translateX(-50%) rotate(45deg);
    border-radius: 2px;
  }
  .col.readonly .body-view { background: #fffcf7; }
  .hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--muted);
  }
  .media-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .media-item {
    position: relative;
    width: 88px;
    height: 88px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--line);
    background: #f3ebe2;
    flex: 0 0 auto;
  }
  .media-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    cursor: zoom-in;
  }
  .media-item .rm {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: rgba(42,36,28,0.72);
    color: #fff;
    font-size: 14px;
    line-height: 24px;
    text-align: center;
    display: none;
  }
  .media-item.mine .rm { display: block; }
  .media-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    align-items: center;
  }
  .media-tools .ghost {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .media-tools input[type="file"] {
    display: none;
  }
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(20,16,12,0.88);
    display: none;
    place-items: center;
    padding: 20px;
  }
  .lightbox.open { display: grid; }
  .lightbox img {
    max-width: min(960px, 100%);
    max-height: min(90dvh, 100%);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  }
  .confirm-mask {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(42,36,28,0.45);
    display: none;
    place-items: center;
    padding: 20px;
    backdrop-filter: blur(3px);
  }
  .confirm-mask.open { display: grid; }
  .confirm-card {
    width: min(400px, 100%);
    background: var(--bg-elev);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 20px;
    box-shadow: var(--shadow);
  }
  .confirm-card h4 {
    margin: 0 0 8px;
    font-family: var(--font);
    font-size: 18px;
  }
  .confirm-card p {
    margin: 0 0 16px;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.55;
    white-space: pre-wrap;
  }
  .confirm-card .row {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .confirm-card .primary.danger-solid {
    width: auto;
    margin: 0;
    padding: 10px 14px;
    background: linear-gradient(180deg, #d46a5a, var(--accent));
    box-shadow: none;
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
    background: rgba(255,253,249,0.88);
    border-left: 1px solid rgba(228,216,200,0.85);
    display: flex;
    flex-direction: column;
    min-height: 0;
    backdrop-filter: blur(8px);
  }
  #ann-panel h3 {
    margin: 0;
    padding: 18px 18px 10px;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 700;
  }
  .ann-list {
    list-style: none;
    margin: 0;
    padding: 0 12px 18px;
    overflow: auto;
    flex: 1;
  }
  .ann-card {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 16px;
    padding: 13px 14px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: border-color .15s, box-shadow .15s, transform .12s;
  }
  .ann-card:hover {
    border-color: #d8c7a8;
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }
  .ann-card.active {
    border-color: #d8c7a8;
    box-shadow: 0 0 0 3px rgba(255,201,74,0.25), var(--shadow-sm);
  }
  .ann-card .quote {
    font-family: var(--font);
    font-size: 13px;
    color: var(--muted);
    border-left: 3px solid var(--mark-active);
    padding-left: 10px;
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
    padding: 8px 18px 20px;
    line-height: 1.55;
  }

  /* Selection floating toolbar */
  #sel-bar {
    position: fixed;
    z-index: 50;
    transform: translate(-50%, -100%);
    background: linear-gradient(180deg, #3a3229, var(--ink));
    color: #fff;
    border-radius: 999px;
    padding: 5px;
    box-shadow: 0 14px 36px rgba(0,0,0,0.22);
    display: none;
  }
  #sel-bar.visible { display: flex; gap: 2px; }
  #sel-bar button {
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    padding: 9px 14px;
    border-radius: 999px;
  }
  #sel-bar button:hover { background: rgba(255,255,255,0.12); }

  /* Annotation composer modal */
  #composer {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: none;
    place-items: center;
    background: rgba(42,36,28,0.42);
    backdrop-filter: blur(4px);
    padding: 20px;
  }
  #composer.open { display: grid; }
  .composer-card {
    width: min(460px, 100%);
    background: var(--bg-elev);
    border-radius: 22px;
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    padding: 22px;
    position: relative;
    overflow: hidden;
  }
  .composer-card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: linear-gradient(90deg, var(--mark), var(--mark-active), var(--accent));
  }
  .composer-card h4 {
    margin: 0 0 10px;
    font-size: 16px;
    font-family: var(--font);
  }
  .composer-card .q {
    font-family: var(--font);
    font-size: 13px;
    color: var(--muted);
    background: #fff;
    border: 1px solid var(--line);
    border-left: 3px solid var(--mark-active);
    border-radius: 12px;
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
    border-radius: 14px;
    padding: 12px 14px;
    resize: vertical;
    outline: none;
    background: #fff;
    line-height: 1.55;
  }
  .composer-card textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }
  .composer-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
  }
  .composer-actions .primary { width: auto; margin: 0; padding: 10px 16px; }

  .blank {
    flex: 1;
    display: grid;
    place-items: center;
    color: var(--muted);
    padding: 48px 28px;
    text-align: center;
  }
  .blank > div {
    max-width: 360px;
    padding: 28px 24px;
    border-radius: 24px;
    background: rgba(255,253,249,0.7);
    border: 1px dashed #dccfbd;
    box-shadow: var(--shadow-sm);
  }
  .blank h3 {
    margin: 0 0 10px;
    color: var(--ink);
    font-family: var(--font);
    font-size: 22px;
  }
  .blank h3::before {
    content: "📖 ";
  }
  .blank p {
    margin: 0;
    line-height: 1.65;
    font-size: 14px;
  }
</style>
</head>
<body>
  <div id="login">
    <div class="login-card">
      <div class="login-title">
        <span class="login-icon" aria-hidden="true">📓</span>
        <h1 id="login-heading">${title}</h1>
      </div>

      <div id="step-pin">
        <div class="field">
          <label>暗号</label>
          <input id="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="对暗号啦" />
        </div>
        <button class="primary" id="pin-next-btn" type="button">下一步</button>
      </div>

      <div id="step-person" class="hidden">
        <div class="field">
          <label>当前空间</label>
          <div id="session-label">—</div>
        </div>
        <div class="field">
          <label>我是</label>
          <div class="person-pick">
            <button type="button" data-person="A" class="active-a" id="pick-a">${nameA}</button>
            <button type="button" data-person="B" id="pick-b">${nameB}</button>
          </div>
        </div>
        <button class="primary" id="login-btn" type="button">进入小本本</button>
        <button class="ghost" id="back-pin-btn" type="button" style="width:100%;margin-top:10px;padding:10px;">← 换一个暗号</button>
      </div>

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
          <p>点左上角菜单或「＋ 新的一页」，开始写下今天的故事。<br/>选中对方（或自己）的文字，即可添加批注。</p>
        </div>
      </div>
      <div id="workspace" class="workspace hidden">
        <div class="topic-bar" id="topic-bar">
          <h3>每日话题</h3>
          <div class="topic-head">
            <div class="topic-text empty-topic" id="topic-text">还没有话题，写一个今天一起聊的主题吧。</div>
            <textarea class="topic-edit hidden" id="topic-edit" placeholder="例如：今天最想对对方说的一句话是？" maxlength="500"></textarea>
          </div>
          <div class="topic-meta" id="topic-meta"></div>
          <div class="topic-actions">
            <button type="button" class="ghost" id="topic-edit-btn">设置话题</button>
            <button type="button" class="primary hidden" id="topic-save-btn" style="width:auto;margin:0;padding:8px 12px;box-shadow:none">保存话题</button>
            <button type="button" class="ghost hidden" id="topic-cancel-btn">取消</button>
          </div>
          <div class="topic-replies" id="topic-replies"></div>
          <div class="topic-compose">
            <textarea id="topic-reply-input" placeholder="写下你对这个话题的想法……" maxlength="2000"></textarea>
            <button type="button" class="primary" id="topic-reply-btn">回复</button>
          </div>
        </div>
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
              <div class="media-row" id="media-a"></div>
              <div class="media-tools hidden" id="media-tools-a">
                <label class="ghost">
                  📷 相册/拍照
                  <input type="file" id="file-a" accept="image/*" />
                </label>
                <button type="button" class="ghost" id="paste-a">📋 粘贴图片</button>
              </div>
              <div class="save-row hidden" id="save-row-a">
                <span class="status" id="status-a"></span>
                <button type="button" class="ghost" id="cancel-a">取消</button>
                <button type="button" class="primary" style="width:auto;margin:0;padding:8px 14px" id="save-a">保存</button>
              </div>
              <div class="hint" id="hint-a">选中文字可添加批注；可添加照片</div>
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
              <div class="media-row" id="media-b"></div>
              <div class="media-tools hidden" id="media-tools-b">
                <label class="ghost">
                  📷 相册/拍照
                  <input type="file" id="file-b" accept="image/*" />
                </label>
                <button type="button" class="ghost" id="paste-b">📋 粘贴图片</button>
              </div>
              <div class="save-row hidden" id="save-row-b">
                <span class="status" id="status-b"></span>
                <button type="button" class="ghost" id="cancel-b">取消</button>
                <button type="button" class="primary" style="width:auto;margin:0;padding:8px 14px" id="save-b">保存</button>
              </div>
              <div class="hint" id="hint-b">选中文字可添加批注；可添加照片</div>
            </div>
          </div>
        </div>
        <aside id="ann-panel">
          <h3>批注</h3>
          <div class="empty" id="ann-empty">选中任意一侧文字（含自己）添加批注；悬停高亮可预览内容。</div>
          <ul class="ann-list" id="ann-list"></ul>
        </aside>
      </div>
    </section>
  </div>

  <div id="sel-bar">
    <button type="button" id="sel-annotate">添加批注</button>
  </div>

  <div id="ann-tip" role="tooltip" aria-hidden="true">
    <div class="tip-meta" id="ann-tip-meta"></div>
    <div class="tip-quote" id="ann-tip-quote"></div>
    <div class="tip-content" id="ann-tip-content"></div>
    <div class="tip-arrow"></div>
  </div>

  <div id="lightbox" class="lightbox" aria-hidden="true">
    <img id="lightbox-img" alt="预览" />
  </div>

  <div id="confirm-mask" class="confirm-mask" aria-hidden="true">
    <div class="confirm-card">
      <h4 id="confirm-title">确认</h4>
      <p id="confirm-msg"></p>
      <div class="row">
        <button type="button" class="ghost" id="confirm-cancel">取消</button>
        <button type="button" class="primary danger-solid" id="confirm-ok">删除</button>
      </div>
    </div>
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
  /** @typedef {{ id:string, contentType:string, size:number, createdAt:string, author:PersonId }} MediaRef */
  /** @typedef {{ body:string, updatedAt:string|null, images?:MediaRef[] }} DiaryEntry */
  /** @typedef {{ id:string, author:PersonId, content:string, createdAt:string, updatedAt:string }} TopicReply */
  /** @typedef {{ text:string, setBy:PersonId|null, updatedAt:string|null }} PageTopic */
  /** @typedef {{ id:string, date:string, title:string, entries:{A:DiaryEntry,B:DiaryEntry}, annotations:Annotation[], topic?:PageTopic, topicReplies?:TopicReply[], createdAt:string, updatedAt:string }} Page */
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
    pendingPin: "",
    sessionName: "",
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
  const annTip = $("ann-tip");
  const annTipMeta = $("ann-tip-meta");
  const annTipQuote = $("ann-tip-quote");
  const annTipContent = $("ann-tip-content");
  const composer = $("composer");
  const composerText = /** @type {HTMLTextAreaElement} */ ($("composer-text"));
  const composerQuote = $("composer-quote");
  const titleInput = /** @type {HTMLInputElement} */ ($("title-input"));
  const dateInput = /** @type {HTMLInputElement} */ ($("date-input"));
  const pageTitleEl = $("page-title");
  const sidebar = $("sidebar");
  const backdrop = $("backdrop");
  let annTipHideTimer = /** @type {ReturnType<typeof setTimeout>|null} */ (null);

  const lightbox = $("lightbox");
  const lightboxImg = /** @type {HTMLImageElement} */ ($("lightbox-img"));
  const confirmMask = $("confirm-mask");
  let confirmResolver = /** @type {null | ((ok:boolean)=>void)} */ (null);
  let topicEditing = false;

  function askConfirm(title, message, okLabel) {
    return new Promise((resolve) => {
      $("confirm-title").textContent = title || "确认";
      $("confirm-msg").textContent = message || "";
      $("confirm-ok").textContent = okLabel || "删除";
      confirmResolver = resolve;
      confirmMask.classList.add("open");
      confirmMask.setAttribute("aria-hidden", "false");
    });
  }
  function closeConfirm(ok) {
    confirmMask.classList.remove("open");
    confirmMask.setAttribute("aria-hidden", "true");
    const r = confirmResolver;
    confirmResolver = null;
    if (r) r(!!ok);
  }
  $("confirm-cancel").addEventListener("click", () => closeConfirm(false));
  $("confirm-ok").addEventListener("click", () => closeConfirm(true));
  confirmMask.addEventListener("click", (e) => {
    if (e.target === confirmMask) closeConfirm(false);
  });

  function mediaUrl(id) {
    return "/api/media/" + encodeURIComponent(id);
  }

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.removeAttribute("src");
  }
  lightbox.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
      if (confirmMask.classList.contains("open")) closeConfirm(false);
    }
  });

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

  /* ---------- Auth (PIN → names → pick person) ---------- */
  $("pick-a").addEventListener("click", () => setPick("A"));
  $("pick-b").addEventListener("click", () => setPick("B"));
  function setPick(p) {
    state.pick = p;
    $("pick-a").classList.toggle("active-a", p === "A");
    $("pick-b").classList.toggle("active-b", p === "B");
  }

  function showPinStep() {
    $("step-pin").classList.remove("hidden");
    $("step-person").classList.add("hidden");
    loginErr.textContent = "";
    state.pendingPin = "";
    state.sessionName = "";
  }

  function showPersonStep(info) {
    state.names = info.names || state.names;
    state.title = info.title || state.title;
    state.sessionName = info.sessionName || "";
    $("pick-a").textContent = state.names.A;
    $("pick-b").textContent = state.names.B;
    $("session-label").textContent =
      state.sessionName || state.title || "共同日记本";
    $("login-heading").textContent = state.title || PAGE_TITLE;
    setPick(state.pick || "A");
    $("step-pin").classList.add("hidden");
    $("step-person").classList.remove("hidden");
    loginErr.textContent = "";
  }

  $("pin-next-btn").addEventListener("click", lookupPin);
  pinEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") lookupPin();
  });
  $("login-btn").addEventListener("click", doLogin);
  $("back-pin-btn").addEventListener("click", () => {
    showPinStep();
    pinEl.focus();
  });

  async function lookupPin() {
    loginErr.textContent = "";
    const pin = pinEl.value.trim();
    if (!pin) {
      loginErr.textContent = "请输入暗号";
      return;
    }
    const btn = /** @type {HTMLButtonElement} */ ($("pin-next-btn"));
    btn.disabled = true;
    try {
      const data = await api("/api/lookup-pin", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      state.pendingPin = pin;
      showPersonStep(data);
    } catch (e) {
      loginErr.textContent = e.message || "暗号不对哦";
    } finally {
      btn.disabled = false;
    }
  }

  async function doLogin() {
    loginErr.textContent = "";
    const pin = state.pendingPin || pinEl.value.trim();
    if (!pin) {
      loginErr.textContent = "请先输入暗号";
      showPinStep();
      return;
    }
    if (!state.pick) {
      loginErr.textContent = "请选择身份";
      return;
    }
    const btn = /** @type {HTMLButtonElement} */ ($("login-btn"));
    btn.disabled = true;
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ pin, person: state.pick }),
      });
      state.person = data.person;
      state.names = data.names || state.names;
      state.title = data.title || state.title;
      state.sessionName = data.sessionName || state.sessionName;
      enterApp();
    } catch (e) {
      loginErr.textContent = e.message || "登录失败";
      // PIN may have changed; go back to pin step
      if (e.status === 401) showPinStep();
    } finally {
      btn.disabled = false;
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
        state.sessionName = me.sessionName || "";
        enterApp();
        return;
      }
    } catch {}
    showPinStep();
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
    $("hint-a").textContent =
      mine === "A"
        ? "点「编辑」写日记；退出编辑后选中文字可批注（含自己）"
        : "选中文字可添加批注；悬停高亮可预览";
    $("hint-b").textContent =
      mine === "B"
        ? "点「编辑」写日记；退出编辑后选中文字可批注（含自己）"
        : "选中文字可添加批注；悬停高亮可预览";
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
    topicEditing = false;
    blank.classList.add("hidden");
    workspace.classList.remove("hidden");
    pageTitleEl.textContent = state.page.title || state.page.date;
    titleInput.classList.add("hidden");
    pageTitleEl.classList.remove("hidden");
    dateInput.value = state.page.date || "";
    renderPageList();
    renderDiaries();
    renderAnnotations();
    renderTopic();
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
    const ok = await askConfirm(
      "删除这一页？",
      "日记正文、图片、批注和话题讨论都会一起消失，且无法恢复。",
      "删除此页",
    );
    if (!ok) return;
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
      const entry = state.page.entries[p] || { body: "", updatedAt: null, images: [] };
      $("meta-" + p.toLowerCase()).textContent = "更新于 " + fmtTime(entry.updatedAt);
      const view = $("view-" + p.toLowerCase());
      const area = /** @type {HTMLTextAreaElement} */ ($("edit-area-" + p.toLowerCase()));
      const saveRow = $("save-row-" + p.toLowerCase());
      const tools = $("media-tools-" + p.toLowerCase());
      const isEditing = state.editing === p;
      view.classList.toggle("hidden", isEditing);
      area.classList.toggle("hidden", !isEditing);
      saveRow.classList.toggle("hidden", !isEditing);
      tools.classList.toggle("hidden", !(isEditing && state.person === p));
      if (isEditing) {
        area.value = entry.body || "";
      } else {
        view.innerHTML = renderHighlighted(entry.body || "", p);
        bindMarks(view);
      }
      renderMedia(p);
    }
  }

  function renderMedia(p) {
    const box = $("media-" + p.toLowerCase());
    box.innerHTML = "";
    if (!state.page) return;
    const images = (state.page.entries[p] && state.page.entries[p].images) || [];
    for (const img of images) {
      const wrap = document.createElement("div");
      wrap.className = "media-item" + (img.author === state.person ? " mine" : "");
      const el = document.createElement("img");
      el.src = mediaUrl(img.id);
      el.alt = "日记图片";
      el.loading = "lazy";
      el.addEventListener("click", () => openLightbox(mediaUrl(img.id)));
      wrap.appendChild(el);
      if (img.author === state.person) {
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "rm";
        rm.title = "删除图片";
        rm.textContent = "×";
        rm.addEventListener("click", async (e) => {
          e.stopPropagation();
          const ok = await askConfirm("删除这张图片？", "删除后无法恢复。", "删除图片");
          if (!ok || !state.page) return;
          try {
            const data = await api(
              "/api/pages/" + encodeURIComponent(state.page.id) + "/images/" + encodeURIComponent(img.id),
              { method: "DELETE" },
            );
            state.page = data.page;
            renderDiaries();
          } catch (err) {
            alert(err.message || "删除失败");
          }
        });
        wrap.appendChild(rm);
      }
      box.appendChild(wrap);
    }
  }

  async function uploadImageFile(p, file) {
    if (!state.page || state.person !== p || !file) return;
    if (!String(file.type || "").startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }
    const status = $("status-" + p.toLowerCase());
    status.textContent = "上传中…";
    try {
      const fd = new FormData();
      fd.append("file", file, file.name || "photo.jpg");
      fd.append("person", p);
      const res = await fetch(
        "/api/pages/" + encodeURIComponent(state.page.id) + "/images",
        { method: "POST", body: fd, credentials: "same-origin" },
      );
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
      if (!res.ok) throw new Error((data && data.error) || "上传失败");
      state.page = data.page;
      status.textContent = "";
      renderDiaries();
    } catch (e) {
      status.textContent = e.message || "上传失败";
      alert(e.message || "上传失败");
    }
  }

  async function pasteImageFromClipboard(p) {
    if (!state.page || state.person !== p) return;
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        alert("当前环境不支持读取剪贴板图片，请用「相册/拍照」选择。");
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        const file = new File([blob], "clipboard." + (type.split("/")[1] || "png"), { type });
        await uploadImageFile(p, file);
        return;
      }
      alert("剪贴板里没有图片。可先截图/复制图片后再试。");
    } catch (e) {
      alert((e && e.message) || "无法读取剪贴板，请改用相册选择。");
    }
  }

  for (const p of /** @type {PersonId[]} */ (["A", "B"])) {
    const fileInput = /** @type {HTMLInputElement} */ ($("file-" + p.toLowerCase()));
    fileInput.addEventListener("change", async () => {
      const f = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (f) await uploadImageFile(p, f);
    });
    $("paste-" + p.toLowerCase()).addEventListener("click", () => pasteImageFromClipboard(p));
    const area = /** @type {HTMLTextAreaElement} */ ($("edit-area-" + p.toLowerCase()));
    area.addEventListener("paste", async (e) => {
      if (state.editing !== p || state.person !== p) return;
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.type && it.type.startsWith("image/")) {
          e.preventDefault();
          const file = it.getAsFile();
          if (file) await uploadImageFile(p, file);
          return;
        }
      }
    });
  }

  /* ---------- Topic ---------- */
  function renderTopic() {
    if (!state.page) return;
    const topic = state.page.topic || { text: "", setBy: null, updatedAt: null };
    const textEl = $("topic-text");
    const editEl = /** @type {HTMLTextAreaElement} */ ($("topic-edit"));
    const meta = $("topic-meta");
    if (topicEditing) {
      textEl.classList.add("hidden");
      editEl.classList.remove("hidden");
      $("topic-edit-btn").classList.add("hidden");
      $("topic-save-btn").classList.remove("hidden");
      $("topic-cancel-btn").classList.remove("hidden");
      editEl.value = topic.text || "";
    } else {
      textEl.classList.remove("hidden");
      editEl.classList.add("hidden");
      $("topic-edit-btn").classList.remove("hidden");
      $("topic-save-btn").classList.add("hidden");
      $("topic-cancel-btn").classList.add("hidden");
      if (topic.text) {
        textEl.textContent = topic.text;
        textEl.classList.remove("empty-topic");
      } else {
        textEl.textContent = "还没有话题，写一个今天一起聊的主题吧。";
        textEl.classList.add("empty-topic");
      }
    }
    if (topic.text && topic.setBy) {
      meta.textContent = "由 " + nameOf(topic.setBy) + " 更新 · " + fmtTime(topic.updatedAt);
    } else {
      meta.textContent = "";
    }
    $("topic-edit-btn").textContent = topic.text ? "修改话题" : "设置话题";

    const box = $("topic-replies");
    box.innerHTML = "";
    const replies = (state.page.topicReplies || []).slice().sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || ""),
    );
    for (const r of replies) {
      const card = document.createElement("div");
      card.className = "topic-reply";
      const who = document.createElement("div");
      who.className = "who";
      who.textContent = nameOf(r.author);
      const body = document.createElement("div");
      body.className = "body";
      body.textContent = r.content || "";
      const foot = document.createElement("div");
      foot.className = "foot";
      const left = document.createElement("span");
      left.textContent = fmtTime(r.createdAt);
      foot.appendChild(left);
      if (r.author === state.person) {
        const actions = document.createElement("span");
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "删除";
        del.addEventListener("click", async () => {
          const ok = await askConfirm("删除这条回复？", "删除后无法恢复。", "删除回复");
          if (!ok || !state.page) return;
          try {
            const data = await api(
              "/api/pages/" + encodeURIComponent(state.page.id) + "/topic/replies/" + encodeURIComponent(r.id),
              { method: "DELETE" },
            );
            state.page = data.page;
            renderTopic();
          } catch (e) {
            alert(e.message || "删除失败");
          }
        });
        actions.appendChild(del);
        foot.appendChild(actions);
      }
      card.appendChild(who);
      card.appendChild(body);
      card.appendChild(foot);
      box.appendChild(card);
    }
  }

  $("topic-edit-btn").addEventListener("click", () => {
    topicEditing = true;
    renderTopic();
    $("topic-edit").focus();
  });
  $("topic-cancel-btn").addEventListener("click", () => {
    topicEditing = false;
    renderTopic();
  });
  $("topic-save-btn").addEventListener("click", async () => {
    if (!state.page) return;
    const text = /** @type {HTMLTextAreaElement} */ ($("topic-edit")).value;
    try {
      const data = await api(
        "/api/pages/" + encodeURIComponent(state.page.id) + "/topic",
        { method: "PUT", body: JSON.stringify({ text }) },
      );
      state.page = data.page;
      topicEditing = false;
      renderTopic();
    } catch (e) {
      alert(e.message || "保存话题失败");
    }
  });
  $("topic-reply-btn").addEventListener("click", async () => {
    if (!state.page) return;
    const input = /** @type {HTMLTextAreaElement} */ ($("topic-reply-input"));
    const content = input.value.trim();
    if (!content) { alert("请先写点什么"); return; }
    try {
      const data = await api(
        "/api/pages/" + encodeURIComponent(state.page.id) + "/topic/replies",
        { method: "POST", body: JSON.stringify({ content }) },
      );
      state.page = data.page;
      input.value = "";
      renderTopic();
    } catch (e) {
      alert(e.message || "发送失败");
    }
  });

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
      ranges.push({
        start,
        end,
        id: a.id,
        mine: a.author === state.person,
        selfNote: a.author === a.target,
      });
      cursor = end;
    }

    let html = "";
    let i = 0;
    for (const r of ranges) {
      if (i < r.start) html += escapeHtml(text.slice(i, r.start));
      const cls =
        "ann-mark" +
        (r.id === state.activeAnnId ? " active" : "") +
        (r.mine ? " mine" : "") +
        (r.selfNote ? " self-note" : "");
      html +=
        '<mark class="' +
        cls +
        '" data-ann="' +
        escapeAttr(r.id) +
        '" title="">' +
        escapeHtml(text.slice(r.start, r.end)) +
        "</mark>";
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
        hideAnnTip();
        focusAnnotation(id);
      });
      el.addEventListener("mouseenter", () => {
        const id = el.getAttribute("data-ann");
        if (id) showAnnTip(el, id);
      });
      el.addEventListener("mouseleave", () => scheduleHideAnnTip());
      el.addEventListener("focus", () => {
        const id = el.getAttribute("data-ann");
        if (id) showAnnTip(el, id);
      });
      el.addEventListener("blur", () => scheduleHideAnnTip());
      // keyboard / a11y
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
    });
  }

  function findAnnotation(id) {
    return (state.page?.annotations || []).find((a) => a.id === id) || null;
  }

  function showAnnTip(anchor, annId) {
    if (annTipHideTimer) {
      clearTimeout(annTipHideTimer);
      annTipHideTimer = null;
    }
    const ann = findAnnotation(annId);
    if (!ann) {
      hideAnnTip();
      return;
    }
    const selfNote = ann.author === ann.target;
    annTipMeta.textContent =
      nameOf(ann.author) +
      (selfNote ? " · 自注" : " · 批 " + nameOf(ann.target)) +
      " · " +
      fmtTime(ann.createdAt);
    if (ann.quote) {
      annTipQuote.textContent = "「" + ann.quote + "」";
      annTipQuote.classList.remove("hidden");
    } else {
      annTipQuote.textContent = "";
      annTipQuote.classList.add("hidden");
    }
    annTipContent.textContent = ann.content || "";
    annTip.classList.add("visible");
    annTip.setAttribute("aria-hidden", "false");

    const rect = anchor.getBoundingClientRect();
    const tipW = Math.min(320, window.innerWidth - 24);
    let left = rect.left + rect.width / 2;
    left = Math.max(12 + tipW / 2, Math.min(left, window.innerWidth - 12 - tipW / 2));
    let top = rect.top - 10;
    // if too close to top, flip below
    const flip = top < 80;
    if (flip) {
      annTip.style.transform = "translate(-50%, 0) translateY(10px)";
      top = rect.bottom + 10;
      annTip.querySelector(".tip-arrow")?.setAttribute(
        "style",
        "top:-6px;bottom:auto;left:50%;transform:translateX(-50%) rotate(45deg);",
      );
    } else {
      annTip.style.transform = "translate(-50%, -100%) translateY(-10px)";
      annTip.querySelector(".tip-arrow")?.setAttribute(
        "style",
        "bottom:-6px;top:auto;left:50%;transform:translateX(-50%) rotate(45deg);",
      );
    }
    annTip.style.left = left + "px";
    annTip.style.top = top + "px";
  }

  function scheduleHideAnnTip() {
    if (annTipHideTimer) clearTimeout(annTipHideTimer);
    annTipHideTimer = setTimeout(() => hideAnnTip(), 80);
  }

  function hideAnnTip() {
    if (annTipHideTimer) {
      clearTimeout(annTipHideTimer);
      annTipHideTimer = null;
    }
    annTip.classList.remove("visible");
    annTip.setAttribute("aria-hidden", "true");
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
      renderTopic();
    } catch (e) {
      status.textContent = e.message || "保存失败";
    }
  }

  /* ---------- Selection → annotation ---------- */
  document.addEventListener("mouseup", onSelectionChange);
  document.addEventListener("keyup", onSelectionChange);
  document.addEventListener("scroll", () => {
    hideSelBar();
    hideAnnTip();
  }, true);
  window.addEventListener("resize", () => {
    hideSelBar();
    hideAnnTip();
  });

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
    // A/B 两侧均可批注，包括给自己（target 可等于当前身份）
    const target = /** @type {PersonId} */ (view.getAttribute("data-target"));
    const offsets = rangeToOffsets(view, range);
    if (!offsets || offsets.end <= offsets.start) { hideSelBar(); return; }
    const quote = (view.textContent || "").slice(offsets.start, offsets.end);
    if (!quote.trim()) { hideSelBar(); return; }
    hideAnnTip();
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
    hideAnnTip();
    if (mode === "create") {
      if (!state.selection) return;
      editingAnnId = null;
      const selfNote = state.selection.target === state.person;
      $("composer-title").textContent = selfNote ? "添加批注（给自己）" : "添加批注";
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
        nameOf(a.author) +
        (a.author === a.target ? " · 自注" : " · 批 " + nameOf(a.target)) +
        " · " +
        fmtTime(a.createdAt);
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
          const ok = await askConfirm("删除这条批注？", "删除后无法恢复。", "删除批注");
          if (!ok) return;
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
  // Close drawer after choosing a page / creating a page on small screens
  pageList.addEventListener("click", (e) => {
    if (window.matchMedia("(max-width: 860px)").matches) {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.closest("button")) closeMobileSidebar();
    }
  });
  $("new-page").addEventListener("click", () => {
    // existing handler runs too; just close drawer after
    if (window.matchMedia("(max-width: 860px)").matches) {
      setTimeout(closeMobileSidebar, 0);
    }
  }, true);

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
