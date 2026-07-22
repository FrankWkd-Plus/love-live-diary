import type {
  AdminSessionPayload,
  Annotation,
  Env,
  MediaRef,
  PersonId,
  SessionPayload,
  TopicReply,
} from "./types";
import { randomId, signSession, verifySession } from "./crypto";
import {
  createPage,
  createSession,
  defaultConfig,
  deleteMedia,
  deletePage,
  deleteSession,
  findSessionByPin,
  getMediaObject,
  getPage,
  getSession,
  listPages,
  listSessions,
  putMedia,
  savePage,
  sessionToConfig,
  StoreError,
  updateSession,
} from "./store";
import { adminHtml } from "./admin";
import { appHtml } from "./ui";

const COOKIE = "diary_session";
const ADMIN_COOKIE = "diary_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const ADMIN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (err) {
      if (err instanceof StoreError) {
        return json({ error: err.message }, err.status);
      }
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
  const shell = defaultConfig(env);

  if (method === "GET" && (path === "/" || path === "/index.html")) {
    return html(appHtml(shell));
  }

  if (method === "GET" && (path === "/admin" || path === "/admin/")) {
    return html(adminHtml(shell));
  }

  if (method === "GET" && path === "/api/health") {
    return json({ ok: true });
  }

  /* ---------- User auth ---------- */
  if (method === "POST" && path === "/api/lookup-pin") {
    return lookupPin(request, env);
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
    const space = await getSession(env, session.sessionId);
    if (!space) return json({ authenticated: false });
    const cfg = sessionToConfig(space);
    return json({
      authenticated: true,
      person: session.person,
      sessionId: session.sessionId,
      sessionName: space.name,
      names: { A: cfg.personA, B: cfg.personB },
      title: cfg.pageTitle,
    });
  }

  /* ---------- Admin auth & APIs (before user session gate) ---------- */
  if (path.startsWith("/api/admin")) {
    return handleAdmin(request, env, path, method);
  }

  const session = await readSession(request, env);
  if (!session) return json({ error: "未登录" }, 401);

  const sessionId = session.sessionId;

  if (method === "GET" && path === "/api/pages") {
    const pages = await listPages(env, sessionId);
    return json({ pages });
  }

  if (method === "POST" && path === "/api/pages") {
    const body = await safeJson(request);
    const page = await createPage(env, sessionId, {
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
      const page = await getPage(env, sessionId, pageId);
      if (!page) return json({ error: "页面不存在" }, 404);
      return json({ page });
    }

    if (method === "DELETE" && rest === "") {
      const ok = await deletePage(env, sessionId, pageId);
      if (!ok) return json({ error: "页面不存在" }, 404);
      return json({ ok: true });
    }

    if (method === "PATCH" && rest === "") {
      return patchPage(request, env, sessionId, pageId);
    }

    if (method === "PUT" && rest === "/entry") {
      return putEntry(request, env, sessionId, pageId, session.person);
    }

    if (method === "PUT" && rest === "/topic") {
      return putTopic(request, env, sessionId, pageId, session.person);
    }

    if (method === "POST" && rest === "/topic/replies") {
      return addTopicReply(request, env, sessionId, pageId, session.person);
    }

    const topicReplyMatch = rest.match(/^\/topic\/replies\/([^/]+)$/);
    if (topicReplyMatch) {
      const replyId = decodeURIComponent(topicReplyMatch[1]!);
      if (method === "PATCH") {
        return patchTopicReply(
          request,
          env,
          sessionId,
          pageId,
          replyId,
          session.person,
        );
      }
      if (method === "DELETE") {
        return removeTopicReply(
          env,
          sessionId,
          pageId,
          replyId,
          session.person,
        );
      }
    }

    if (method === "POST" && rest === "/images") {
      return uploadPageImage(request, env, sessionId, pageId, session.person);
    }

    const imageMatch = rest.match(/^\/images\/([^/]+)$/);
    if (imageMatch) {
      const imageId = decodeURIComponent(imageMatch[1]!);
      if (method === "DELETE") {
        return removePageImage(
          env,
          sessionId,
          pageId,
          imageId,
          session.person,
        );
      }
    }

    if (method === "POST" && rest === "/annotations") {
      return addAnnotation(request, env, sessionId, pageId, session.person);
    }

    const annMatch = rest.match(/^\/annotations\/([^/]+)$/);
    if (annMatch) {
      const annId = decodeURIComponent(annMatch[1]!);
      if (method === "PATCH") {
        return patchAnnotation(
          request,
          env,
          sessionId,
          pageId,
          annId,
          session.person,
        );
      }
      if (method === "DELETE") {
        return removeAnnotation(env, sessionId, pageId, annId, session.person);
      }
    }
  }

  // Media binary: GET /api/media/:id (auth required, session-scoped)
  const mediaMatch = path.match(/^\/api\/media\/([^/]+)$/);
  if (mediaMatch && method === "GET") {
    return serveMedia(env, sessionId, decodeURIComponent(mediaMatch[1]!));
  }

  return json({ error: "Not found" }, 404);
}

/* ---------- Admin ---------- */

async function handleAdmin(
  request: Request,
  env: Env,
  path: string,
  method: string,
): Promise<Response> {
  if (method === "POST" && path === "/api/admin/login") {
    return adminLogin(request, env);
  }
  if (method === "POST" && path === "/api/admin/logout") {
    return adminLogout(request);
  }
  if (method === "GET" && path === "/api/admin/me") {
    const admin = await readAdminSession(request, env);
    if (!admin) return json({ authenticated: false });
    return json({ authenticated: true, role: "admin" });
  }

  const admin = await readAdminSession(request, env);
  if (!admin) return json({ error: "管理员未登录" }, 401);

  if (method === "GET" && path === "/api/admin/sessions") {
    const sessions = await listSessions(env);
    return json({ sessions });
  }

  if (method === "POST" && path === "/api/admin/sessions") {
    const body = await safeJson(request);
    const session = await createSession(env, {
      name: typeof body.name === "string" ? body.name : "",
      pin: typeof body.pin === "string" ? body.pin : "",
      personA: typeof body.personA === "string" ? body.personA : undefined,
      personB: typeof body.personB === "string" ? body.personB : undefined,
      pageTitle: typeof body.pageTitle === "string" ? body.pageTitle : undefined,
    });
    return json({ session }, 201);
  }

  const sessionMatch = path.match(
    /^\/api\/admin\/sessions\/([^/]+)(?:\/(pages)(?:\/([^/]+))?)?$/,
  );
  if (sessionMatch) {
    const sessionId = decodeURIComponent(sessionMatch[1]!);
    const section = sessionMatch[2]; // "pages" | undefined
    const pageId = sessionMatch[3]
      ? decodeURIComponent(sessionMatch[3])
      : null;

    if (!section) {
      if (method === "GET") {
        const session = await getSession(env, sessionId);
        if (!session) return json({ error: "会话不存在" }, 404);
        return json({ session });
      }
      if (method === "PUT") {
        const body = await safeJson(request);
        const session = await updateSession(env, sessionId, {
          name: typeof body.name === "string" ? body.name : undefined,
          pin: typeof body.pin === "string" ? body.pin : undefined,
          personA: typeof body.personA === "string" ? body.personA : undefined,
          personB: typeof body.personB === "string" ? body.personB : undefined,
          pageTitle:
            typeof body.pageTitle === "string" ? body.pageTitle : undefined,
        });
        return json({ session });
      }
      if (method === "DELETE") {
        const ok = await deleteSession(env, sessionId);
        if (!ok) return json({ error: "会话不存在" }, 404);
        return json({ ok: true });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    // pages
    if (section === "pages" && !pageId) {
      if (method === "GET") {
        const session = await getSession(env, sessionId);
        if (!session) return json({ error: "会话不存在" }, 404);
        const pages = await listPages(env, sessionId);
        return json({ pages, session });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (section === "pages" && pageId) {
      if (method === "GET") {
        const page = await getPage(env, sessionId, pageId);
        if (!page) return json({ error: "页面不存在" }, 404);
        return json({ page });
      }
      if (method === "DELETE") {
        const ok = await deletePage(env, sessionId, pageId);
        if (!ok) return json({ error: "页面不存在" }, 404);
        return json({ ok: true });
      }
      if (method === "PUT") {
        return adminUpdatePage(request, env, sessionId, pageId);
      }
      return json({ error: "Method not allowed" }, 405);
    }
  }

  return json({ error: "Not found" }, 404);
}

async function adminLogin(request: Request, env: Env): Promise<Response> {
  const body = await safeJson(request);
  const password = String(body.password ?? "");
  const expected = env.ADMIN_PASSWORD || "Frank1202";
  if (!password || password !== expected) {
    return json({ error: "管理员密码不正确" }, 401);
  }
  const exp = Date.now() + ADMIN_TTL_MS;
  const token = await signSession(
    { ok: true, role: "admin", exp } satisfies AdminSessionPayload,
    env.SESSION_SECRET,
  );
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    cookieHeader(ADMIN_COOKIE, token, request, Math.floor(ADMIN_TTL_MS / 1000)),
  );
  return new Response(JSON.stringify({ ok: true, role: "admin" }), {
    status: 200,
    headers,
  });
}

function adminLogout(request: Request): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", cookieHeader(ADMIN_COOKIE, "", request, 0));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

async function readAdminSession(
  request: Request,
  env: Env,
): Promise<AdminSessionPayload | null> {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  if (!match) return null;
  const payload = await verifySession<AdminSessionPayload>(
    match[1]!,
    env.SESSION_SECRET,
  );
  if (!payload || !payload.ok || payload.role !== "admin") return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}

async function adminUpdatePage(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const body = await safeJson(request);

  if (typeof body.title === "string" && body.title.trim()) {
    page.title = body.title.trim();
  }
  if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    page.date = body.date;
  }
  if (body.entries && typeof body.entries === "object") {
    const entries = body.entries as Record<string, unknown>;
    for (const p of ["A", "B"] as const) {
      const e = entries[p];
      if (e && typeof e === "object") {
        const ent = e as Record<string, unknown>;
        if (typeof ent.body === "string") {
          page.entries[p] = {
            body: ent.body,
            updatedAt: new Date().toISOString(),
            images: page.entries[p]?.images || [],
          };
        }
      }
    }
  }
  if (Array.isArray(body.annotations)) {
    page.annotations = body.annotations as Annotation[];
  }

  const saved = await savePage(env, sessionId, page);
  return json({ page: saved });
}

/* ---------- User auth ---------- */

async function lookupPin(request: Request, env: Env): Promise<Response> {
  const body = await safeJson(request);
  const pin = String(body.pin ?? "").trim();
  if (!pin) return json({ error: "请输入 PIN" }, 400);

  const space = await findSessionByPin(env, pin);
  if (!space) return json({ error: "PIN 不正确" }, 401);

  const cfg = sessionToConfig(space);
  return json({
    ok: true,
    sessionName: space.name,
    names: { A: cfg.personA, B: cfg.personB },
    title: cfg.pageTitle,
  });
}

async function login(request: Request, env: Env): Promise<Response> {
  const body = await safeJson(request);
  const pin = String(body.pin ?? "");
  const person: PersonId | null =
    body.person === "B" ? "B" : body.person === "A" ? "A" : null;

  if (!person) return json({ error: "请选择身份（A 或 B）" }, 400);

  const space = await findSessionByPin(env, pin);
  if (!space) return json({ error: "PIN 不正确" }, 401);

  const exp = Date.now() + SESSION_TTL_MS;
  const token = await signSession(
    {
      ok: true,
      sessionId: space.id,
      person,
      exp,
    } satisfies SessionPayload,
    env.SESSION_SECRET,
  );

  const cfg = sessionToConfig(space);
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    cookieHeader(COOKIE, token, request, Math.floor(SESSION_TTL_MS / 1000)),
  );
  return new Response(
    JSON.stringify({
      ok: true,
      person,
      sessionId: space.id,
      sessionName: space.name,
      names: { A: cfg.personA, B: cfg.personB },
      title: cfg.pageTitle,
    }),
    { status: 200, headers },
  );
}

function logout(request: Request): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", cookieHeader(COOKIE, "", request, 0));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

function cookieHeader(
  name: string,
  token: string,
  request: Request,
  maxAge: number,
): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  if (!token) {
    return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  }
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
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
  if (typeof payload.sessionId !== "string" || !payload.sessionId) return null;
  return payload;
}

/* ---------- Page mutations ---------- */

async function putEntry(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
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

  const prev = page.entries[target];
  page.entries[target] = {
    body: body.body,
    updatedAt: new Date().toISOString(),
    images: prev?.images || [],
  };
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved });
}

async function putTopic(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const body = await safeJson(request);
  if (typeof body.text !== "string") {
    return json({ error: "缺少 text" }, 400);
  }
  const text = body.text.trim();
  if (text.length > 500) {
    return json({ error: "话题最多 500 字" }, 400);
  }
  page.topic = {
    text,
    setBy: text ? person : null,
    updatedAt: text ? new Date().toISOString() : null,
  };
  // Clearing topic does not wipe replies unless client asks
  if (body.clearReplies === true) {
    page.topicReplies = [];
  }
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved });
}

async function addTopicReply(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const body = await safeJson(request);
  const content = String(body.content ?? "").trim();
  if (!content) return json({ error: "回复不能为空" }, 400);
  if (content.length > 2000) return json({ error: "回复最多 2000 字" }, 400);
  if (!page.topic?.text) {
    return json({ error: "请先设置今日话题" }, 400);
  }

  const now = new Date().toISOString();
  const reply: TopicReply = {
    id: randomId("tr"),
    author: person,
    content,
    createdAt: now,
    updatedAt: now,
  };
  page.topicReplies = page.topicReplies || [];
  page.topicReplies.push(reply);
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved, reply }, 201);
}

async function patchTopicReply(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
  replyId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const replies = page.topicReplies || [];
  const idx = replies.findIndex((r) => r.id === replyId);
  if (idx < 0) return json({ error: "回复不存在" }, 404);
  const reply = replies[idx]!;
  if (reply.author !== person) {
    return json({ error: "只能编辑自己的回复" }, 403);
  }
  const body = await safeJson(request);
  if (typeof body.content === "string") {
    const content = body.content.trim();
    if (!content) return json({ error: "回复不能为空" }, 400);
    if (content.length > 2000) return json({ error: "回复最多 2000 字" }, 400);
    reply.content = content;
    reply.updatedAt = new Date().toISOString();
  }
  replies[idx] = reply;
  page.topicReplies = replies;
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved, reply });
}

async function removeTopicReply(
  env: Env,
  sessionId: string,
  pageId: string,
  replyId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const replies = page.topicReplies || [];
  const reply = replies.find((r) => r.id === replyId);
  if (!reply) return json({ error: "回复不存在" }, 404);
  if (reply.author !== person) {
    return json({ error: "只能删除自己的回复" }, 403);
  }
  page.topicReplies = replies.filter((r) => r.id !== replyId);
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved });
}

async function uploadPageImage(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);

  const contentTypeHeader = request.headers.get("content-type") || "";
  let bytes: ArrayBuffer;
  let contentType = "application/octet-stream";
  let target: PersonId = person;

  if (contentTypeHeader.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    // Workers runtime may type FormDataEntryValue without DOM File; duck-type it.
    if (
      !file ||
      typeof file !== "object" ||
      typeof (file as Blob).arrayBuffer !== "function"
    ) {
      return json({ error: "请选择图片文件（字段名 file）" }, 400);
    }
    const blob = file as Blob & { name?: string; type?: string };
    contentType = blob.type || "application/octet-stream";
    bytes = await blob.arrayBuffer();
    const t = form.get("person");
    if (t === "A" || t === "B") target = t;
  } else {
    // raw binary body with Content-Type: image/*
    contentType = contentTypeHeader.split(";")[0]!.trim() || "application/octet-stream";
    bytes = await request.arrayBuffer();
    const url = new URL(request.url);
    const t = url.searchParams.get("person");
    if (t === "A" || t === "B") target = t;
  }

  if (target !== person) {
    return json({ error: "只能给自己的日记加图" }, 403);
  }

  const images = page.entries[target].images || [];
  if (images.length >= 12) {
    return json({ error: "每侧最多 12 张图片" }, 400);
  }

  let media: MediaRef;
  try {
    media = await putMedia(env, sessionId, {
      bytes,
      contentType,
      author: person,
    });
  } catch (err) {
    if (err instanceof StoreError) {
      return json({ error: err.message }, err.status);
    }
    throw err;
  }

  images.push(media);
  page.entries[target] = {
    ...page.entries[target],
    images,
    updatedAt: new Date().toISOString(),
  };
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved, image: media }, 201);
}

async function removePageImage(
  env: Env,
  sessionId: string,
  pageId: string,
  imageId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);

  let foundOn: PersonId | null = null;
  for (const p of ["A", "B"] as const) {
    if ((page.entries[p].images || []).some((img) => img.id === imageId)) {
      foundOn = p;
      break;
    }
  }
  if (!foundOn) return json({ error: "图片不存在" }, 404);
  if (foundOn !== person) {
    return json({ error: "只能删除自己日记里的图片" }, 403);
  }

  page.entries[foundOn] = {
    ...page.entries[foundOn],
    images: (page.entries[foundOn].images || []).filter((img) => img.id !== imageId),
    updatedAt: new Date().toISOString(),
  };
  await deleteMedia(env, sessionId, imageId);
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved });
}

async function serveMedia(
  env: Env,
  sessionId: string,
  mediaId: string,
): Promise<Response> {
  const obj = await getMediaObject(env, sessionId, mediaId);
  if (!obj) return json({ error: "图片不存在" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(obj.body, { status: 200, headers });
}

async function patchPage(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const body = await safeJson(request);
  if (typeof body.title === "string" && body.title.trim()) {
    page.title = body.title.trim();
  }
  if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    page.date = body.date;
  }
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved });
}

async function addAnnotation(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
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
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved, annotation: ann }, 201);
}

async function patchAnnotation(
  request: Request,
  env: Env,
  sessionId: string,
  pageId: string,
  annId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
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
  const saved = await savePage(env, sessionId, page);
  return json({ page: saved, annotation: ann });
}

async function removeAnnotation(
  env: Env,
  sessionId: string,
  pageId: string,
  annId: string,
  person: PersonId,
): Promise<Response> {
  const page = await getPage(env, sessionId, pageId);
  if (!page) return json({ error: "页面不存在" }, 404);
  const ann = page.annotations.find((a) => a.id === annId);
  if (!ann) return json({ error: "批注不存在" }, 404);
  if (ann.author !== person) return json({ error: "只能删除自己的批注" }, 403);

  page.annotations = page.annotations.filter((a) => a.id !== annId);
  const saved = await savePage(env, sessionId, page);
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

