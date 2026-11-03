// Local browser verification only. Data is isolated and never included in deployment.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { initialSeedData } from "../src/lib/seed";
import { hashPassword } from "../src/lib/security";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mdc-browser-qa-"));
const fixture = structuredClone(initialSeedData);
for (const p of fixture.profiles) { p.password = hashPassword("QAOnly!Crew2026"); p.email = `${p.id}@example.test`; }
const now = Date.now();
fixture.practice_sessions.forEach((p, i) => { p.start_at = new Date(now + (i + 1) * 86400000).toISOString(); p.end_at = new Date(Date.parse(p.start_at) + 2 * 3600000).toISOString(); });
fixture.dance_poll_rounds.forEach(p => { p.start_at = new Date(now - 86400000).toISOString(); p.end_at = new Date(now + 7 * 86400000).toISOString(); });
fixture.auth_sessions = []; fixture.auth_attempts = [];
fs.writeFileSync(path.join(directory, "mdc-db.json"), JSON.stringify(fixture));
const environment = { ...process.env, MDC_DATA_DIR: directory, VERCEL: "0", APP_URL: "http://localhost:3100" };
for (const name of ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "GMAIL_USER", "GMAIL_APP_PASSWORD", "RESEND_API_KEY"]) delete environment[name as keyof typeof environment];
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3100", "-H", "127.0.0.1"], { stdio: "inherit", env: environment });
function cleanup() { child.kill(); }
process.on("SIGINT", cleanup); process.on("SIGTERM", cleanup);
child.on("exit", code => { fs.rmSync(directory, { recursive: true, force: true }); process.exitCode = code || 0; });
