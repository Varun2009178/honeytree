import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const AUTH_DIR = path.join(os.homedir(), ".honeydew");
const AUTH_FILE = path.join(AUTH_DIR, "auth.json");

export function getAuth() {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function saveAuth(data) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
}

export function clearAuth() {
  try {
    fs.unlinkSync(AUTH_FILE);
  } catch {}
}

export function isLoggedIn() {
  const auth = getAuth();
  return !!(auth && auth.access_token);
}

export async function loginWithDevice(apiUrl = process.env.HONEYTREE_API_URL || "https://www.tryhoney.xyz") {
  const res = await fetch(`${apiUrl}/api/auth/device`, { method: "POST" });
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    console.error("  Server returned unexpected response. Is the Honeytree web app running?");
    return false;
  }
  const { device_code, user_code, interval, verification_url } = await res.json();

  const base = verification_url || `${apiUrl}/auth/device`;
  const signInUrl = `${base}?code=${encodeURIComponent(user_code)}`;

  console.log();
  console.log("  Open this link to sign in:");
  console.log(`  \x1b[36m${signInUrl}\x1b[0m`);
  console.log();
  console.log(`  (or enter code ${user_code} manually at ${base})`);
  console.log("  Waiting for you to sign in...");

  while (true) {
    await new Promise((r) => setTimeout(r, (interval || 5) * 1000));

    try {
      const pollRes = await fetch(`${apiUrl}/api/auth/device/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code }),
      });

      const pollContentType = pollRes.headers.get("content-type") || "";
      if (!pollContentType.includes("application/json")) continue;

      if (!pollRes.ok) {
        if (pollRes.status === 410) {
          console.error("  Code expired. Run honeytree login again.");
          return false;
        }
        continue;
      }

      const data = await pollRes.json();

      if (data.status === "complete") {
        saveAuth({
          access_token: data.access_token,
          user_id: data.user.id,
          username: data.user.username,
        });
        console.log(`  Linked as ${data.user.username}`);
        return true;
      }
    } catch {
      continue;
    }
  }
}
