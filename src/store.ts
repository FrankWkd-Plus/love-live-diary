import type { AppSettings, DiaryMeta, Env, Page, ResolvedConfig } from "./types";
import { randomId } from "./crypto";

const META_KEY = "meta.json";
const SETTINGS_KEY = "settings.json";
const pageKey = (id: string) => `pages/${id}.json`;

function emptyMeta(): DiaryMeta {
  return { pages: [], updatedAt: new Date().toISOString() };
}

function emptyEntry() {
  return { body: "", updatedAt: null as string | null };
}

export async function getMeta(env: Env): Promise<DiaryMeta> {
  const obj = await env.DIARY_BUCKET.get(META_KEY);
  if (!obj) return emptyMeta();
  return (await obj.json()) as DiaryMeta;
}

async function putMeta(env: Env, meta: DiaryMeta): Promise<void> {
  meta.updatedAt = new Date().toISOString();
  await env.DIARY_BUCKET.put(META_KEY, JSON.stringify(meta, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}

export async function getSettings(env: Env): Promise<AppSettings> {
  const obj = await env.DIARY_BUCKET.get(SETTINGS_KEY);
  if (!obj) return {};
  try {
    return (await obj.json()) as AppSettings;
  } catch {
    return {};
  }
}

export async function saveSettings(
  env: Env,
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings(env);
  const next: AppSettings = { ...current };

  if (typeof patch.pin === "string") {
    const pin = patch.pin.trim();
    if (pin) next.pin = pin;
  }
  if (typeof patch.personA === "string") {
    const v = patch.personA.trim();
    if (v) next.personA = v;
  }
  if (typeof patch.personB === "string") {
    const v = patch.personB.trim();
    if (v) next.personB = v;
  }
  if (typeof patch.pageTitle === "string") {
    const v = patch.pageTitle.trim();
    if (v) next.pageTitle = v;
  }
  next.updatedAt = new Date().toISOString();

  await env.DIARY_BUCKET.put(SETTINGS_KEY, JSON.stringify(next, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
  return next;
}

export async function resolveConfig(env: Env): Promise<ResolvedConfig> {
  const s = await getSettings(env);
  return {
    pin: (s.pin && s.pin.trim()) || env.DIARY_PIN || "123456",
    personA: (s.personA && s.personA.trim()) || env.PERSON_A || "小A",
    personB: (s.personB && s.personB.trim()) || env.PERSON_B || "小B",
    pageTitle: (s.pageTitle && s.pageTitle.trim()) || env.PAGE_TITLE || "我们的小本本",
  };
}

export async function listPages(env: Env): Promise<DiaryMeta["pages"]> {
  const meta = await getMeta(env);
  return [...meta.pages].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPage(env: Env, id: string): Promise<Page | null> {
  const obj = await env.DIARY_BUCKET.get(pageKey(id));
  if (!obj) return null;
  return (await obj.json()) as Page;
}

export async function createPage(
  env: Env,
  input: { date?: string; title?: string },
): Promise<Page> {
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

  await env.DIARY_BUCKET.put(pageKey(page.id), JSON.stringify(page, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });

  const meta = await getMeta(env);
  meta.pages.push({
    id: page.id,
    date: page.date,
    title: page.title,
    updatedAt: page.updatedAt,
  });
  await putMeta(env, meta);
  return page;
}

export async function savePage(env: Env, page: Page): Promise<Page> {
  page.updatedAt = new Date().toISOString();
  await env.DIARY_BUCKET.put(pageKey(page.id), JSON.stringify(page, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });

  const meta = await getMeta(env);
  const idx = meta.pages.findIndex((p) => p.id === page.id);
  const summary = {
    id: page.id,
    date: page.date,
    title: page.title,
    updatedAt: page.updatedAt,
  };
  if (idx >= 0) meta.pages[idx] = summary;
  else meta.pages.push(summary);
  await putMeta(env, meta);
  return page;
}

export async function deletePage(env: Env, id: string): Promise<boolean> {
  const existing = await getPage(env, id);
  if (!existing) return false;
  await env.DIARY_BUCKET.delete(pageKey(id));
  const meta = await getMeta(env);
  meta.pages = meta.pages.filter((p) => p.id !== id);
  await putMeta(env, meta);
  return true;
}
