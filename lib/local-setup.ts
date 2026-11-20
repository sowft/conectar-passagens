import { readFile, mkdir, open, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { encodeAdminPassword, hasAdminPassword } from "@/lib/admin-password";

export function localSetupAllowed(request: Request) {
  if (process.env.NODE_ENV !== "development") return false;
  const url = new URL(request.url);
  const hosts = ["127.0.0.1", "localhost", "[::1]"];
  const host = request.headers.get("host");
  if (!host || !hosts.includes(url.hostname)) return false;
  let browserUrl: URL;
  try { browserUrl = new URL(`${url.protocol}//${host}`); } catch { return false; }
  // Next dev normalizes request.url to localhost even when the browser uses 127.0.0.1.
  if (browserUrl.host !== host || !hosts.includes(browserUrl.hostname) || browserUrl.port !== url.port) return false;
  if (request.method === "POST") {
    if (request.headers.get("origin") !== browserUrl.origin || !request.headers.get("content-type")?.startsWith("application/json")) return false;
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin") return false;
  }
  return true;
}

async function envContents() {
  try { return await readFile(path.join(process.cwd(), ".env.local"), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return ""; throw error; }
}

export async function setupAvailable() {
  if (hasAdminPassword()) return false;
  const content = await envContents();
  return !content.split(/\r?\n/).some(line => {
    const match = line.match(/^\s*(?:export\s+)?ADMIN_PASSWORD(?:_HASH)?\s*=\s*(.*)$/);
    return match && !["", "''", '""'].includes(match[1].trim());
  });
}

export async function configureLocalAdmin(password: string) {
  if (password.length < 12 || password.length > 256) throw new Error("PASSWORD_LENGTH");
  const directory = path.join(process.cwd(), ".local-data");
  await mkdir(directory, { recursive: true });
  const lockPath = path.join(directory, "setup.lock");
  const lock = await open(lockPath, "wx");
  const temporary = path.join(process.cwd(), `.env.setup-${randomBytes(8).toString("hex")}`);
  try {
    if (!await setupAvailable()) throw new Error("ALREADY_CONFIGURED");
    let content = await envContents();
    const hash = encodeAdminPassword(password);
    content = content.replace(/^\s*(?:export\s+)?ADMIN_PASSWORD(?:_HASH)?\s*=.*$/gm, "");
    content += `\nADMIN_PASSWORD_HASH=${hash}\n`;
    const preserveSecret = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 && /^\s*(?:export\s+)?SESSION_SECRET\s*=/m.test(content));
    const secret = preserveSecret ? process.env.SESSION_SECRET! : randomBytes(32).toString("hex");
    if (!preserveSecret) {
      content = content.replace(/^\s*(?:export\s+)?SESSION_SECRET\s*=.*$/gm, "");
      content += `SESSION_SECRET=${secret}\n`;
    }
    await writeFile(temporary, content, { mode: 0o600, flag: "wx" });
    await rename(temporary, path.join(process.cwd(), ".env.local"));
    process.env.ADMIN_PASSWORD_HASH = hash;
    process.env.SESSION_SECRET = secret;
  } finally {
    await unlink(temporary).catch(() => {});
    await lock.close();
    await unlink(lockPath);
  }
}
