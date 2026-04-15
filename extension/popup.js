const API_BASE = "https://tryhoney.xyz"; // dev: "http://localhost:3000"

const usageText = document.getElementById("usage-text");
const progressFill = document.getElementById("progress-fill");
const waitlistSection = document.getElementById("waitlist-section");
const waitlistEmail = document.getElementById("waitlist-email");
const waitlistBtn = document.getElementById("waitlist-btn");
const waitlistStatus = document.getElementById("waitlist-status");
const hotkeyDisplay = document.getElementById("hotkey-display");

// Detect platform for hotkey display
const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
hotkeyDisplay.textContent = isMac ? "\u2318\u21e7H" : "Ctrl+Shift+H";

// Fingerprint (same logic as content.js)
async function getFingerprint() {
  const raw = [
    navigator.userAgent,
    screen.width + "x" + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency,
  ].join("|");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Fetch and display usage
async function loadUsage() {
  try {
    const fingerprint = await getFingerprint();
    const res = await fetch(`${API_BASE}/api/usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint }),
    });

    if (res.ok) {
      const data = await res.json();
      const { remaining, total } = data;
      usageText.textContent = `${remaining} of ${total} left`;
      progressFill.style.width = `${(remaining / total) * 100}%`;

      if (remaining === 0) {
        progressFill.style.background = "#d1d5db";
        waitlistSection.style.display = "block";
      }
    } else {
      usageText.textContent = "Couldn't load";
    }
  } catch {
    usageText.textContent = "Offline";
  }
}

// Waitlist signup
waitlistBtn.addEventListener("click", async () => {
  const email = waitlistEmail.value.trim();
  if (!email || !email.includes("@")) {
    waitlistStatus.textContent = "Enter a valid email";
    return;
  }

  waitlistBtn.textContent = "Sending...";
  waitlistBtn.disabled = true;

  try {
    const fingerprint = await getFingerprint();
    const res = await fetch(`${API_BASE}/api/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fingerprint }),
    });

    if (res.ok) {
      waitlistStatus.textContent = "You're on the list!";
      waitlistStatus.style.color = "#16a34a";
      waitlistEmail.style.display = "none";
      waitlistBtn.style.display = "none";
    } else {
      waitlistStatus.textContent = "Something went wrong";
      waitlistBtn.textContent = "Try again";
      waitlistBtn.disabled = false;
    }
  } catch {
    waitlistStatus.textContent = "Network error";
    waitlistBtn.textContent = "Try again";
    waitlistBtn.disabled = false;
  }
});

waitlistEmail.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    waitlistBtn.click();
  }
});

// Load on popup open
loadUsage();
