export type PersonId = "A" | "B";

export interface Annotation {
  id: string;
  author: PersonId;
  /** Which person's diary body this annotation is attached to */
  target: PersonId;
  /** 0-based UTF-16 offset into the target diary body */
  start: number;
  end: number;
  /** Snapshot of selected text at creation time */
  quote: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  body: string;
  updatedAt: string | null;
}

export interface Page {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  entries: {
    A: DiaryEntry;
    B: DiaryEntry;
  };
  annotations: Annotation[];
  createdAt: string;
  updatedAt: string;
}

export interface DiaryMeta {
  pages: Array<{
    id: string;
    date: string;
    title: string;
    updatedAt: string;
  }>;
  updatedAt: string;
}

/** Runtime overrides stored in R2 (admin-editable). */
export interface AppSettings {
  pin?: string;
  personA?: string;
  personB?: string;
  pageTitle?: string;
  updatedAt?: string;
}

export interface ResolvedConfig {
  pin: string;
  personA: string;
  personB: string;
  pageTitle: string;
}

export interface Env {
  DIARY_BUCKET: R2Bucket;
  /** Fallback PIN from secret/var; may be overridden by settings.json */
  DIARY_PIN: string;
  PAGE_TITLE: string;
  PERSON_A: string;
  PERSON_B: string;
  SESSION_SECRET: string;
  /** Admin console password */
  ADMIN_PASSWORD: string;
}

export interface SessionPayload {
  ok: true;
  person: PersonId;
  exp: number;
}

export interface AdminSessionPayload {
  ok: true;
  role: "admin";
  exp: number;
}
