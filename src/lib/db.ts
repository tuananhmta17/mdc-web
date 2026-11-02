import fs from "fs";
import path from "path";
import os from "os";
import { DatabaseSchema, Profile, CurrentUserSession, RoleCode } from "./types";
import { initialSeedData } from "./seed";
import { getSupabase } from "./supabase";

const isVercel = process.env.VERCEL === "1";

function getDataDirectory(): string {
  // If running on Vercel Serverless or in a read-only environment, use /tmp
  if (isVercel) {
    return os.tmpdir();
  }
  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(localDir, ".test-write");
    fs.writeFileSync(testFile, "test", "utf-8");
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    return os.tmpdir();
  }
}

const DATA_DIR = getDataDirectory();
const DB_FILE = path.join(DATA_DIR, "mdc-db.json");
const SESSION_FILE = path.join(DATA_DIR, "session.json");

function ensureDirectoryExists() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // Ignored if /tmp already exists
    }
  }
}

// Memory cache fallback for fast response within serverless execution
let memoryDbCache: DatabaseSchema | null = null;

export function readDb(): DatabaseSchema {
  if (memoryDbCache) {
    return memoryDbCache;
  }

  ensureDirectoryExists();

  if (!fs.existsSync(DB_FILE)) {
    // If local seed in project directory exists, load it
    const localDbPath = path.join(process.cwd(), "data", "mdc-db.json");
    if (fs.existsSync(localDbPath) && localDbPath !== DB_FILE) {
      try {
        const raw = fs.readFileSync(localDbPath, "utf-8");
        const parsed = JSON.parse(raw);
        writeDb(parsed);
        memoryDbCache = parsed;
        return parsed;
      } catch {
        // Fallback to initialSeedData below
      }
    }

    writeDb(initialSeedData);
    memoryDbCache = initialSeedData;
    return initialSeedData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as DatabaseSchema;
    memoryDbCache = parsed;
    return parsed;
  } catch (err) {
    console.error("Error reading database file, resetting to seed data:", err);
    writeDb(initialSeedData);
    memoryDbCache = initialSeedData;
    return initialSeedData;
  }
}

export function writeDb(data: DatabaseSchema): void {
  memoryDbCache = data;
  ensureDirectoryExists();
  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.warn("Could not write DB to filesystem (using in-memory state):", err);
  }

  // Asynchronous sync to Supabase if configured
  syncToSupabase(data).catch((err) => {
    console.warn("Supabase background sync skipped or error:", err);
  });
}

export function resetDb(): DatabaseSchema {
  memoryDbCache = initialSeedData;
  writeDb(initialSeedData);
  return initialSeedData;
}

// Session Management (Supports Cookie-based multi-user session & local fallback)
export function getActiveSessionUserId(reqCookieUid?: string): string {
  if (reqCookieUid && reqCookieUid.trim()) {
    return reqCookieUid.trim();
  }

  ensureDirectoryExists();
  if (!fs.existsSync(SESSION_FILE)) {
    return "u-board-1";
  }
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf-8");
    const json = JSON.parse(raw);
    return json.userId || "u-board-1";
  } catch {
    return "u-board-1";
  }
}

export function setActiveSessionUserId(userId: string): void {
  ensureDirectoryExists();
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ userId }), "utf-8");
  } catch {
    // If filesystem is read-only, cookie handles the session
  }
}

export function getCurrentSession(db?: DatabaseSchema, cookieUid?: string): CurrentUserSession {
  const currentDb = db || readDb();
  const userId = getActiveSessionUserId(cookieUid);
  const user = currentDb.profiles.find((p) => p.id === userId) || currentDb.profiles[0];

  const primaryMembership = currentDb.department_memberships.find(
    (m) => m.user_id === user.id && m.is_primary
  );
  const primaryDept = currentDb.departments.find(
    (d) => d.id === primaryMembership?.department_id
  );

  const roles = currentDb.role_assignments
    .filter((r) => r.user_id === user.id)
    .map((r) => r.role);

  return {
    user,
    primaryDepartment: primaryDept,
    roles,
    isBoardAdmin: roles.includes("BOARD_ADMIN"),
    isDanceHead: roles.includes("DANCE_HEAD"),
    isDanceLeader: roles.includes("DANCE_LEADER"),
    isDanceMember: roles.includes("DANCE_MEMBER"),
    isMediaHead: roles.includes("MEDIA_HEAD"),
    isMediaMember: roles.includes("MEDIA_MEMBER"),
  };
}

export function getSessionFromRequest(req: { cookies: { get: (name: string) => { value?: string } | undefined }; headers: { get: (name: string) => string | null } }, db?: DatabaseSchema): CurrentUserSession {
  const cookieUid = req.cookies.get("mdc_uid")?.value || req.headers.get("x-mdc-uid") || undefined;
  return getCurrentSession(db, cookieUid);
}

// Supabase Cloud State Synchronizer
async function syncToSupabase(data: DatabaseSchema): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from("app_state_snapshots").upsert({
      id: "latest_state",
      state_json: data,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[Supabase Sync] Error uploading state snapshot:", err);
  }
}

export async function syncFromSupabase(): Promise<DatabaseSchema | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("app_state_snapshots")
      .select("state_json")
      .eq("id", "latest_state")
      .single();

    if (!error && data?.state_json) {
      memoryDbCache = data.state_json;
      writeDb(data.state_json);
      return data.state_json;
    }
  } catch (err) {
    console.warn("[Supabase Sync] Error downloading state snapshot:", err);
  }
  return null;
}
