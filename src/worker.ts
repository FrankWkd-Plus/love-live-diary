import type { Annotation, Env, PersonId, SessionPayload } from "./types";
import { randomId, signSession, verifySession } from "./crypto";
import {
  createPage,
  deletePage,
  getPage,
  listPages,
  savePage,
} from "./store";
import { appHtml } from "./ui";

const COOKIE = "diary_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Internal error";
      return json({ error: message }, 500);
    }
  },
};

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === "GET" && (path === "/" || path === "/index.html")) {
    return html(appHtml(env));
  }

  if (method === "GET" && path === "/api/health") {
    return json({ ok: true });
  }

  if (method === "POST" && path === "/api/login") {
    return login(request, env);
  }
  if (method === "POST" && path === "/api/logout") {
    return logout(request);
  }
  if (method === "GET" && path === "/api/me") {
    const session = await readSession(request, env);
    if (!session) return json({ authenticated: false });
    return json({
      authenticated: true,
      person: session.person,
      names: { A: env.PERSON_A, B: env.PERSON_B },
      title: env.PAGE_TITLE,
    });
  }

  const session = await readSession(request, env);
  if (!session) return json({ error: "未登录" }, 401);

  if (method === "GET" && path === "/api/pages") {
    const pages = await listPages(env);
    return json({ pages });
  }

  if (method === "POST" && path === "/api/pages") {
    const body = await safeJson(request);
    const page = await createPage(env, {
      date: typeof body.date === "string" ? body.date : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
    });
    return json({ page }, 201);
  }

  const pageMatch = path.match(/^\/api\/pages\/([^/]+)(.*)$/);
  if (pageMatch) {
    const pageId = decodeURIComponent(pageMatch[1]!);
    const rest = pageMatch[2] || "";

    if (method === "GET" && rest === "") {
      const page = await getPage(env, pageId);
      if (!page) return json({ error: "页面不存在" }, 404);
      return json({ page });
    }

    if (method === "DELETE" && rest === "") {
      const ok = await deletePage(env, pageId);
      if (!ok) return json({ error: "页面不存在" }, 404);
      return json({ ok: true });
    }

    if (method === "PATCH" && rest === "") {
      return patchPage(request, env, pageId);
    }

    if (method === "PUT" && rest === "/entry") {
      return putEntry(request, env, pageId, session.person);
    }

    if (method === "POST" && rest === "/annotations") {
      return addAnnotation(request, env, pageId, session.person);
    }

    const annMatch = rest.match(/^\/annotations\/([^/]+)$/);
    if (annMatch) {
      const annId = decodeURIComponent(annMatch[1]!);
      if (method === "PATCH") {
        return patchAnnotation(request, env, pageId, annId, session.person);
      }
      if (method === "DELETE") {
        return removeAnnotation(env, pageId, annId, session.person);
      }
    }
  }

  return json({ error: "Not found" }, 404);
}

/* ---------- Auth ---------- */

async function login(request: Request, env: Env): Promise<Response> {
  const body = await safeJson(request);
  const pin = String(body.pin ?? "");
  const person: PersonId | null =
    body.person === "B" ? "B" : body.person === "A" ? "A" : null;

  if (!person) return json({ error: "请选择身份（A 或 B）" }, 400);
  if (pin !== env.DIARY_PIN) return json({ error: "PIN 不正确" }, 401);

  const exp = Date.now() + SESSION_TTL_MS;
  const token = await signSession(
    { ok: true, person, exp } satisfies SessionPayload,
    env.SESSION_SECRET,
  );

  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    cookieHeader(token, request, Math.floor(SESSION_TTL_MS / 1000)),
  );
  return new Response(
    JSON.stringify({
      ok: true,
      person,
      names: { A: env.PERSON_A, B: env.PERSON_B },
      title: env.PAGE_TITLE,
    }),
    { status: 200, headers },
  );
}

function logout(request: Request): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", cookieHeader("", request, 0));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

function cookieHeader(token: string, request: Request, maxAge: number): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  if (!token) {
    return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  }
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function readSession(
  request: Request,
  env: Env,
): Promise<SessionPayload | null> {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return null;
  const payload = await verifySession<SessionPayload>(
    match[1]!,
    env.SESSION_SECRET,
  );
  if (!payload || !payload.ok) return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  if (payload.person !== "A" && payload.person !== "B") return null;
  return payload;
}

/* ---------- Page mutations ---------- */

async function putEntry(
  request: Request,
  env: Env,
  pageId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);

  const body = await safeJson(request);
  const target: PersonId =
    body.person === "A" || body.person === "B" ? body.person : person;
  if (target !== person) {
    return json({ error: "只能编辑自己的日记" }, 403);
  }
  if (typeof body.body !== "string") {
    return json({ error: "缺少 body" }, 400);
  }

  page.entries[target] = {
    body: body.body,
    updatedAt: new Date().toISOString(),
  };
  const saved = await savePage(env, page);
  return json({ page: saved });
}

async function patchPage(
  request: Request,
  env: Env,
  pageId: string,
): Promise<Response> {
  const page = await getPage(env, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const body = await safeJson(request);
  if (typeof body.title === "string" && body.title.trim()) {
    page.title = body.title.trim();
  }
  if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    page.date = body.date;
  }
  const saved = await savePage(env, page);
  return json({ page: saved });
}

async function addAnnotation(
  request: Request,
  env: Env,
  pageId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);

  const body = await safeJson(request);
  const target: PersonId | null =
    body.target === "A" || body.target === "B" ? body.target : null;
  if (!target) return json({ error: "缺少 target（被批注的日记方）" }, 400);

  const start = Number(body.start);
  const end = Number(body.end);
  const content = String(body.content ?? "").trim();
  const quote = String(body.quote ?? "");

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start
  ) {
    return json({ error: "无效的选区" }, 400);
  }
  if (!content) return json({ error: "批注内容不能为空" }, 400);

  // Soft-clamp to body length if body exists
  const text = page.entries[target]?.body ?? "";
  const clampedStart = Math.min(start, text.length);
  const clampedEnd = Math.min(end, text.length);
  if (clampedEnd <= clampedStart) {
    return json({ error: "选区已超出正文范围，请重新选择" }, 400);
  }

  const now = new Date().toISOString();
  const ann: Annotation = {
    id: randomId("ann"),
    author: person,
    target,
    start: clampedStart,
    end: clampedEnd,
    quote: quote || text.slice(clampedStart, clampedEnd),
    content,
    createdAt: now,
    updatedAt: now,
  };

  page.annotations.push(ann);
  const saved = await savePage(env, page);
  return json({ page: saved, annotation: ann }, 201);
}

async function patchAnnotation(
  request: Request,
  env: Env,
  pageId: string,
  annId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const idx = page.annotations.findIndex((a) => a.id === annId);
  if (idx < 0) return json({ error: "批注不存在" }, 404);
  const ann = page.annotations[idx]!;
  if (ann.author !== person) return json({ error: "只能编辑自己的批注" }, 403);

  const body = await safeJson(request);
  if (typeof body.content === "string") {
    const content = body.content.trim();
    if (!content) return json({ error: "批注内容不能为空" }, 400);
    ann.content = content;
    ann.updatedAt = new Date().toISOString();
  }
  page.annotations[idx] = ann;
  const saved = await savePage(env, page);
  return json({ page: saved, annotation: ann });
}

async function removeAnnotation(
  env: Env,
  pageId: string,
  annId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const ann = page.annotations.find((a) => a.id === annId);
  if (!ann) return json({ error: "批注不存在" }, 404);
  if (ann.author !== person) return json({ error: "只能删除自己的批注" }, 403);

  page.annotations = page.annotations.filter((a) => a.id !== annId);
  const saved = await savePage(env, page);
  return json({ page: saved });
}

/* ---------- Helpers ---------- */

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function html(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    if (data && typeof data === "object") return data as Record<string, unknown>;
  } catch {
    /* empty */
  }
  return {};
}
