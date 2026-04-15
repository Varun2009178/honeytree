// Honeydew content script — Command Mode overlay (Spotlight-style)
// NO DOM scraping — only reads document.title + URL for LinkedIn ToS compliance
// NO persistent UI — only appears on hotkey (Cmd+Shift+H)
// All API calls go through server proxy (no API keys in extension)

(function () {
  "use strict";

  // ==========================================
  // CONFIG
  // ==========================================
  const API_BASE = "https://tryhoney.xyz"; // dev: "http://localhost:3000"

  // ==========================================
  // STATE
  // ==========================================
  let panelRoot = null;
  let panelShadow = null;
  let lastResearchedName = "";
  let currentName = "";
  let streamedText = "";
  let isResearching = false;
  let panelVisible = false;
  let suggestedOpener = "";
  let currentTheme = "light";
  let abortController = null;
  let renderPending = false;
  let streamState = null;
  let remainingGenerations = null; // fetched from server
  let cachedFingerprint = null;
  // Drag state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panelStartX = 0;
  let panelStartY = 0;
  // User context (persisted)
  let userContext = null; // { targetRole: string, experience: string }

  // ==========================================
  // FINGERPRINT
  // ==========================================
  async function getFingerprint() {
    if (cachedFingerprint) return cachedFingerprint;
    const raw = [
      navigator.userAgent,
      screen.width + "x" + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      navigator.hardwareConcurrency,
    ].join("|");
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    cachedFingerprint = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    return cachedFingerprint;
  }

  // ==========================================
  // THEME DETECTION
  // ==========================================
  function detectPageTheme() {
    const bg = getComputedStyle(document.body).backgroundColor;
    const match = bg.match(/\d+/g);
    if (match) {
      const [r, g, b] = match.map(Number);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? "dark" : "light";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark";
  }

  // ==========================================
  // SVG ICONS
  // ==========================================
  const ICONS = {
    honeydew: `<svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor" stroke="none"><path d="M16 2C16 2 6 13 6 20a10 10 0 0 0 20 0c0-7-10-18-10-18z"/><path d="M13 22a3.5 3.5 0 0 1-2-3c0-2 2-5 2-5" stroke="white" fill="none" stroke-width="2" stroke-linecap="round" opacity="0.4"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    share: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  };

  // ==========================================
  // PANEL CSS (command-mode overlay)
  // ==========================================
  const PANEL_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@500;600&display=swap');
    :host {
      all: initial;
      position: fixed; top: 0; left: 0; width: 0; height: 0;
      z-index: 2147483646;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
    }
    .honeydew-overlay {
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0);
      transition: background 0.3s ease;
      pointer-events: none;
      z-index: 1;
    }
    .honeydew-overlay.visible {
      background: rgba(0, 0, 0, 0.18);
      pointer-events: auto;
    }
    .honeydew-panel.theme-dark,
    .honeydew-panel.theme-light {
      --panel-bg: #fffdf7;
      --panel-border: rgba(245, 158, 11, 0.12);
      --panel-shadow: 0 8px 40px rgba(180, 140, 60, 0.10), 0 2px 12px rgba(245, 158, 11, 0.06);
      --text-primary: #1a1a1a;
      --text-secondary: #6b7280;
      --text-muted: #9ca3af;
      --border-subtle: rgba(245, 158, 11, 0.08);
      --hover-bg: rgba(245, 158, 11, 0.06);
      --scrollbar-thumb: rgba(245, 158, 11, 0.15);
      --dot-failed: #d1d5db;
      --fallback-border: rgba(245, 158, 11, 0.06);
      --dm-bg: #fffbeb;
      --dm-border: rgba(245, 158, 11, 0.18);
      --copy-bg: rgba(245, 158, 11, 0.06);
      --copy-border: rgba(245, 158, 11, 0.2);
      --copy-hover-bg: rgba(245, 158, 11, 0.12);
    }
    .honeydew-panel {
      pointer-events: auto;
      position: fixed;
      top: 38%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.92);
      width: 440px;
      max-height: 70vh;
      background: var(--panel-bg);
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      box-shadow: var(--panel-shadow);
      overflow: hidden;
      display: flex; flex-direction: column;
      opacity: 0;
      transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.4);
      z-index: 2;
    }
    .honeydew-panel.visible {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 12px;
      cursor: grab; user-select: none;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
      background: rgba(255, 251, 235, 0.5);
    }
    .panel-header:active { cursor: grabbing; }
    .panel-header-left { display: flex; align-items: center; gap: 10px; }
    .panel-header-icon { color: #d97706; display: flex; }
    .panel-title {
      font-family: 'Outfit', 'DM Sans', sans-serif;
      font-size: 15px; font-weight: 600;
      color: var(--text-primary);
      overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; max-width: 240px;
    }
    .remaining-badge {
      font-size: 11px; font-weight: 600;
      color: #b45309;
      background: rgba(245, 158, 11, 0.1);
      padding: 2px 8px;
      border-radius: 12px;
      white-space: nowrap;
    }
    .panel-header-right { display: flex; align-items: center; gap: 4px; }
    .panel-close, .panel-cancel {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px;
      border: none; border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer; transition: all 0.15s ease;
    }
    .panel-close:hover, .panel-cancel:hover {
      background: var(--hover-bg);
      color: var(--text-secondary);
    }
    .panel-cancel { color: #b45309; }
    .panel-cancel:hover { color: #92400e; background: rgba(245, 158, 11, 0.1); }
    .panel-body {
      padding: 16px 20px 20px;
      overflow-y: auto; flex: 1;
      max-height: calc(70vh - 60px);
      scroll-behavior: smooth;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .panel-body::-webkit-scrollbar { width: 3px; }
    .panel-body::-webkit-scrollbar-track { background: transparent; }
    .panel-body::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 2px; }
    .search-line {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 0; font-size: 12.5px;
      color: var(--text-secondary);
      opacity: 0; animation: fadeIn 0.35s ease forwards;
    }
    .search-dot { width: 6px; height: 6px; border-radius: 50%; background: #d97706; flex-shrink: 0; }
    .search-dot.active { animation: dotPulse 1.2s ease-in-out infinite; }
    .search-dot.done { background: #16a34a; }
    .search-dot.failed { background: var(--dot-failed); }
    .search-status { margin-left: auto; font-size: 10.5px; color: var(--text-muted); }
    .stream-content {
      font-size: 13.5px; line-height: 1.65;
      color: var(--text-primary);
      word-wrap: break-word;
      letter-spacing: 0.01em;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .dm-section {
      margin-bottom: 16px;
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .dm-label {
      display: flex; align-items: center; gap: 6px;
      font-family: 'Outfit', 'DM Sans', sans-serif;
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: #b45309;
      margin-bottom: 8px;
    }
    .dm-card {
      padding: 14px 16px;
      background: var(--dm-bg);
      border: 1px solid var(--dm-border);
      border-radius: 14px;
      font-size: 14px; line-height: 1.6;
      color: var(--text-primary);
    }
    .dm-copy-row {
      display: flex; align-items: center; gap: 6px;
      margin-top: 10px;
    }
    .dm-copy-btn, .dm-share-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 8px 16px;
      border: 1px solid var(--copy-border);
      border-radius: 8px;
      background: var(--copy-bg);
      color: #b45309;
      font-size: 12px; font-weight: 600;
      letter-spacing: 0.03em;
      cursor: pointer; transition: all 0.15s ease;
      font-family: 'DM Sans', inherit;
    }
    .dm-copy-btn:hover, .dm-share-btn:hover { background: var(--copy-hover-bg); transform: translateY(-1px); }
    .dm-copy-btn:active, .dm-share-btn:active { transform: translateY(0); }
    .dm-copy-btn.copied, .dm-share-btn.copied { color: #16a34a; border-color: rgba(22, 163, 74, 0.2); background: rgba(22, 163, 74, 0.06); }
    .section-label {
      display: block;
      font-family: 'Outfit', 'DM Sans', sans-serif;
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: #b45309;
      margin-top: 18px; margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(245, 158, 11, 0.1);
      animation: fadeIn 0.3s ease both;
    }
    .section-label:first-child { margin-top: 0; }
    .hook-line {
      display: flex; gap: 8px;
      padding: 5px 0;
      line-height: 1.5;
      animation: fadeIn 0.3s ease both;
    }
    .hook-bullet {
      color: #d97706; font-weight: 700; flex-shrink: 0; margin-top: 1px;
    }
    .hook-text { flex: 1; }
    .who-text {
      font-size: 13.5px; font-weight: 500;
      padding: 4px 0 2px;
      line-height: 1.5;
      animation: fadeIn 0.3s ease both;
    }
    .stream-cursor {
      display: inline-block; width: 2px; height: 1.1em;
      background: #d97706; vertical-align: text-bottom;
      margin-left: 2px;
      border-radius: 1px;
      animation: cursorPulse 1.5s ease-in-out infinite;
    }
    @keyframes cursorPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .idle-msg {
      text-align: center; padding: 36px 16px;
      color: var(--text-secondary); font-size: 13px; line-height: 1.6;
    }
    .idle-msg kbd {
      display: inline-block;
      padding: 2px 7px;
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 6px;
      font-family: 'DM Sans', inherit;
      font-size: 11px;
      background: #fffbeb;
      color: #b45309;
    }
    .error-msg {
      text-align: center; padding: 24px 16px;
      color: #92400e; font-size: 12.5px;
    }
    .onboarding {
      padding: 24px 20px;
      display: flex; flex-direction: column; gap: 18px;
    }
    .onboarding-heading {
      font-family: 'Outfit', 'DM Sans', sans-serif;
      font-size: 16px; font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    .onboarding-sub {
      font-size: 13px; color: var(--text-secondary);
      line-height: 1.5; margin: -8px 0 0 0;
    }
    .onboarding-field {
      display: flex; flex-direction: column; gap: 5px;
    }
    .onboarding-label {
      font-size: 12px; font-weight: 600;
      color: var(--text-primary);
    }
    .onboarding-input {
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      padding: 10px 12px;
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 10px;
      background: #fff;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s ease;
    }
    .onboarding-input:focus {
      border-color: #d97706;
    }
    .onboarding-input::placeholder {
      color: #c4c9d0;
    }
    .onboarding-btn {
      font-family: 'DM Sans', sans-serif;
      font-size: 14px; font-weight: 600;
      padding: 11px 20px;
      background: #1a1a1a;
      color: #fff;
      border: none; border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s ease;
      margin-top: 4px;
    }
    .onboarding-btn:hover { background: #d97706; }
    .edit-context {
      font-size: 11px;
      color: var(--text-muted);
      cursor: pointer;
      transition: color 0.15s ease;
      background: none; border: none;
      font-family: 'DM Sans', sans-serif;
      padding: 0; margin-left: auto;
    }
    .edit-context:hover { color: #d97706; }
    .waitlist-capture {
      margin-top: 20px;
      padding: 16px;
      background: rgba(245, 158, 11, 0.04);
      border: 1px solid rgba(245, 158, 11, 0.12);
      border-radius: 14px;
      text-align: center;
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .waitlist-capture p {
      font-size: 13px; font-weight: 500;
      color: var(--text-primary);
      margin: 0 0 12px 0;
    }
    .waitlist-capture-row {
      display: flex; gap: 8px;
    }
    .waitlist-capture input {
      flex: 1;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      padding: 9px 12px;
      border: 1px solid rgba(245, 158, 11, 0.15);
      border-radius: 8px;
      background: #fff;
      color: var(--text-primary);
      outline: none;
    }
    .waitlist-capture input:focus { border-color: #d97706; }
    .waitlist-capture input::placeholder { color: #c4c9d0; }
    .waitlist-capture button {
      font-family: 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 600;
      padding: 9px 16px;
      background: #1a1a1a;
      color: #fff;
      border: none; border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s ease;
      white-space: nowrap;
    }
    .waitlist-capture button:hover { background: #d97706; }
    .waitlist-capture .waitlist-success {
      font-size: 13px; color: #16a34a; font-weight: 500;
    }
    .limit-msg {
      text-align: center; padding: 32px 20px;
    }
    .limit-msg h3 {
      font-family: 'Outfit', 'DM Sans', sans-serif;
      font-size: 16px; font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }
    .limit-msg p {
      font-size: 13px; color: var(--text-secondary);
      line-height: 1.5; margin: 0 0 16px 0;
    }
    .toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #1a1a1a; color: #fff;
      font-size: 12px; font-weight: 500;
      padding: 8px 16px; border-radius: 8px;
      opacity: 0; transition: opacity 0.3s ease;
      pointer-events: none; z-index: 10;
    }
    .toast.visible { opacity: 1; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes dotPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.7); }
    }
  `;

  // ==========================================
  // HELPERS
  // ==========================================
  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function makeEl(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  // ==========================================
  // NAME DETECTION (ToS-safe: title + URL only)
  // ==========================================
  const JUNK_NAMES = new Set([
    "linkedin", "messaging", "feed", "home", "notifications", "my network",
    "jobs", "post", "article", "search", "settings", "premium", "profile",
    "connections", "invitations", "messages", "loading", "undefined", "null",
  ]);

  function looksLikePersonName(text) {
    if (!text || text.length < 3) return false;
    const lower = text.toLowerCase().trim();
    if (JUNK_NAMES.has(lower)) return false;
    const words = text.trim().split(/\s+/);
    if (words.length < 2) return false;
    for (const w of words) {
      if (!/^[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u4e00-\u9fff'.()-]+$/.test(w)) return false;
    }
    return true;
  }

  function getNameFromPage() {
    const pageTitle = document.title || "";
    const url = window.location.pathname;

    // Profile/messaging title: "Name - Headline | LinkedIn"
    const fullMatch = pageTitle.match(/^(.+?)\s*[-\u2013\u2014]\s*(.+?)\s*\|\s*LinkedIn/);
    if (fullMatch) {
      const name = fullMatch[1].trim();
      const headline = fullMatch[2].trim();
      if (looksLikePersonName(name)) {
        let title = "", company = "";
        const atMatch = headline.match(/^(.+?)\s+at\s+(.+)$/i);
        if (atMatch) {
          title = atMatch[1].trim();
          company = atMatch[2].trim();
        } else {
          title = headline;
        }
        return { name, title, company };
      }
    }

    // Simple title: "Name | LinkedIn"
    const simpleMatch = pageTitle.match(/^(.+?)\s*\|\s*LinkedIn/);
    if (simpleMatch) {
      const name = simpleMatch[1].trim();
      if (looksLikePersonName(name)) {
        return { name, title: "", company: "" };
      }
    }

    // URL fallback: /in/sarah-chen-abc123
    const pathMatch = url.match(/\/in\/([^/]+)/);
    if (pathMatch) {
      const slug = pathMatch[1]
        .replace(/-[a-f0-9]{4,}$/i, "")
        .replace(/-/g, " ");
      const name = slug.replace(/\b\w/g, c => c.toUpperCase());
      if (looksLikePersonName(name)) {
        return { name, title: "", company: "" };
      }
    }

    return null;
  }

  // ==========================================
  // USAGE CHECK
  // ==========================================
  async function fetchRemaining() {
    try {
      const fingerprint = await getFingerprint();
      const res = await fetch(`${API_BASE}/api/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      });
      if (res.ok) {
        const data = await res.json();
        remainingGenerations = data.remaining;
        return data.remaining;
      }
    } catch {
      // silently fail — don't block UI
    }
    return null;
  }

  function updateRemainingBadge() {
    if (!panelShadow) return;
    const badge = panelShadow.getElementById("remaining-badge");
    if (badge && remainingGenerations !== null) {
      badge.textContent = `${remainingGenerations} left`;
      badge.style.display = "inline-block";
    }
  }

  // ==========================================
  // PANEL
  // ==========================================
  function createPanel() {
    if (panelRoot) return;

    currentTheme = "light"; // always warm theme

    panelRoot = document.createElement("div");
    panelRoot.id = "honeydew-panel-root";
    document.body.appendChild(panelRoot);
    panelShadow = panelRoot.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    panelShadow.appendChild(style);

    // Dim overlay (click to dismiss)
    const overlay = document.createElement("div");
    overlay.className = "honeydew-overlay";
    overlay.id = "honeydew-overlay";
    overlay.addEventListener("click", deactivateCommandMode);
    panelShadow.appendChild(overlay);

    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const shortcutLabel = isMac ? "\u2318\u21e7H" : "Ctrl+Shift+H";

    const panel = document.createElement("div");
    panel.className = "honeydew-panel theme-" + currentTheme;
    panel.innerHTML = `
      <div class="panel-header" id="panel-drag-handle">
        <div class="panel-header-left">
          <span class="panel-header-icon">${ICONS.honeydew}</span>
          <span class="panel-title" id="panel-title">Honeydew</span>
          <span class="remaining-badge" id="remaining-badge" style="display:none"></span>
        </div>
        <div class="panel-header-right">
          <button class="edit-context" id="panel-edit-ctx" title="Edit your info">edit</button>
          <button class="panel-cancel" id="panel-cancel" style="display:none">${ICONS.stop}</button>
          <button class="panel-close" id="panel-close">${ICONS.close}</button>
        </div>
      </div>
      <div class="panel-body" id="panel-body">
        <div class="idle-msg">Navigate to a profile, then press <kbd>${shortcutLabel}</kbd></div>
      </div>
    `;
    panelShadow.appendChild(panel);

    // Toast element for share feedback
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.id = "honeydew-toast";
    panelShadow.appendChild(toast);

    panelShadow.getElementById("panel-close").addEventListener("click", deactivateCommandMode);
    panelShadow.getElementById("panel-cancel").addEventListener("click", cancelResearch);
    panelShadow.getElementById("panel-edit-ctx").addEventListener("click", () => {
      if (isResearching) cancelResearch();
      showOnboardingForm(userContext);
    });
    initDrag(panel, panelShadow.getElementById("panel-drag-handle"));
  }

  function showPanel() {
    createPanel();
    const panel = panelShadow.querySelector(".honeydew-panel");
    const overlay = panelShadow.getElementById("honeydew-overlay");

    // Reset to centered position (undo any drag)
    panel.style.transform = "";
    panel.style.left = "";
    panel.style.top = "";

    requestAnimationFrame(() => {
      overlay.classList.add("visible");
      panel.classList.add("visible");
    });
    panelVisible = true;
  }

  function hidePanel() {
    if (!panelShadow) return;
    const panel = panelShadow.querySelector(".honeydew-panel");
    const overlay = panelShadow.getElementById("honeydew-overlay");
    if (panel) panel.classList.remove("visible");
    if (overlay) overlay.classList.remove("visible");
    panelVisible = false;
  }

  function setPanelTitle(text) {
    if (!panelShadow) return;
    const el = panelShadow.getElementById("panel-title");
    if (el) el.textContent = text || "Honeydew";
  }

  function setPanelBody(html) {
    if (!panelShadow) return;
    const el = panelShadow.getElementById("panel-body");
    if (el) el.innerHTML = html;
  }

  function showToast(message) {
    if (!panelShadow) return;
    const toast = panelShadow.getElementById("honeydew-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2000);
  }

  // ==========================================
  // COMMAND MODE
  // ==========================================
  async function activateCommandMode() {
    showPanel();

    // Fetch remaining in background
    fetchRemaining().then(() => updateRemainingBadge());

    // Load user context from storage if not cached
    if (!userContext) {
      const data = await chrome.storage.local.get(["honeydewUserContext"]);
      if (data.honeydewUserContext) {
        userContext = data.honeydewUserContext;
      }
    }

    // If no saved context, show onboarding form first
    if (!userContext) {
      showOnboardingForm();
      return;
    }

    const recipient = getNameFromPage();
    if (recipient) {
      startResearch(recipient);
    } else {
      setPanelTitle("Honeydew");
      setPanelBody('<div class="idle-msg">Navigate to a LinkedIn profile or conversation first</div>');
    }
  }

  function showOnboardingForm(prefill) {
    setPanelTitle("Honeydew");
    const targetVal = prefill ? escapeHtml(prefill.targetRole) : "";
    const expVal = prefill ? escapeHtml(prefill.experience) : "";
    setPanelBody(`
      <div class="onboarding">
        <h3 class="onboarding-heading">Quick setup</h3>
        <p class="onboarding-sub">Tell us a bit about your search so we can personalize your DMs.</p>
        <div class="onboarding-field">
          <label class="onboarding-label">What role or company are you targeting?</label>
          <input class="onboarding-input" id="onb-target" type="text" placeholder="e.g. Senior Frontend Engineer at Stripe" value="${targetVal}" />
        </div>
        <div class="onboarding-field">
          <label class="onboarding-label">What experience do you have for this?</label>
          <input class="onboarding-input" id="onb-experience" type="text" placeholder="e.g. 4 yrs React/TypeScript, built payments UI at Shopify" value="${expVal}" />
        </div>
        <button class="onboarding-btn" id="onb-save">Start researching</button>
      </div>
    `);

    const saveBtn = panelShadow.getElementById("onb-save");
    const targetInput = panelShadow.getElementById("onb-target");
    const expInput = panelShadow.getElementById("onb-experience");

    // Focus first field
    setTimeout(() => targetInput && targetInput.focus(), 100);

    // Enter key moves to next field / submits
    targetInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); expInput.focus(); }
    });
    expInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveBtn.click(); }
    });

    saveBtn.addEventListener("click", () => {
      const targetRole = targetInput.value.trim();
      const experience = expInput.value.trim();
      if (!targetRole || !experience) return;

      userContext = { targetRole, experience };
      chrome.storage.local.set({ honeydewUserContext: userContext });

      // Now proceed to research
      const recipient = getNameFromPage();
      if (recipient) {
        startResearch(recipient);
      } else {
        setPanelBody('<div class="idle-msg">Navigate to a LinkedIn profile or conversation first</div>');
      }
    });
  }

  function deactivateCommandMode() {
    if (isResearching) cancelResearch();
    hidePanel();
  }

  function toggleCommandMode() {
    panelVisible ? deactivateCommandMode() : activateCommandMode();
  }

  // ==========================================
  // LIMIT REACHED UI
  // ==========================================
  function showLimitReachedUI() {
    setPanelTitle("Honeydew");
    setPanelBody(`
      <div class="limit-msg">
        <h3>You've used all 3 free researches</h3>
        <p>Join the waitlist for unlimited access when we launch.</p>
        <div class="waitlist-capture">
          <div class="waitlist-capture-row">
            <input type="email" id="limit-email" placeholder="your@email.com" />
            <button id="limit-waitlist-btn">Get Early Access</button>
          </div>
        </div>
      </div>
    `);

    const emailInput = panelShadow.getElementById("limit-email");
    const btn = panelShadow.getElementById("limit-waitlist-btn");
    setTimeout(() => emailInput && emailInput.focus(), 100);

    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); btn.click(); }
    });

    btn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      if (!email || !email.includes("@")) return;
      btn.textContent = "Sending...";
      btn.disabled = true;
      try {
        const fingerprint = await getFingerprint();
        await fetch(`${API_BASE}/api/waitlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, fingerprint }),
        });
        const capture = panelShadow.querySelector(".waitlist-capture");
        if (capture) capture.innerHTML = '<span class="waitlist-success">You\'re on the list! We\'ll reach out soon.</span>';
      } catch {
        btn.textContent = "Try again";
        btn.disabled = false;
      }
    });
  }

  // ==========================================
  // DRAG
  // ==========================================
  function initDrag(panel, handle) {
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".panel-close") || e.target.closest(".panel-cancel")) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      panelStartX = rect.left;
      panelStartY = rect.top;
      // Switch from centered transform to absolute positioning on drag
      panel.style.transform = "none";
      panel.style.left = rect.left + "px";
      panel.style.top = rect.top + "px";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      panel.style.left = (panelStartX + e.clientX - dragStartX) + "px";
      panel.style.top = (panelStartY + e.clientY - dragStartY) + "px";
    });
    window.addEventListener("mouseup", () => { isDragging = false; });
  }

  // ==========================================
  // RESEARCH ENGINE (server proxy)
  // ==========================================
  async function runResearch(name, title, company) {
    abortController = new AbortController();
    const signal = abortController.signal;

    const fingerprint = await getFingerprint();

    // Ensure user context is loaded
    if (!userContext) {
      const data = await chrome.storage.local.get(["honeydewUserContext"]);
      if (data.honeydewUserContext) {
        userContext = data.honeydewUserContext;
      }
    }

    // Show initial searching state
    showSearchProgress(["Searching LinkedIn presence", "Looking for work & projects", "Checking recent news", "Cross-referencing"]);

    const response = await fetch(`${API_BASE}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fingerprint,
        name,
        title,
        company,
        userContext,
      }),
      signal,
    });

    // Handle limit reached
    if (response.status === 429) {
      remainingGenerations = 0;
      updateRemainingBadge();
      return { limitReached: true };
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (err.error === "no_results") {
        return { noResults: true, name };
      }
      return { error: err.error || "Server error" };
    }

    // Check if it's a JSON response (no_results) vs SSE stream
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.error === "no_results") {
        return { noResults: true, name };
      }
      return { error: data.error || "Unknown error" };
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotSearchEvent = false;

    showStreamingUI();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);

          try {
            const event = JSON.parse(payload);

            if (event.type === "search") {
              gotSearchEvent = true;
              // Already showing streaming UI at this point
            } else if (event.type === "token") {
              appendStreamToken(event.content);
            } else if (event.type === "done") {
              remainingGenerations = event.remaining;
              updateRemainingBadge();
            } else if (event.type === "error") {
              return { error: event.message || "Stream error" };
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (signal.aborted) return { cancelled: true };
      return { error: "Stream interrupted: " + err.message };
    }

    return { done: true, fullText: streamedText };
  }

  // ==========================================
  // UI HELPERS
  // ==========================================
  function showSearchProgress(labels) {
    const html = labels.map((label, i) =>
      `<div class="search-line" style="animation-delay:${i * 150}ms" id="search-${i}">
        <span class="search-dot active"></span>
        <span>${escapeHtml(label)}</span>
        <span class="search-status">...</span>
      </div>`
    ).join("");
    setPanelBody(html);
  }

  function showStreamingUI() {
    setPanelBody('<div class="stream-content" id="stream-text"><span class="stream-cursor"></span></div>');
  }

  // ==========================================
  // SMOOTH STREAMING
  // ==========================================
  function initStreamState(container) {
    streamState = {
      container,
      rawEl: null,
      cursor: null,
      dmSection: null,
      dmCardText: null,
      whoLabel: null,
      whoText: null,
      hooksLabel: null,
      hooksList: null,
      rawAccum: "",
      whoAccum: "",
      hooksAccum: "",
      dmAccum: "",
    };
  }

  function appendStreamToken(text) {
    streamedText += text;
    if (!renderPending) {
      renderPending = true;
      requestAnimationFrame(() => {
        renderPending = false;
        processStream();
      });
    }
  }

  function processStream() {
    if (!panelShadow || !isResearching) return;
    const container = panelShadow.getElementById("stream-text");
    if (!container) return;

    if (!streamState) initStreamState(container);
    const s = streamState;

    const whoMatch = streamedText.match(/WHO THEY ARE\n([\s\S]*?)(?=\nDM HOOKS\n|\nCOLD DM\n|$)/);
    const hooksMatch = streamedText.match(/DM HOOKS\n([\s\S]*?)(?=\nCOLD DM\n|$)/);
    const dmMatch = streamedText.match(/COLD DM\n([\s\S]*?)$/);

    const whoContent = whoMatch ? whoMatch[1].trim() : "";
    const hooksContent = hooksMatch ? hooksMatch[1].trim() : "";
    const dmContent = dmMatch ? dmMatch[1].trim() : "";
    const hasAnySection = whoMatch || hooksMatch || dmMatch;

    if (!hasAnySection) {
      if (!s.rawEl) {
        container.innerHTML = "";
        s.rawEl = makeEl("div", "raw-stream");
        s.rawEl.style.cssText = "white-space:pre-wrap;word-wrap:break-word;";
        container.appendChild(s.rawEl);
        s.cursor = makeEl("span", "stream-cursor");
        container.appendChild(s.cursor);
      }
      if (s.rawAccum !== streamedText) {
        s.rawAccum = streamedText;
        s.rawEl.textContent = streamedText;
      }
      return;
    }

    if (s.rawEl) {
      s.rawEl.remove();
      s.rawEl = null;
    }

    // COLD DM (insert at top)
    if (dmContent && !s.dmSection) {
      s.dmSection = makeEl("div", "dm-section");
      const dmLabel = makeEl("div", "dm-label");
      dmLabel.innerHTML = ICONS.honeydew + " COLD DM";
      s.dmSection.appendChild(dmLabel);
      s.dmCardText = makeEl("div", "dm-card");
      s.dmCardText.id = "dm-card";
      s.dmSection.appendChild(s.dmCardText);
      const copyRow = makeEl("div", "dm-copy-row");
      const copyBtn = makeEl("button", "dm-copy-btn");
      copyBtn.id = "dm-copy-btn";
      copyBtn.innerHTML = ICONS.copy + " Copy DM";
      copyRow.appendChild(copyBtn);
      const shareBtn = makeEl("button", "dm-share-btn");
      shareBtn.id = "dm-share-btn";
      shareBtn.innerHTML = ICONS.share + " Share";
      copyRow.appendChild(shareBtn);
      s.dmSection.appendChild(copyRow);
      container.insertBefore(s.dmSection, container.firstChild);
    }
    if (s.dmCardText && dmContent !== s.dmAccum) {
      s.dmAccum = dmContent;
      s.dmCardText.textContent = dmContent;
    }

    // WHO THEY ARE
    if (whoContent && !s.whoLabel) {
      s.whoLabel = makeEl("span", "section-label");
      s.whoLabel.textContent = "WHO THEY ARE";
      container.appendChild(s.whoLabel);
      s.whoText = makeEl("div", "who-text");
      container.appendChild(s.whoText);
    }
    if (s.whoText && whoContent !== s.whoAccum) {
      s.whoAccum = whoContent;
      s.whoText.textContent = whoContent;
    }

    // DM HOOKS
    if (hooksContent && !s.hooksLabel) {
      s.hooksLabel = makeEl("span", "section-label");
      s.hooksLabel.textContent = "DM HOOKS";
      container.appendChild(s.hooksLabel);
      s.hooksList = makeEl("div", "hooks-list");
      container.appendChild(s.hooksList);
    }
    if (s.hooksList && hooksContent !== s.hooksAccum) {
      s.hooksAccum = hooksContent;
      const lines = hooksContent.split("\n").filter(l => l.trim());
      const existing = s.hooksList.children.length;

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const bulletMatch = trimmed.match(/^[\u2022\u2023\-\*]\s*(.*)/);
        const text = bulletMatch ? bulletMatch[1] : trimmed;

        if (i < existing) {
          const hookText = s.hooksList.children[i].querySelector(".hook-text");
          if (hookText) hookText.textContent = text;
        } else {
          const hookLine = makeEl("div", "hook-line");
          const bullet = makeEl("span", "hook-bullet");
          bullet.textContent = "\u2022";
          hookLine.appendChild(bullet);
          const hookText = makeEl("span", "hook-text");
          hookText.textContent = text;
          hookLine.appendChild(hookText);
          s.hooksList.appendChild(hookLine);
        }
      }
    }

    if (!s.cursor) {
      s.cursor = makeEl("span", "stream-cursor");
      container.appendChild(s.cursor);
    }

    smoothScrollToBottom();
  }

  function smoothScrollToBottom() {
    const body = panelShadow.getElementById("panel-body");
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }

  function finishResearch(fullText) {
    if (!panelShadow) return;

    if (streamState) processStream();

    if (streamState && streamState.cursor) {
      const cursor = streamState.cursor;
      cursor.style.transition = "opacity 0.4s ease";
      cursor.style.opacity = "0";
      setTimeout(() => cursor.remove(), 400);
    }

    suggestedOpener = "";
    const match = fullText.match(/COLD DM\n([\s\S]*?)$/);
    if (match) suggestedOpener = match[1].trim();

    // Copy DM button
    const copyBtn = panelShadow.getElementById("dm-copy-btn");
    if (copyBtn && suggestedOpener) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(suggestedOpener).then(() => {
          copyBtn.innerHTML = `${ICONS.check} Copied!`;
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.innerHTML = `${ICONS.copy} Copy DM`;
            copyBtn.classList.remove("copied");
          }, 1500);
        });
      });
    }

    // Share button
    const shareBtn = panelShadow.getElementById("dm-share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        navigator.clipboard.writeText("https://tryhoney.xyz?ref=share").then(() => {
          shareBtn.innerHTML = `${ICONS.check} Copied!`;
          shareBtn.classList.add("copied");
          showToast("Link copied! Share it with a friend");
          setTimeout(() => {
            shareBtn.innerHTML = `${ICONS.share} Share`;
            shareBtn.classList.remove("copied");
          }, 1500);
        });
      });
    }

    // Show waitlist capture if low on remaining
    if (remainingGenerations !== null && remainingGenerations <= 1) {
      showWaitlistCapture();
    }

    showCancelButton(false);
    isResearching = false;
    streamState = null;
  }

  function showWaitlistCapture() {
    if (!panelShadow) return;
    const body = panelShadow.getElementById("panel-body");
    if (!body) return;

    const capture = makeEl("div", "waitlist-capture");
    capture.innerHTML = `
      <p>Want more? Join the waitlist for unlimited access</p>
      <div class="waitlist-capture-row">
        <input type="email" id="wl-email" placeholder="your@email.com" />
        <button id="wl-submit-btn">Get Early Access</button>
      </div>
    `;
    body.appendChild(capture);

    const emailInput = panelShadow.getElementById("wl-email");
    const submitBtn = panelShadow.getElementById("wl-submit-btn");

    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitBtn.click(); }
    });

    submitBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      if (!email || !email.includes("@")) return;
      submitBtn.textContent = "Sending...";
      submitBtn.disabled = true;
      try {
        const fingerprint = await getFingerprint();
        await fetch(`${API_BASE}/api/waitlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, fingerprint }),
        });
        capture.innerHTML = '<span class="waitlist-success">You\'re on the list! We\'ll reach out soon.</span>';
      } catch {
        submitBtn.textContent = "Try again";
        submitBtn.disabled = false;
      }
    });
  }

  function showCancelButton(show) {
    if (!panelShadow) return;
    const btn = panelShadow.getElementById("panel-cancel");
    if (btn) btn.style.display = show ? "flex" : "none";
  }

  function cancelResearch() {
    if (!isResearching) return;
    if (abortController) abortController.abort();
    isResearching = false;
    streamedText = "";
    suggestedOpener = "";
    renderPending = false;
    streamState = null;
    showCancelButton(false);
    setPanelTitle("Honeydew");
    setPanelBody('<div class="idle-msg">Research cancelled</div>');
  }

  function startResearch(recipient) {
    if (typeof recipient === "string") recipient = { name: recipient, title: "", company: "" };
    const { name, title, company } = recipient;

    if (isResearching && name === currentName) return;

    if (!looksLikePersonName(name)) {
      setPanelTitle("Honeydew");
      setPanelBody('<div class="idle-msg">Navigate to a LinkedIn profile or conversation first</div>');
      return;
    }

    currentName = name;
    lastResearchedName = name;
    isResearching = true;
    streamedText = "";
    suggestedOpener = "";
    renderPending = false;
    streamState = null;

    setPanelTitle("Researching " + name);
    showCancelButton(true);
    setPanelBody('<div class="search-line"><span class="search-dot active"></span><span>Starting research...</span></div>');

    runResearch(name, title, company).then((result) => {
      if (!isResearching) return;

      if (result.limitReached) {
        showCancelButton(false);
        isResearching = false;
        showLimitReachedUI();
      } else if (result.error) {
        showCancelButton(false);
        isResearching = false;
        setPanelBody(`<div class="error-msg">${escapeHtml(result.error)}</div>`);
      } else if (result.noResults) {
        showCancelButton(false);
        isResearching = false;
        setPanelBody(`<div class="idle-msg">No public info found for ${escapeHtml(result.name)}</div>`);
      } else if (result.cancelled) {
        // already handled
      } else if (result.done) {
        finishResearch(result.fullText);
        setPanelTitle(currentName);
      }
    }).catch((err) => {
      if (!isResearching) return;
      showCancelButton(false);
      isResearching = false;
      setPanelBody(`<div class="error-msg">Research failed: ${escapeHtml(err.message)}</div>`);
    });
  }

  // ==========================================
  // INIT — hotkey only, zero persistent UI
  // ==========================================
  console.log("[Honeydew] Content script loaded on", window.location.href);

  // Hotkey: Cmd+Shift+H (Mac) / Ctrl+Shift+H (Win/Linux)
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "h" || e.key === "H")) {
      e.preventDefault();
      e.stopPropagation();
      toggleCommandMode();
    }
    if (e.key === "Escape" && panelVisible) {
      e.preventDefault();
      deactivateCommandMode();
    }
  });
})();
