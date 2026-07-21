import type {
  DiaryMeta,
  Env,
  Page,
  ResolvedConfig,
  SessionRegistry,
  SessionSummary,
} from "./types";
import { randomId } from "./crypto";

const REGISTRY_KEY = "sessions.json";

const sessionMetaKey = (sessionId: string) => `sessions/${sessionId}/meta.json`;
const sessionPageKey = (sessionId: string, pageId: string) =>
  `sessions/${sessionId}/pages/${pageId}.json`;
const sessionPrefix = (sessionId: string) => `sessions/${sessionId}/`;

function emptyMeta(): DiaryMeta {
  return { pages: [], updatedAt: new Date().toISOString() };
}

function emptyEntry() {
  return { body: "", updatedAt: null as string | null };
}

function emptyRegistry(): SessionRegistry {
  return { sessions: [], updatedAt: new Date().toISOString() };
}

/* ---------- Session registry ---------- */

export async function getRegistry(env: Env): Promise<SessionRegistry> {
  const obj = await env.DIARY_BUCKET.get(REGISTRY_KEY);
  if (!obj) return emptyRegistry();
  try {
    const data = (await obj.json()) as SessionRegistry;
    if (!data || !Array.isArray(data.sessions)) return emptyRegistry();
    return data;
  } catch {
    return emptyRegistry();
  }
}

async function putRegistry(env: Env, reg: SessionRegistry): Promise<void> {
  reg.updatedAt = new Date().toISOString();
  await env.DIARY_BUCKET.put(REGISTRY_KEY, JSON.stringify(reg, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}

export async function listSessions(env: Env): Promise<SessionSummary[]> {
  const reg = await getRegistry(env);
  return [...reg.sessions].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getSession(
  env: Env,
  sessionId: string,
): Promise<SessionSummary | null> {
  const reg = await getRegistry(env);
  return reg.sessions.find((s) => s.id === sessionId) ?? null;
}

export async function findSessionByPin(
  env: Env,
  pin: string,
): Promise<SessionSummary | null> {
  const trimmed = pin.trim();
  if (!trimmed) return null;
  const reg = await getRegistry(env);
  return reg.sessions.find((s) => s.pin === trimmed) ?? null;
}

export class StoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface SessionInput {
  name: string;
  pin: string;
  personA: string;
  personB: string;
  pageTitle: string;
}

function normalizeSessionInput(input: Partial<SessionInput>): SessionInput {
  const name = String(input.name ?? "").trim();
  const pin = String(input.pin ?? "").trim();
  const personA = String(input.personA ?? "").trim() || "小A";
  const personB = String(input.personB ?? "").trim() || "小B";
  const pageTitle = String(input.pageTitle ?? "").trim() || "我们的小本本";

  if (!name) throw new StoreError("会话名称不能为空");
  if (!pin) throw new StoreError("PIN 不能为空");
  if (pin.length < 4) throw new StoreError("PIN 至少 4 位");

  return { name, pin, personA, personB, pageTitle };
}

export async function createSession(
  env: Env,
  input: Partial<SessionInput>,
): Promise<SessionSummary> {
  const fields = normalizeSessionInput(input);
  const reg = await getRegistry(env);
  if (reg.sessions.some((s) => s.pin === fields.pin)) {
    throw new StoreError("该 PIN 已被其他会话使用");
  }

  const now = new Date().toISOString();
  const session: SessionSummary = {
    id: randomId("ses"),
    ...fields,
    createdAt: now,
    updatedAt: now,
  };

  reg.sessions.push(session);
  await putRegistry(env, reg);

  await env.DIARY_BUCKET.put(
    sessionMetaKey(session.id),
    JSON.stringify(emptyMeta(), null, 2),
    { httpMetadata: { contentType: "application/json" } },
  );

  return session;
}

export async function updateSession(
  env: Env,
  sessionId: string,
  patch: Partial<SessionInput>,
): Promise<SessionSummary> {
  const reg = await getRegistry(env);
  const idx = reg.sessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) throw new StoreError("会话不存在", 404);

  const current = reg.sessions[idx]!;
  const next: SessionSummary = { ...current };

  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (!name) throw new StoreError("会话名称不能为空");
    next.name = name;
  }
  if (typeof patch.pin === "string") {
    const pin = patch.pin.trim();
    if (!pin) throw new StoreError("PIN 不能为空");
    if (pin.length < 4) throw new StoreError("PIN 至少 4 位");
    if (pin !== current.pin && reg.sessions.some((s) => s.pin === pin)) {
      throw new StoreError("该 PIN 已被其他会话使用");
    }
    next.pin = pin;
  }
  if (typeof patch.personA === "string" && patch.personA.trim()) {
    next.personA = patch.personA.trim();
  }
  if (typeof patch.personB === "string" && patch.personB.trim()) {
    next.personB = patch.personB.trim();
  }
  if (typeof patch.pageTitle === "string" && patch.pageTitle.trim()) {
    next.pageTitle = patch.pageTitle.trim();
  }

  next.updatedAt = new Date().toISOString();
  reg.sessions[idx] = next;
  await putRegistry(env, reg);
  return next;
}

export async function deleteSession(
  env: Env,
  sessionId: string,
): Promise<boolean> {
  const reg = await getRegistry(env);
  const before = reg.sessions.length;
  reg.sessions = reg.sessions.filter((s) => s.id !== sessionId);
  if (reg.sessions.length === before) return false;

  await putRegistry(env, reg);
  await deletePrefix(env, sessionPrefix(sessionId));
  return true;
}

async function deletePrefix(env: Env, prefix: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const listed = await env.DIARY_BUCKET.list({ prefix, cursor, limit: 1000 });
    await Promise.all(listed.objects.map((o) => env.DIARY_BUCKET.delete(o.key)));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

/* ---------- Display defaults (pre-login SPA shell) ---------- */

export function defaultConfig(env: Env): ResolvedConfig {
  return {
    personA: env.PERSON_A || "小A",
    personB: env.PERSON_B || "小B",
    pageTitle: env.PAGE_TITLE || "我们的小本本",
  };
}

export function sessionToConfig(session: SessionSummary): ResolvedConfig {
  return {
    personA: session.personA,
    personB: session.personB,
    pageTitle: session.pageTitle,
  };
}

/* ---------- Pages (session-scoped) ---------- */

async function getMeta(env: Env, sessionId: string): Promise<DiaryMeta> {
  const obj = await env.DIARY_BUCKET.get(sessionMetaKey(sessionId));
  if (!obj) return emptyMeta();
  try {
    return (await obj.json()) as DiaryMeta;
  } catch {
    return emptyMeta();
  }
}

async function putMeta(
  env: Env,
  sessionId: string,
  meta: DiaryMeta,
): Promise<void> {
  meta.updatedAt = new Date().toISOString();
  await env.DIARY_BUCKET.put(
    sessionMetaKey(sessionId),
    JSON.stringify(meta, null, 2),
    { httpMetadata: { contentType: "application/json" } },
  );
}

export async function listPages(
  env: Env,
  sessionId: string,
): Promise<DiaryMeta["pages"]> {
  const meta = await getMeta(env, sessionId);
  return [...meta.pages].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPage(
  env: Env,
  sessionId: string,
  id: string,
): Promise<Page | null> {
  const obj = await env.DIARY_BUCKET.get(sessionPageKey(sessionId, id));
  if (!obj) return null;
  return (await obj.json()) as Page;
}

export async function createPage(
  env: Env,
  sessionId: string,
  input: { date?: string; title?: string },
): Promise<Page> {
  const session = await getSession(env, sessionId);
  if (!session) throw new StoreError("会话不存在", 404);

  const now = new Date().toISOString();
  const date = input.date || now.slice(0, 10);
  const page: Page = {
    id: randomId("pg"),
    date,
    title: input.title?.trim() || date,
    entries: { A: emptyEntry(), B: emptyEntry() },
    annotations: [],
    createdAt: now,
    updatedAt: now,
  };

  await env.DIARY_BUCKET.put(
    sessionPageKey(sessionId, page.id),
    JSON.stringify(page, null, 2),
    { httpMetadata: { contentType: "application/json" } },
  );

  const meta = await getMeta(env, sessionId);
  meta.pages.push({
    id: page.id,
    date: page.date,
    title: page.title,
    updatedAt: page.updatedAt,
  });
  await putMeta(env, sessionId, meta);

  // bump session updatedAt for admin list sort
  await touchSession(env, sessionId);
  return page;
}

export async function savePage(
  env: Env,
  sessionId: string,
  page: Page,
): Promise<Page> {
  page.updatedAt = new Date().toISOString();
  await env.DIARY_BUCKET.put(
    sessionPageKey(sessionId, page.id),
    JSON.stringify(page, null, 2),
    { httpMetadata: { contentType: "application/json" } },
  );

  const meta = await getMeta(env, sessionId);
  const idx = meta.pages.findIndex((p) => p.id === page.id);
  const summary = {
    id: page.id,
    date: page.date,
    title: page.title,
    updatedAt: page.updatedAt,
  };
  if (idx >= 0) meta.pages[idx] = summary;
  else meta.pages.push(summary);
  await putMeta(env, sessionId, meta);
  await touchSession(env, sessionId);
  return page;
}

export async function deletePage(
  env: Env,
  sessionId: string,
  id: string,
): Promise<boolean> {
  const existing = await getPage(env, sessionId, id);
  if (!existing) return false;
  await env.DIARY_BUCKET.delete(sessionPageKey(sessionId, id));
  const meta = await getMeta(env, sessionId);
  meta.pages = meta.pages.filter((p) => p.id !== id);
  await putMeta(env, sessionId, meta);
  await touchSession(env, sessionId);
  return true;
}

async function touchSession(env: Env, sessionId: string): Promise<void> {
  const reg = await getRegistry(env);
  const idx = reg.sessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) return;
  reg.sessions[idx] = {
    ...reg.sessions[idx]!,
    updatedAt: new Date().toISOString(),
  };
  await putRegistry(env, reg);
}
