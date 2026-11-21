import "server-only";
import { Readable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig as publicConfig } from "@/lib/supabase-config";

// Supabase Storage behind the same tiny interface the app already uses for the
// Firebase bucket (bucket.file(path) with exists / getMetadata / getSignedUrl /
// createReadStream / delete). Every upload and playback route therefore works
// unchanged, whichever provider is active. See getAdminBucket() in
// lib/firebase-admin.js.

const BUCKET = process.env.SUPABASE_VIDEO_BUCKET || "videos";
// Supabase's free plan rejects files over 50 MB, so the bucket is capped there.
const FILE_LIMIT = 50 * 1024 * 1024;
const MIME = ["video/mp4", "video/quicktime", "video/webm"];

export function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || publicConfig.url || "").trim().replace(/\/+$/, "");
  // The SECRET key stays on the server. Never expose it with a NEXT_PUBLIC_ name.
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return url && key ? { url, key } : null;
}

// STORAGE_PROVIDER=firebase|supabase forces one; otherwise Supabase is used
// whenever its keys are set, and Firebase Storage is used when they aren't.
export function storageProvider() {
  const forced = (process.env.STORAGE_PROVIDER || "").trim().toLowerCase();
  if (forced === "firebase" || forced === "supabase") return forced;
  return supabaseConfig() ? "supabase" : "firebase";
}

let client = null;
function getClient() {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  client ||= createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Creates the private bucket the first time it is needed, so there is nothing
// to set up by hand in the Supabase dashboard.
let ready = null;
function ensureBucket(sb) {
  ready ||= (async () => {
    const { data } = await sb.storage.getBucket(BUCKET);
    if (data) return;
    const { error } = await sb.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: FILE_LIMIT,
      allowedMimeTypes: MIME,
    });
    if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(error.message);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

function notFound() {
  const e = new Error("Not found");
  e.code = 404;
  return e;
}

class SupabaseFile {
  constructor(sb, path) {
    this.sb = sb;
    this.path = path;
  }

  // Firebase-style: resolves [signedUrl]. The browser sends the file there.
  async getSignedUrl({ action } = {}) {
    if (action !== "write") throw new Error("Only upload URLs are supported.");
    await ensureBucket(this.sb);
    const { data, error } = await this.sb.storage.from(BUCKET).createSignedUploadUrl(this.path);
    if (error) throw new Error(error.message);
    return [data.signedUrl];
  }

  // Resolves [{ size, contentType }] or throws if the object isn't there.
  async getMetadata() {
    const i = this.path.lastIndexOf("/");
    const dir = this.path.slice(0, i);
    const name = this.path.slice(i + 1);
    const { data, error } = await this.sb.storage.from(BUCKET).list(dir, { limit: 100, search: name });
    const item = !error && (data || []).find((o) => o.name === name);
    if (!item) throw notFound();
    return [{ size: String(item.metadata?.size ?? 0), contentType: item.metadata?.mimetype || "video/mp4" }];
  }

  async exists() {
    try {
      await this.getMetadata();
      return [true];
    } catch {
      return [false];
    }
  }

  // A Node stream of bytes start..end (inclusive), fetched with an HTTP Range
  // request so seeking works in the player.
  createReadStream({ start = 0, end } = {}) {
    const { sb, path } = this;
    async function* chunks() {
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 300);
      if (error) throw new Error(error.message);
      const res = await fetch(data.signedUrl, { headers: { Range: `bytes=${start}-${end ?? ""}` } });
      if (!res.ok) throw new Error(`Storage returned ${res.status}`);
      for await (const chunk of res.body) yield chunk;
    }
    return Readable.from(chunks(), { objectMode: false });
  }

  async delete() {
    const { error } = await this.sb.storage.from(BUCKET).remove([this.path]);
    if (error) throw new Error(error.message);
    return [{}];
  }
}

export function getSupabaseBucket() {
  const sb = getClient();
  if (!sb) return null;
  return { file: (path) => new SupabaseFile(sb, path) };
}
