// Honeydew content script — Liquid Glass dock + Frosted floating panel + Streaming
// All research logic runs HERE (not in background SW) to avoid Manifest V3 SW termination

(function () {
  "use strict";

  // ==========================================
  // STATE
  // ==========================================
  let dockRoot = null;
  let dockShadow = null;
  let panelRoot = null;
  let panelShadow = null;
  let lastResearchedName = "";
  let currentName = "";
  let streamedText = "";
  let isResearching = false;
  let panelVisible = false;
  let suggestedOpener = "";
  let currentRecipient = null;
  let currentTheme = "dark";
  let themeManualOverride = false;
  let abortController = null;
  let renderPending = false;
  let streamState = null;
  // Drag state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panelStartX = 0;
  let panelStartY = 0;
  // URL change detection
  let lastCheckedUrl = "";
  let lastCheckedTitle = "";
  let debounceTimer = null;

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

  function applyTheme() {
    if (themeManualOverride) return;
    const theme = detectPageTheme();
    if (theme === currentTheme) return;
    currentTheme = theme;
    if (dockShadow) {
      const dock = dockShadow.querySelector(".dock");
      if (dock) {
        dock.classList.remove("theme-dark", "theme-light");
        dock.classList.add("theme-" + theme);
      }
    }
    if (panelShadow) {
      const panel = panelShadow.querySelector(".honeydew-panel");
      if (panel) {
        panel.classList.remove("theme-dark", "theme-light");
        panel.classList.add("theme-" + theme);
      }
    }
  }

  // ==========================================
  // SVG ICONS
  // ==========================================
  const ICONS = {
    honeydew: `<svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor" stroke="none"><path d="M16 2C16 2 6 13 6 20a10 10 0 0 0 20 0c0-7-10-18-10-18z"/><path d="M13 22a3.5 3.5 0 0 1-2-3c0-2 2-5 2-5" stroke="white" fill="none" stroke-width="2" stroke-linecap="round" opacity="0.4"/></svg>`,
    research: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    sun: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  };

  // ==========================================
  // SVG GLASS DISTORTION FILTER
  // ==========================================
  const GLASS_FILTER_SVG = `
    <svg style="position:absolute;width:0;height:0;pointer-events:none;">
      <filter id="honeydew-glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
        <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence"/>
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/>
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0"/>
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5"/>
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap"/>
        <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lighting-color="white" result="specLight">
          <fePointLight x="-200" y="-200" z="300"/>
        </feSpecularLighting>
        <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/>
        <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </svg>
  `;

  // ==========================================
  // DOCK CSS
  // ==========================================
  const DOCK_CSS = `
    :host {
      all: initial;
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
    }
    .dock.theme-dark {
      --glass-tint: rgba(20, 20, 30, 0.6);
      --glass-border: rgba(255, 255, 255, 0.12);
      --shine-top: rgba(255, 255, 255, 0.15);
      --shine-bottom: rgba(255, 255, 255, 0.05);
      --icon-color: rgba(255, 255, 255, 0.65);
      --icon-hover-color: #fff;
      --icon-hover-bg: rgba(255, 255, 255, 0.1);
      --separator-color: rgba(255, 255, 255, 0.1);
      --dock-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    }
    .dock.theme-light {
      --glass-tint: rgba(255, 255, 255, 0.35);
      --glass-border: rgba(255, 255, 255, 0.45);
      --shine-top: rgba(255, 255, 255, 0.5);
      --shine-bottom: rgba(255, 255, 255, 0.2);
      --icon-color: rgba(0, 0, 0, 0.5);
      --icon-hover-color: rgba(0, 0, 0, 0.85);
      --icon-hover-bg: rgba(255, 255, 255, 0.3);
      --separator-color: rgba(0, 0, 0, 0.08);
      --dock-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }
    .dock {
      pointer-events: auto;
      position: relative;
      display: flex;
      overflow: hidden;
      border-radius: 24px;
      padding: 10px 14px;
      box-shadow: var(--dock-shadow);
      transition: all 0.7s cubic-bezier(0.175, 0.885, 0.32, 2.2);
      cursor: default;
      user-select: none; -webkit-user-select: none;
    }
    .dock:hover { padding: 12px 16px; border-radius: 28px; }
    .dock .glass-layer-blur {
      position: absolute; inset: 0; z-index: 0;
      overflow: hidden; border-radius: inherit;
      backdrop-filter: blur(24px) saturate(200%);
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      filter: url(#honeydew-glass-distortion);
      isolation: isolate;
    }
    .dock .glass-layer-tint {
      position: absolute; inset: 0; z-index: 10;
      border-radius: inherit;
      background: var(--glass-tint);
    }
    .dock .glass-layer-shine {
      position: absolute; inset: 0; z-index: 20;
      border-radius: inherit; overflow: hidden;
      box-shadow: inset 0 1px 0 0 var(--shine-top), inset 0 -1px 0 0 var(--shine-bottom);
      border: 1px solid var(--glass-border);
    }
    .dock-content {
      position: relative; z-index: 30;
      display: flex; align-items: center; gap: 4px;
    }
    .dock-item {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px;
      border: none; border-radius: 12px;
      background: transparent;
      color: var(--icon-color);
      cursor: pointer;
      transition: all 0.7s cubic-bezier(0.175, 0.885, 0.32, 2.2);
      position: relative; transform-origin: center center;
      user-select: none; -webkit-user-select: none;
      overflow: hidden;
    }
    .dock-item:hover {
      color: var(--icon-hover-color);
      transform: scale(1.2);
      background: var(--icon-hover-bg);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
    }
    .dock-item:active { transform: scale(0.92); }
    .dock-item.active { color: #f59e0b; background: rgba(59, 130, 246, 0.12); }
    .dock-item.pulsing { animation: dockGlow 2s ease-in-out infinite; }
    .dock-item.loading::after {
      content: ''; position: absolute; inset: -3px;
      border-radius: 14px;
      border: 2px solid transparent;
      border-top-color: #f59e0b;
      animation: dockSpin 0.8s linear infinite;
    }
    .dock-separator { width: 1px; height: 20px; background: var(--separator-color); margin: 0 4px; }
    @keyframes dockGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
      50% { box-shadow: 0 0 12px 4px rgba(59, 130, 246, 0.2); }
    }
    @keyframes dockSpin { to { transform: rotate(360deg); } }
  `;

  // ==========================================
  // PANEL CSS
  // ==========================================
  const PANEL_CSS = `
    :host {
      all: initial;
      position: fixed; top: 0; left: 0; width: 0; height: 0;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
    }
    .honeydew-panel.theme-dark {
      --panel-bg: rgba(20, 20, 30, 0.72);
      --panel-border: rgba(255, 255, 255, 0.1);
      --panel-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
      --text-primary: rgba(255, 255, 255, 0.88);
      --text-secondary: rgba(255, 255, 255, 0.5);
      --text-muted: rgba(255, 255, 255, 0.25);
      --border-subtle: rgba(255, 255, 255, 0.06);
      --hover-bg: rgba(255, 255, 255, 0.08);
      --scrollbar-thumb: rgba(255, 255, 255, 0.1);
      --dot-failed: rgba(255, 255, 255, 0.15);
      --fallback-border: rgba(255, 255, 255, 0.05);
      --dm-bg: rgba(59, 130, 246, 0.1);
      --dm-border: rgba(59, 130, 246, 0.22);
      --copy-bg: rgba(59, 130, 246, 0.08);
      --copy-border: rgba(59, 130, 246, 0.25);
      --copy-hover-bg: rgba(59, 130, 246, 0.18);
    }
    .honeydew-panel.theme-light {
      --panel-bg: rgba(255, 255, 255, 0.45);
      --panel-border: rgba(255, 255, 255, 0.55);
      --panel-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
      --text-primary: rgba(0, 0, 0, 0.78);
      --text-secondary: rgba(0, 0, 0, 0.5);
      --text-muted: rgba(0, 0, 0, 0.25);
      --border-subtle: rgba(0, 0, 0, 0.06);
      --hover-bg: rgba(0, 0, 0, 0.06);
      --scrollbar-thumb: rgba(0, 0, 0, 0.1);
      --dot-failed: rgba(0, 0, 0, 0.15);
      --fallback-border: rgba(0, 0, 0, 0.05);
      --dm-bg: rgba(59, 130, 246, 0.06);
      --dm-border: rgba(59, 130, 246, 0.18);
      --copy-bg: rgba(59, 130, 246, 0.05);
      --copy-border: rgba(59, 130, 246, 0.2);
      --copy-hover-bg: rgba(59, 130, 246, 0.12);
    }
    .honeydew-panel {
      pointer-events: auto;
      position: fixed;
      top: 80px;
      left: calc(50% - 200px);
      width: 400px;
      max-height: calc(100vh - 120px);
      background: var(--panel-bg);
      backdrop-filter: blur(28px) saturate(200%);
      -webkit-backdrop-filter: blur(28px) saturate(200%);
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      box-shadow: var(--panel-shadow);
      overflow: hidden;
      display: flex; flex-direction: column;
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .honeydew-panel.visible { opacity: 1; }
    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px 10px;
      cursor: grab; user-select: none;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .panel-header:active { cursor: grabbing; }
    .panel-header-left { display: flex; align-items: center; gap: 10px; }
    .panel-header-icon { color: #f59e0b; display: flex; }
    .panel-title {
      font-size: 14px; font-weight: 600;
      color: var(--text-primary);
      overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; max-width: 250px;
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
    .panel-cancel { color: #dc2626; }
    .panel-cancel:hover { color: #ef4444; background: rgba(220, 38, 38, 0.1); }
    .panel-body {
      padding: 14px 18px 18px;
      overflow-y: auto; flex: 1;
      max-height: calc(100vh - 200px);
      scroll-behavior: smooth;
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
    .search-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }
    .search-dot.active { animation: dotPulse 1.2s ease-in-out infinite; }
    .search-dot.done { background: #22c55e; }
    .search-dot.failed { background: var(--dot-failed); }
    .search-status { margin-left: auto; font-size: 10.5px; color: var(--text-muted); }
    .stream-content {
      font-size: 13px; line-height: 1.65;
      color: var(--text-primary);
      word-wrap: break-word;
      letter-spacing: 0.01em;
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
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: #f59e0b;
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
    .dm-copy-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 8px 16px;
      border: 1px solid var(--copy-border);
      border-radius: 10px;
      background: var(--copy-bg);
      color: #f59e0b;
      font-size: 12px; font-weight: 600;
      letter-spacing: 0.03em;
      cursor: pointer; transition: all 0.15s ease;
      font-family: inherit;
    }
    .dm-copy-btn:hover { background: var(--copy-hover-bg); transform: translateY(-1px); }
    .dm-copy-btn:active { transform: translateY(0); }
    .dm-copy-btn.copied { color: #22c55e; border-color: rgba(34, 197, 94, 0.3); background: rgba(34, 197, 94, 0.08); }
    .section-label {
      display: block;
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: #f59e0b;
      margin-top: 16px; margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(59, 130, 246, 0.15);
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
      color: #f59e0b; font-weight: 700; flex-shrink: 0; margin-top: 1px;
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
      background: #f59e0b; vertical-align: text-bottom;
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
      color: var(--text-muted); font-size: 12.5px; line-height: 1.6;
    }
    .error-msg {
      text-align: center; padding: 24px 16px;
      color: #dc2626; font-size: 12.5px;
    }
    .fallback-item {
      padding: 6px 0;
      border-bottom: 1px solid var(--fallback-border);
    }
    .fallback-title { color: var(--text-primary); font-size: 12.5px; font-weight: 500; }
    .fallback-snippet { color: var(--text-secondary); font-size: 11.5px; margin-top: 2px; }
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
  // PAGE TYPE DETECTION
  // ==========================================
  function isProfilePage() {
    return /^\/in\/[^/]+\/?$/.test(window.location.pathname);
  }

  function isMessagingPage() {
    return window.location.pathname.includes("/messaging");
  }

  // ==========================================
  // NAME DETECTION
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

  function detectRecipient() {
    if (isProfilePage()) {
      const h1 = document.querySelector("h1");
      if (h1) {
        const name = h1.textContent.trim();
        if (looksLikePersonName(name)) {
          let title = "";
          let company = "";
          const headline = document.querySelector(".text-body-medium");
          if (headline) {
            const fullHeadline = headline.textContent.trim();
            const atMatch = fullHeadline.match(/^(.+?)\s+at\s+(.+)$/i);
            const commaMatch = fullHeadline.match(/^(.+?),\s*(.+)$/);
            if (atMatch) {
              title = atMatch[1].trim();
              company = atMatch[2].trim();
            } else if (commaMatch) {
              title = commaMatch[1].trim();
              company = commaMatch[2].trim();
            } else {
              title = fullHeadline;
            }
          }
          return { name, title, company };
        }
      }
      const pageTitle = document.title || "";
      const pm = pageTitle.match(/^(.+?)\s*[-–—|]\s*/);
      if (pm && looksLikePersonName(pm[1].trim())) {
        return { name: pm[1].trim(), title: "", company: "" };
      }
      return null;
    }

    function grabMessagingHeadline() {
      const headerParas = document.querySelectorAll(".msg-entity-lockup__entity-title ~ p, .msg-overlay-bubble-header__subtitle, .msg-s-message-list-container ~ p");
      for (const p of headerParas) {
        const t = p.textContent.trim();
        if (t && t.length > 3 && t.length < 120) return t;
      }
      return "";
    }

    const title = document.title || "";
    const m = title.match(/^(.+?)\s*[\|–—-]\s*(?:LinkedIn|Messaging)/i);
    if (m) {
      const name = m[1].trim();
      if (looksLikePersonName(name)) {
        return { name, title: grabMessagingHeadline(), company: "" };
      }
    }
    const h2s = document.querySelectorAll("h2");
    for (const h2 of h2s) {
      const t = h2.textContent.trim();
      if (looksLikePersonName(t)) {
        return { name: t, title: grabMessagingHeadline(), company: "" };
      }
    }
    const links = document.querySelectorAll('a[href*="/in/"]');
    for (const link of links) {
      const t = link.textContent.trim();
      if (looksLikePersonName(t)) {
        const r = link.getBoundingClientRect();
        if (r.top > 0 && r.top < window.innerHeight * 0.6 && r.width > 30) {
          return { name: t, title: grabMessagingHeadline(), company: "" };
        }
      }
    }
    return null;
  }

  // ==========================================
  // DOCK
  // ==========================================
  function createDock() {
    if (dockRoot) return;
    currentTheme = detectPageTheme();

    dockRoot = document.createElement("div");
    dockRoot.id = "honeydew-dock-root";
    document.body.appendChild(dockRoot);
    dockShadow = dockRoot.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = DOCK_CSS;
    dockShadow.appendChild(style);

    const filterContainer = document.createElement("div");
    filterContainer.innerHTML = GLASS_FILTER_SVG;
    dockShadow.appendChild(filterContainer);

    const dock = document.createElement("div");
    dock.className = "dock theme-" + currentTheme;
    dock.innerHTML = `
      <div class="glass-layer-blur"></div>
      <div class="glass-layer-tint"></div>
      <div class="glass-layer-shine"></div>
      <div class="dock-content">
        <button class="dock-item" id="dock-honeydew">${ICONS.honeydew}</button>
        <div class="dock-separator"></div>
        <button class="dock-item" id="dock-research">${ICONS.research}</button>
        <button class="dock-item" id="dock-settings">${ICONS.settings}</button>
        <div class="dock-separator"></div>
        <button class="dock-item" id="dock-theme">${currentTheme === "dark" ? ICONS.moon : ICONS.sun}</button>
      </div>
    `;
    dockShadow.appendChild(dock);

    dockShadow.getElementById("dock-honeydew").addEventListener("click", togglePanel);

    dockShadow.getElementById("dock-research").addEventListener("click", () => {
      const recipient = detectRecipient();
      if (recipient) {
        lastResearchedName = "";
        startResearch(recipient);
      } else if (currentRecipient) {
        lastResearchedName = "";
        startResearch(currentRecipient);
      } else if (currentName) {
        lastResearchedName = "";
        startResearch(currentName);
      } else {
        showPanel();
        setPanelTitle("Honeydew");
        setPanelBody('<div class="idle-msg">No one found on this page</div>');
      }
    });

    dockShadow.getElementById("dock-settings").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "open-settings" });
    });

    dockShadow.getElementById("dock-theme").addEventListener("click", () => {
      themeManualOverride = true;
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      const dock = dockShadow.querySelector(".dock");
      if (dock) {
        dock.classList.remove("theme-dark", "theme-light");
        dock.classList.add("theme-" + currentTheme);
      }
      if (panelShadow) {
        const panel = panelShadow.querySelector(".honeydew-panel");
        if (panel) {
          panel.classList.remove("theme-dark", "theme-light");
          panel.classList.add("theme-" + currentTheme);
        }
      }
      const btn = dockShadow.getElementById("dock-theme");
      btn.innerHTML = currentTheme === "dark" ? ICONS.moon : ICONS.sun;
    });
  }

  function setDockLoading(on) {
    if (!dockShadow) return;
    const el = dockShadow.getElementById("dock-honeydew");
    if (on) el.classList.add("loading"); else el.classList.remove("loading");
  }

  function setDockPulsing(on) {
    if (!dockShadow) return;
    const el = dockShadow.getElementById("dock-honeydew");
    if (on) el.classList.add("pulsing"); else el.classList.remove("pulsing");
  }

  // ==========================================
  // PANEL
  // ==========================================
  function createPanel() {
    if (panelRoot) return;

    panelRoot = document.createElement("div");
    panelRoot.id = "honeydew-panel-root";
    document.body.appendChild(panelRoot);
    panelShadow = panelRoot.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    panelShadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "honeydew-panel theme-" + currentTheme;
    panel.innerHTML = `
      <div class="panel-header" id="panel-drag-handle">
        <div class="panel-header-left">
          <span class="panel-header-icon">${ICONS.honeydew}</span>
          <span class="panel-title" id="panel-title">Honeydew</span>
        </div>
        <div class="panel-header-right">
          <button class="panel-cancel" id="panel-cancel" style="display:none">${ICONS.stop}</button>
          <button class="panel-close" id="panel-close">${ICONS.close}</button>
        </div>
      </div>
      <div class="panel-body" id="panel-body">
        <div class="idle-msg">Open a DM or visit a profile to start researching</div>
      </div>
    `;
    panelShadow.appendChild(panel);

    panelShadow.getElementById("panel-close").addEventListener("click", hidePanel);
    panelShadow.getElementById("panel-cancel").addEventListener("click", cancelResearch);
    initDrag(panel, panelShadow.getElementById("panel-drag-handle"));
  }

  function showPanel() {
    createPanel();
    const panel = panelShadow.querySelector(".honeydew-panel");
    requestAnimationFrame(() => panel.classList.add("visible"));
    panelVisible = true;
    if (dockShadow) dockShadow.getElementById("dock-honeydew").classList.add("active");
  }

  function hidePanel() {
    if (!panelShadow) return;
    panelShadow.querySelector(".honeydew-panel").classList.remove("visible");
    panelVisible = false;
    if (dockShadow) dockShadow.getElementById("dock-honeydew").classList.remove("active");
  }

  function togglePanel() { panelVisible ? hidePanel() : showPanel(); }

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

  // ==========================================
  // DRAG
  // ==========================================
  function initDrag(panel, handle) {
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".panel-close")) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      panelStartX = rect.left;
      panelStartY = rect.top;
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
  // RESEARCH ENGINE
  // ==========================================
  const COMMON_NAMES = new Set([
    "michael chapman", "john smith", "james johnson", "robert williams",
    "david brown", "michael jones", "james miller", "robert davis",
    "michael wilson", "john taylor", "james anderson", "robert thomas",
    "david jackson", "michael white", "john harris", "james martin",
    "robert thompson", "david garcia", "michael martinez", "john robinson",
    "james clark", "robert rodriguez", "david lewis", "michael lee",
    "john walker", "james hall", "robert allen", "david young",
    "michael hernandez", "john king", "james wright", "robert lopez",
    "david hill", "michael scott", "john green", "james adams",
    "robert baker", "david gonzalez", "michael nelson", "john carter",
    "james mitchell", "robert perez", "david roberts", "michael turner",
    "john phillips", "james campbell", "robert parker", "david evans",
    "michael edwards", "john collins", "james stewart", "robert sanchez",
    "david morris", "michael rogers", "john reed", "james cook",
    "robert morgan", "david bell", "michael murphy", "john bailey",
    "james rivera", "robert cooper", "david richardson", "michael cox",
    "john howard", "james ward", "robert torres", "david peterson",
    "michael gray", "john ramirez", "james james", "robert watson",
    "david brooks", "michael kelly", "john sanders", "james price",
    "robert bennett", "david wood", "michael barnes", "john ross",
    "james henderson", "robert coleman", "david jenkins", "michael perry",
    "john powell", "james long", "robert patterson", "david hughes",
    "michael flores", "john washington", "james butler", "robert simmons",
    "david foster", "michael gonzales", "john bryant", "james alexander",
    "robert russell", "david griffin", "michael diaz", "john hayes",
  ]);

  function isCommonName(name) {
    return COMMON_NAMES.has(name.toLowerCase().trim());
  }

  async function tavilySearch(query, apiKey, signal) {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 5,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Tavily error: ${response.status}`);
    }

    const json = await response.json();
    return json.results || [];
  }

  async function streamClaude(name, title, company, searchResults, apiKey, onToken, signal) {
    const resultsText = searchResults
      .map((r, i) => `[Result ${i + 1}] (relevance: ${r.score || 0})\nTitle: ${r.title}\nURL: ${r.url}\nContent: ${r.content || "N/A"}`)
      .join("\n\n---\n\n");

    const titleStr = title ? `, ${title}` : "";
    const companyStr = company ? ` at ${company}` : "";

    const prompt = `You are Honeydew — a cold DM research assistant for job seekers. I'm about to message ${name}${titleStr}${companyStr} on LinkedIn and I need ACTIONABLE intel to write a killer personalized cold DM.

Here is what we found about them online (results are ranked by relevance to this specific person):

${resultsText}

Give me a fast research brief I can scan in 10 seconds. Use these EXACT section headers (ALL CAPS, each on its own line):

WHO THEY ARE
[1 sentence max. What do they actually DO — not their job title, but what they're known for or working on right now.]

DM HOOKS
• [Something specific they did/built/wrote that I can reference in my opening line]
• [A recent win, project, or milestone I can congratulate them on]
• [A shared interest or angle I could use to build rapport]
• [An opinion they expressed publicly that I could reference]
[Give me 3-5 hooks. Each must be SPECIFIC — name the project, article, company, or event. "They have experience in tech" is useless. "They built the recommendation engine at Spotify" is gold.]

COLD DM
[Write me a ready-to-send cold DM. MAX 200 CHARACTERS — this is a hard limit, count carefully. 1-2 sentences. Reference ONE specific hook from above. Sound like a real person, not a salesperson. No fluff.]

Rules:
- NEVER refuse, ask clarifying questions, or say you can't identify the person. ALWAYS pick the most likely match from the search results and go with it.
- ALWAYS use the exact 3 section headers above (WHO THEY ARE, DM HOOKS, COLD DM). No other format. No preamble before WHO THEY ARE.
- Every hook must name a SPECIFIC thing (project name, article title, event, company, metric)
- No generic filler like "extensive experience" or "passionate about innovation"
- No URLs or links — I just need the facts
- If the search results are thin, work with what you have — some intel is better than none
- Write like a sharp friend briefing me before a networking event`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "chrome-extension://honeydew",
        "X-Title": "Honeydew",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4",
        max_tokens: 1024,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

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
        if (payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullText += delta;
            onToken(delta);
          }
        } catch (e) { /* skip malformed */ }
      }
    }

    return fullText;
  }

  async function runResearch(name, title, company) {
    abortController = new AbortController();
    const signal = abortController.signal;

    const data = await chrome.storage.local.get(["tavilyApiKey", "openrouterApiKey", "honeydewEnabled"]);

    if (data.honeydewEnabled === false) return { error: "Honeydew is disabled in settings" };
    if (!data.tavilyApiKey || !data.openrouterApiKey) return { error: "Set your API keys in Honeydew settings (click gear icon in dock)" };

    const contextParts = [company, title].filter(Boolean);
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts[nameParts.length - 1] || "";
    const contextStr = contextParts.join(" ");

    const queries = [];
    if (contextParts.length > 0) {
      queries.push(`${name} ${contextStr} LinkedIn profile`.trim());
    } else {
      queries.push(`${name} LinkedIn profile`.trim());
    }
    queries.push(`${name} ${contextStr} work OR projects OR portfolio`.trim());
    queries.push(`${name} ${contextStr} news OR interview OR podcast`.trim());
    if (isCommonName(name)) {
      queries.push(`"${firstName} ${lastName}" ${contextStr} professional background`.trim());
    }
    queries.push(`site:linkedin.com/in "${name}" ${contextStr}`.trim());

    const searchLabels = [
      "Searching LinkedIn presence",
      "Looking for work & projects",
      "Checking recent news",
      isCommonName(name) ? "Disambiguating common name" : "Cross-referencing",
      "Deep LinkedIn search",
    ].slice(0, queries.length);

    showSearchProgress(searchLabels);

    const allResults = [];
    const searchPromises = queries.map(async (query, index) => {
      try {
        const results = await tavilySearch(query, data.tavilyApiKey, signal);
        allResults[index] = results;
        updateSearchStatus(index, results.length, "done");
        return results;
      } catch (err) {
        if (signal.aborted) throw err;
        allResults[index] = [];
        updateSearchStatus(index, 0, "failed");
        return [];
      }
    });

    await Promise.all(searchPromises);

    const flatResults = allResults.flat();
    if (flatResults.length === 0) return { noResults: true, name };

    const scoredResults = flatResults.map((r) => {
      const text = ((r.title || "") + " " + (r.content || "") + " " + (r.url || "")).toLowerCase();
      let score = 0;
      if (text.includes(name.toLowerCase())) score += 10;
      if (firstName && text.includes(firstName.toLowerCase())) score += 3;
      if (lastName && text.includes(lastName.toLowerCase())) score += 3;
      for (const part of contextParts) {
        if (text.includes(part.toLowerCase())) score += 5;
      }
      if (r.url && r.url.includes("linkedin.com/in/")) score += 4;
      return { ...r, score };
    });

    scoredResults.sort((a, b) => b.score - a.score);
    const topResults = scoredResults.filter((r) => r.score >= 3).slice(0, 12);

    if (topResults.length === 0) return { noResults: true, name };

    showStreamingUI();

    try {
      const fullText = await streamClaude(
        name, title, company, topResults, data.openrouterApiKey,
        (token) => appendStreamToken(token),
        signal
      );
      return { done: true, fullText };
    } catch (err) {
      if (signal.aborted) return { cancelled: true };
      return { error: "Claude analysis failed: " + err.message };
    }
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

  function updateSearchStatus(index, count, state) {
    if (!panelShadow) return;
    const line = panelShadow.getElementById("search-" + index);
    if (!line) return;
    const dot = line.querySelector(".search-dot");
    const status = line.querySelector(".search-status");
    if (dot) dot.className = "search-dot " + state;
    if (status) status.textContent = state === "done" ? count + " found" : "skipped";
  }

  function showStreamingUI() {
    setPanelBody('<div class="stream-content" id="stream-text"><span class="stream-cursor"></span></div>');
  }

  // ==========================================
  // SMOOTH STREAMING — persistent DOM, zero innerHTML flicker
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

    // Phase 1: raw text before sections
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

    // Transition: remove raw element
    if (s.rawEl) {
      s.rawEl.remove();
      s.rawEl = null;
    }

    // Phase 2: structured sections — create nodes once, only update textContent

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
        const bulletMatch = trimmed.match(/^[\u2022•\-\*]\s*(.*)/);
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

    // Cursor
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

    setDockLoading(false);
    showCancelButton(false);
    isResearching = false;
    streamState = null;
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
    setDockLoading(false);
    setDockPulsing(false);
    showCancelButton(false);
    setPanelTitle("Honeydew");
    setPanelBody('<div class="idle-msg">Research cancelled</div>');
  }

  function startResearch(recipient) {
    if (typeof recipient === "string") recipient = { name: recipient, title: "", company: "" };
    const { name, title, company } = recipient;

    if (isResearching && name === currentName) return;

    if (!looksLikePersonName(name)) {
      showPanel();
      setPanelTitle("Honeydew");
      setPanelBody('<div class="idle-msg">No one found on this page</div>');
      return;
    }

    currentName = name;
    lastResearchedName = name;
    isResearching = true;
    streamedText = "";
    suggestedOpener = "";
    renderPending = false;
    streamState = null;

    showPanel();
    setPanelTitle("Researching " + name);
    setDockLoading(true);
    setDockPulsing(false);
    showCancelButton(true);
    setPanelBody('<div class="search-line"><span class="search-dot active"></span><span>Starting research...</span></div>');

    runResearch(name, title, company).then((result) => {
      if (!isResearching) return;

      if (result.error) {
        setDockLoading(false);
        showCancelButton(false);
        isResearching = false;
        setPanelBody(`<div class="error-msg">${escapeHtml(result.error)}</div>`);
      } else if (result.noResults) {
        setDockLoading(false);
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
      setDockLoading(false);
      showCancelButton(false);
      isResearching = false;
      setPanelBody(`<div class="error-msg">Research failed: ${escapeHtml(err.message)}</div>`);
    });
  }

  // ==========================================
  // INIT
  // ==========================================
  console.log("[Honeydew] Content script loaded on", window.location.href);

  createDock();

  setInterval(applyTheme, 3000);

  function checkForRecipient() {
    if (!isMessagingPage() && !isProfilePage()) return;
    const url = window.location.href;
    const title = document.title;
    if (url === lastCheckedUrl && title === lastCheckedTitle) return;
    lastCheckedUrl = url;
    lastCheckedTitle = title;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const recipient = detectRecipient();
      if (!recipient) {
        if (panelVisible) {
          setPanelTitle("Honeydew");
          setPanelBody('<div class="idle-msg">No one found on this page</div>');
        }
        return;
      }
      if (recipient.name === lastResearchedName) return;
      setDockPulsing(true);
      if (isMessagingPage()) {
        startResearch(recipient);
      } else {
        currentName = recipient.name;
        currentRecipient = recipient;
      }
    }, 1000);
  }

  setTimeout(checkForRecipient, 1500);

  const observer = new MutationObserver(() => {
    if (!document.getElementById("honeydew-dock-root")) {
      dockRoot = null;
      dockShadow = null;
      createDock();
    }
    checkForRecipient();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
