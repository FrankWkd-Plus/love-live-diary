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

export interface MediaRef {
  id: string;
  contentType: string;
  size: number;
  createdAt: string;
  /** Who uploaded this image */
  author: PersonId;
}

export interface DiaryEntry {
  body: string;
  updatedAt: string | null;
  /** Photos attached to this person's diary column */
  images?: MediaRef[];
}

export interface TopicReply {
  id: string;
  author: PersonId;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageTopic {
  text: string;
  setBy: PersonId | null;
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
  /** Shared daily discussion prompt for both people */
  topic?: PageTopic;
  topicReplies?: TopicReply[];
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

/** One couple's isolated diary space (PIN is globally unique). */
export interface SessionSummary {
  id: string;
  /** Admin list label, e.g. "小明&小红" */
  name: string;
  pin: string;
  personA: string;
  personB: string;
  pageTitle: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRegistry {
  sessions: SessionSummary[];
  updatedAt: string;
}

/** Display defaults for SPA shells before a user session is known. */
export interface ResolvedConfig {
  personA: string;
  personB: string;
  pageTitle: string;
}

export interface Env {
  DIARY_BUCKET: R2Bucket;
  PAGE_TITLE: string;
  PERSON_A: string;
  PERSON_B: string;
  SESSION_SECRET: string;
  /** Admin console password */
  ADMIN_PASSWORD: string;
}

export interface SessionPayload {
  ok: true;
  sessionId: string;
  person: PersonId;
  exp: number;
}

export interface AdminSessionPayload {
  ok: true;
  role: "admin";
  exp: number;
}
