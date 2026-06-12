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

// Supabase access tokens live ~1 hour. Trade the stored refresh token for a
// fresh pair so syncs keep working between logins.
export async function refreshAuth(apiUrl) {
  apiUrl = apiUrl || process.env.HONEYTREE_API_URL || "https://www.tryhoney.xyz";
  const auth = getAuth();
  if (!auth || !auth.refresh_token) return null;
  try {
    const res = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    const next = {
      ...auth,
      access_token: data.access_token,
      refresh_token: data.refresh_token || auth.refresh_token,
    };
    saveAuth(next);
    return next;
  } catch {
    return null;
  }
}

// Bearer fetch that retries once through a token refresh on 401.
// Returns null when not logged in.
export async function authedFetch(url, options = {}) {
  const auth = getAuth();
  if (!auth || !auth.access_token) return null;
  const doFetch = (token) =>
    fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
  let res = await doFetch(auth.access_token);
  if (res.status === 401) {
    const refreshed = await refreshAuth();
    if (refreshed) res = await doFetch(refreshed.access_token);
  }
  return res;
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
          refresh_token: data.refresh_token || null,
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
