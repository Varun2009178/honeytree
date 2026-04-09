// Scout content script — Liquid Glass dock + Frosted floating panel + Streaming
// Auto-detects light/dark mode and inverts: dark dock on light pages, light dock on dark pages

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
  let currentTheme = "dark"; // "dark" = dark dock (light page), "light" = light dock (dark page)
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
    // Check page background brightness — dark dock on light pages, light dock on dark pages
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
    const theme = detectPageTheme();
    if (theme === currentTheme) return;
    currentTheme = theme;
    console.log("[Scout] Theme changed to:", theme);

    if (dockShadow) {
      const dock = dockShadow.querySelector(".dock");
      if (dock) {
        dock.classList.remove("theme-dark", "theme-light");
        dock.classList.add("theme-" + theme);
      }
    }
    if (panelShadow) {
      const panel = panelShadow.querySelector(".scout-panel");
      if (panel) {
        panel.classList.remove("theme-dark", "theme-light");
        panel.classList.add("theme-" + theme);
      }
    }
  }

  // ==========================================
  // SVG ICONS (inline for shadow DOM)
  // ==========================================
  const ICONS = {
    scout: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`,
    research: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    copy: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };

  // ==========================================
  // SVG GLASS DISTORTION FILTER (from liquid-glass.tsx)
  // ==========================================
  const GLASS_FILTER_SVG = `
    <svg style="position:absolute;width:0;height:0;pointer-events:none;">
      <filter id="scout-glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
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
  // DOCK CSS — uses CSS custom properties for theme switching
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

    /* --- Theme: dark dock (shown on light pages) --- */
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
      --tooltip-bg: rgba(255, 255, 255, 0.9);
      --tooltip-color: rgba(0, 0, 0, 0.8);
    }

    /* --- Theme: light dock (shown on dark pages) --- */
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
      --tooltip-bg: rgba(0, 0, 0, 0.75);
      --tooltip-color: rgba(255, 255, 255, 0.9);
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
    }

    .dock:hover {
      padding: 12px 16px;
      border-radius: 28px;
    }

    .dock .glass-layer-blur {
      position: absolute; inset: 0; z-index: 0;
      overflow: hidden; border-radius: inherit;
      backdrop-filter: blur(24px) saturate(200%);
      -webkit-backdrop-filter: blur(24px) saturate(200%);
      filter: url(#scout-glass-distortion);
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
    }

    .dock-item:hover {
      color: var(--icon-hover-color);
      transform: scale(1.2);
      background: var(--icon-hover-bg);
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
    }

    .dock-item:active { transform: scale(0.92); }

    .dock-item.active {
      color: #6366f1;
      background: rgba(99, 102, 241, 0.12);
    }

    .dock-item.pulsing { animation: dockGlow 2s ease-in-out infinite; }

    .dock-item.loading::after {
      content: ''; position: absolute; inset: -3px;
      border-radius: 14px;
      border: 2px solid transparent;
      border-top-color: #6366f1;
      animation: dockSpin 0.8s linear infinite;
    }

    .dock-item .tooltip {
      position: absolute; bottom: -30px; left: 50%;
      transform: translateX(-50%) scale(0.9);
      padding: 4px 10px;
      background: var(--tooltip-bg);
      color: var(--tooltip-color);
      font-size: 11px; font-weight: 500;
      border-radius: 8px; white-space: nowrap;
      opacity: 0; pointer-events: none;
      transition: all 0.2s ease;
      backdrop-filter: blur(8px);
    }

    .dock-item:hover .tooltip {
      opacity: 1; transform: translateX(-50%) scale(1);
    }

    .dock-separator {
      width: 1px; height: 20px;
      background: var(--separator-color);
      margin: 0 4px;
    }

    @keyframes dockGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
      50% { box-shadow: 0 0 12px 4px rgba(99, 102, 241, 0.2); }
    }
    @keyframes dockSpin { to { transform: rotate(360deg); } }
  `;

  // ==========================================
  // PANEL CSS — theme-aware frosted glass
  // ==========================================
  const PANEL_CSS = `
    :host {
      all: initial;
      position: fixed; top: 0; left: 0; width: 0; height: 0;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
    }

    /* --- Theme: dark panel (light pages) --- */
    .scout-panel.theme-dark {
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
    }

    /* --- Theme: light panel (dark pages) --- */
    .scout-panel.theme-light {
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
    }

    .scout-panel {
      pointer-events: auto;
      position: fixed;
      top: 80px;
      left: calc(50% - 180px);
      width: 360px;
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

    .scout-panel.visible { opacity: 1; }

    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px 10px;
      cursor: grab; user-select: none;
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .panel-header:active { cursor: grabbing; }

    .panel-header-left { display: flex; align-items: center; gap: 10px; }
    .panel-header-icon { color: #6366f1; display: flex; }

    .panel-title {
      font-size: 14px; font-weight: 600;
      color: var(--text-primary);
      overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; max-width: 250px;
    }

    .panel-close {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px;
      border: none; border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer; transition: all 0.15s ease;
    }
    .panel-close:hover {
      background: var(--hover-bg);
      color: var(--text-secondary);
    }

    .panel-body {
      padding: 14px 18px 18px;
      overflow-y: auto; flex: 1;
      max-height: calc(100vh - 200px);
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

    .search-dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; flex-shrink: 0; }
    .search-dot.active { animation: dotPulse 1.2s ease-in-out infinite; }
    .search-dot.done { background: #22c55e; }
    .search-dot.failed { background: var(--dot-failed); }

    .search-status { margin-left: auto; font-size: 10.5px; color: var(--text-muted); }

    .stream-content {
      font-size: 13px; line-height: 1.75;
      color: var(--text-primary);
      white-space: pre-wrap; word-wrap: break-word;
      letter-spacing: 0.01em;
    }

    .section-label {
      display: block;
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: #6366f1;
      margin-top: 18px; margin-bottom: 4px;
    }
    .section-label:first-child { margin-top: 0; }

    .stream-cursor {
      display: inline-block; width: 2px; height: 1.1em;
      background: #6366f1; vertical-align: text-bottom;
      margin-left: 2px; animation: cursorBlink 1s step-end infinite;
    }

    .panel-footer {
      padding: 10px 18px;
      border-top: 1px solid var(--border-subtle);
      font-size: 10.5px; color: var(--text-muted);
      flex-shrink: 0;
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
    @keyframes cursorBlink { 50% { opacity: 0; } }
  `;

  // ==========================================
  // HELPERS
  // ==========================================
  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  // ==========================================
  // NAME DETECTION
  // ==========================================
  function detectRecipient() {
    const title = document.title || "";
    const m = title.match(/^(.+?)\s*[\|–—-]\s*(?:LinkedIn|Messaging)/i);
    if (m) {
      const name = m[1].trim();
      if (name && name.length > 1 && name.length < 60 && name !== "Messaging") {
        console.log("[Scout] Detected from page title:", name);
        return { name, title: "", company: "" };
      }
    }
    const h2s = document.querySelectorAll("h2");
    for (const h2 of h2s) {
      const t = h2.textContent.trim();
      if (t && t.length > 2 && t.length < 60) {
        console.log("[Scout] Detected from h2:", t);
        return { name: t, title: "", company: "" };
      }
    }
    const links = document.querySelectorAll('a[href*="/in/"]');
    for (const link of links) {
      const t = link.textContent.trim();
      if (t && t.length > 2 && t.length < 60 && !t.toLowerCase().includes("linkedin")) {
        const r = link.getBoundingClientRect();
        if (r.top > 0 && r.top < window.innerHeight * 0.6 && r.width > 30) {
          console.log("[Scout] Detected from profile link:", t);
          return { name: t, title: "", company: "" };
        }
      }
    }
    console.log("[Scout] Auto-detection failed");
    return null;
  }

  // ==========================================
  // DOCK (Liquid Glass)
  // ==========================================
  function createDock() {
    if (dockRoot) return;

    currentTheme = detectPageTheme();

    dockRoot = document.createElement("div");
    dockRoot.id = "scout-dock-root";
    document.body.appendChild(dockRoot);
    dockShadow = dockRoot.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = DOCK_CSS;
    dockShadow.appendChild(style);

    const filterContainer = document.createElement("div");
    filterContainer.innerHTML = GLASS_FILTER_SVG;
    dockShadow.appendChild(filterContainer);

    // Dock layout: Scout | sep | Research | Settings | sep | Copy (far right)
    const dock = document.createElement("div");
    dock.className = "dock theme-" + currentTheme;
    dock.innerHTML = `
      <div class="glass-layer-blur"></div>
      <div class="glass-layer-tint"></div>
      <div class="glass-layer-shine"></div>
      <div class="dock-content">
        <button class="dock-item" id="dock-scout">
          ${ICONS.scout}
          <span class="tooltip">Scout</span>
        </button>
        <div class="dock-separator"></div>
        <button class="dock-item" id="dock-research">
          ${ICONS.research}
          <span class="tooltip">Research</span>
        </button>
        <button class="dock-item" id="dock-settings">
          ${ICONS.settings}
          <span class="tooltip">Settings</span>
        </button>
        <div class="dock-separator"></div>
        <button class="dock-item" id="dock-copy">
          ${ICONS.copy}
          <span class="tooltip">Copy DM</span>
        </button>
      </div>
    `;
    dockShadow.appendChild(dock);

    // --- Dock click handlers ---
    dockShadow.getElementById("dock-scout").addEventListener("click", togglePanel);

    dockShadow.getElementById("dock-research").addEventListener("click", () => {
      const recipient = detectRecipient();
      if (recipient) {
        lastResearchedName = "";
        startResearch(recipient.name);
      } else if (currentName) {
        lastResearchedName = "";
        startResearch(currentName);
      }
    });

    dockShadow.getElementById("dock-settings").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "open-settings" });
    });

    dockShadow.getElementById("dock-copy").addEventListener("click", () => {
      if (!suggestedOpener) return;
      navigator.clipboard.writeText(suggestedOpener).then(() => {
        const btn = dockShadow.getElementById("dock-copy");
        btn.style.color = "#22c55e";
        setTimeout(() => { btn.style.color = ""; }, 1500);
      });
    });
  }

  function setDockLoading(on) {
    if (!dockShadow) return;
    const el = dockShadow.getElementById("dock-scout");
    if (on) el.classList.add("loading"); else el.classList.remove("loading");
  }

  function setDockPulsing(on) {
    if (!dockShadow) return;
    const el = dockShadow.getElementById("dock-scout");
    if (on) el.classList.add("pulsing"); else el.classList.remove("pulsing");
  }

  // ==========================================
  // PANEL (Frosted Glass, floating, draggable)
  // ==========================================
  function createPanel() {
    if (panelRoot) return;

    panelRoot = document.createElement("div");
    panelRoot.id = "scout-panel-root";
    document.body.appendChild(panelRoot);
    panelShadow = panelRoot.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    panelShadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "scout-panel theme-" + currentTheme;
    panel.innerHTML = `
      <div class="panel-header" id="panel-drag-handle">
        <div class="panel-header-left">
          <span class="panel-header-icon">${ICONS.scout}</span>
          <span class="panel-title" id="panel-title">Scout</span>
        </div>
        <button class="panel-close" id="panel-close">${ICONS.close}</button>
      </div>
      <div class="panel-body" id="panel-body">
        <div class="idle-msg">Open a LinkedIn DM to start researching</div>
      </div>
    `;
    panelShadow.appendChild(panel);

    panelShadow.getElementById("panel-close").addEventListener("click", hidePanel);
    initDrag(panel, panelShadow.getElementById("panel-drag-handle"));
  }

  function showPanel() {
    createPanel();
    const panel = panelShadow.querySelector(".scout-panel");
    requestAnimationFrame(() => panel.classList.add("visible"));
    panelVisible = true;
    if (dockShadow) dockShadow.getElementById("dock-scout").classList.add("active");
  }

  function hidePanel() {
    if (!panelShadow) return;
    panelShadow.querySelector(".scout-panel").classList.remove("visible");
    panelVisible = false;
    if (dockShadow) dockShadow.getElementById("dock-scout").classList.remove("active");
  }

  function togglePanel() { panelVisible ? hidePanel() : showPanel(); }

  function setPanelTitle(text) {
    if (!panelShadow) return;
    const el = panelShadow.getElementById("panel-title");
    if (el) el.textContent = text || "Scout";
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
  // STREAMING TEXT
  // ==========================================
  function appendStreamToken(text) {
    if (!panelShadow) return;
    const container = panelShadow.getElementById("stream-text");
    if (!container) return;
    streamedText += text;
    container.innerHTML = formatStreamedText(streamedText) + '<span class="stream-cursor"></span>';
    const body = panelShadow.getElementById("panel-body");
    if (body) body.scrollTop = body.scrollHeight;
  }

  function formatStreamedText(raw) {
    let html = escapeHtml(raw);
    html = html.replace(/^(WHO THEY ARE)\n/gm, '<span class="section-label">$1</span>');
    html = html.replace(/^(DM HOOKS)\n/gm, '<span class="section-label">$1</span>');
    html = html.replace(/^(COLD DM)\n/gm, '<span class="section-label">$1</span>');
    return html;
  }

  function finishStream() {
    if (!panelShadow) return;
    const cursor = panelShadow.querySelector(".stream-cursor");
    if (cursor) cursor.remove();

    const match = streamedText.match(/COLD DM\n([\s\S]*?)$/);
    if (match) suggestedOpener = match[1].trim();

    const body = panelShadow.getElementById("panel-body");
    if (body) {
      const footer = document.createElement("div");
      footer.className = "panel-footer";
      footer.textContent = "Done — click Copy DM in dock to grab the message";
      body.appendChild(footer);
    }
    setDockLoading(false);
    isResearching = false;
  }

  // ==========================================
  // RESEARCH FLOW
  // ==========================================
  function startResearch(name) {
    if (isResearching && name === currentName) return;
    console.log("[Scout] Starting research for:", name);
    currentName = name;
    lastResearchedName = name;
    isResearching = true;
    streamedText = "";
    suggestedOpener = "";

    showPanel();
    setPanelTitle("Researching " + name);
    setDockLoading(true);
    setDockPulsing(false);

    setPanelBody(`
      <div class="search-line" style="animation-delay:0ms">
        <span class="search-dot active"></span>
        <span>Starting research...</span>
      </div>
    `);

    chrome.runtime.sendMessage({ action: "research", name, title: "", company: "" });
  }

  // ==========================================
  // MESSAGE LISTENER (from background.js)
  // ==========================================
  chrome.runtime.onMessage.addListener((msg) => {
    console.log("[Scout] Content received:", msg.action);

    switch (msg.action) {
      case "research-started": {
        currentName = msg.name || currentName;
        setPanelTitle("Researching " + currentName);
        const html = (msg.searchLabels || []).map((label, i) =>
          `<div class="search-line" style="animation-delay:${i * 150}ms" id="search-${i}">
            <span class="search-dot active"></span>
            <span>${escapeHtml(label)}</span>
            <span class="search-status">...</span>
          </div>`
        ).join("");
        setPanelBody(html);
        break;
      }

      case "search-complete": {
        if (!panelShadow) break;
        const line = panelShadow.getElementById("search-" + msg.index);
        if (!line) break;
        const dot = line.querySelector(".search-dot");
        const status = line.querySelector(".search-status");
        if (dot) dot.className = "search-dot done";
        if (status) status.textContent = msg.resultCount + " found";
        break;
      }

      case "search-failed": {
        if (!panelShadow) break;
        const line = panelShadow.getElementById("search-" + msg.index);
        if (!line) break;
        const dot = line.querySelector(".search-dot");
        const status = line.querySelector(".search-status");
        if (dot) dot.className = "search-dot failed";
        if (status) status.textContent = "skipped";
        break;
      }

      case "structuring":
        setPanelBody('<div class="stream-content" id="stream-text"><span class="stream-cursor"></span></div>');
        break;

      case "stream-token":
        appendStreamToken(msg.text);
        break;

      case "stream-done":
        finishStream();
        setPanelTitle(currentName);
        break;

      case "no-results":
        setDockLoading(false);
        isResearching = false;
        setPanelBody(`<div class="idle-msg">No public info found for ${escapeHtml(msg.name || currentName)}</div>`);
        setPanelTitle(msg.name || currentName);
        break;

      case "error":
        setDockLoading(false);
        isResearching = false;
        setPanelBody(`<div class="error-msg">${escapeHtml(msg.message)}</div>`);
        break;

      case "profile-fallback": {
        setDockLoading(false);
        isResearching = false;
        const items = (msg.items || []).map(item =>
          `<div class="fallback-item">
            <div class="fallback-title">${escapeHtml(item.title)}</div>
            <div class="fallback-snippet">${escapeHtml(item.snippet)}</div>
          </div>`
        ).join("");
        setPanelBody(items || '<div class="idle-msg">No results</div>');
        setPanelTitle(currentName);
        break;
      }
    }
  });

  // ==========================================
  // INIT
  // ==========================================
  console.log("[Scout] Content script loaded on", window.location.href);

  createDock();

  // Re-check theme periodically (handles LinkedIn theme toggle without reload)
  setInterval(applyTheme, 3000);

  function checkForRecipient() {
    if (!window.location.pathname.includes("/messaging")) return;
    const url = window.location.href;
    const title = document.title;
    if (url === lastCheckedUrl && title === lastCheckedTitle) return;
    lastCheckedUrl = url;
    lastCheckedTitle = title;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const recipient = detectRecipient();
      if (!recipient) return;
      if (recipient.name === lastResearchedName) return;
      console.log("[Scout] New recipient detected:", recipient.name);
      setDockPulsing(true);
      startResearch(recipient.name);
    }, 1000);
  }

  setTimeout(checkForRecipient, 1500);

  const observer = new MutationObserver(() => {
    if (!document.getElementById("scout-dock-root")) {
      dockRoot = null;
      dockShadow = null;
      createDock();
    }
    checkForRecipient();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
