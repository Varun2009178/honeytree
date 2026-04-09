// Scout content script
// Detects LinkedIn DM recipient from page DOM, injects research sidebar

(function () {
  "use strict";

  let lastResearchedName = "";
  let sidebarRoot = null;
  let shadowRoot = null;
  let debounceTimer = null;

  const SIDEBAR_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@500;600&display=swap');

    :host {
      all: initial;
      font-family: 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      position: fixed;
      top: 0;
      right: 0;
      width: min(320px, 25vw);
      height: 100vh;
      z-index: 2147483647;
      pointer-events: none;
    }

    .scout-sidebar {
      pointer-events: auto;
      width: 100%;
      height: 100%;
      background: #ffffff;
      border-left: 1px solid #e5e7eb;
      box-shadow: rgba(44, 30, 116, 0.16) 0px 0px 15px;
      overflow-y: auto;
      padding: 24px;
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .scout-sidebar.visible {
      transform: translateX(0);
    }

    .scout-toggle {
      pointer-events: auto;
      position: absolute;
      top: 50%;
      left: -32px;
      transform: translateY(-50%);
      width: 28px;
      height: 56px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-right: none;
      border-radius: 9999px 0 0 9999px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: #3b82f6;
      box-shadow: rgba(44, 30, 116, 0.11) -3px 0px 10px;
    }

    .scout-toggle:hover {
      background: #f2f3f5;
    }

    .scout-header-name {
      font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: #222222;
      line-height: 1.10;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .scout-header-title {
      font-size: 0.875rem;
      font-weight: 400;
      color: #45515e;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: -8px;
    }

    .scout-divider {
      height: 1px;
      background: #f2f3f5;
      border: none;
      margin: 4px 0;
    }

    .scout-search-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      opacity: 0;
      animation: scoutFadeIn 0.3s ease forwards;
    }

    .scout-search-line .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
      flex-shrink: 0;
    }

    .scout-search-line .dot.active {
      animation: scoutPulse 1s ease-in-out infinite;
    }

    .scout-search-line .dot.done {
      background: #3b82f6;
    }

    .scout-search-line .dot.failed {
      background: #8e8e93;
    }

    .scout-search-line .label {
      font-weight: 600;
      color: #222222;
    }

    .scout-search-line .status {
      font-weight: 400;
      color: #8e8e93;
      margin-left: auto;
    }

    .scout-section-heading {
      font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 1rem;
      font-weight: 600;
      color: #222222;
      margin-top: 8px;
    }

    .scout-section-item {
      font-size: 0.875rem;
      font-weight: 400;
      color: #222222;
      line-height: 1.50;
      padding-left: 12px;
      border-left: 3px solid #3b82f6;
      margin: 4px 0;
    }

    .scout-summary {
      font-size: 0.875rem;
      font-weight: 400;
      color: #222222;
      line-height: 1.50;
    }

    .scout-sources {
      font-size: 0.75rem;
      font-weight: 400;
      color: #8e8e93;
    }

    .scout-refresh-btn {
      font-family: 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #333333;
      background: #f0f0f0;
      border: none;
      border-radius: 9999px;
      padding: 8px 16px;
      cursor: pointer;
      align-self: flex-start;
      transition: background 0.2s ease;
    }

    .scout-refresh-btn:hover {
      background: #e5e7eb;
    }

    .scout-idle-msg {
      font-size: 0.875rem;
      font-weight: 400;
      color: #8e8e93;
      text-align: center;
      padding: 20px 0;
    }

    .scout-manual-input {
      font-family: 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 0.875rem;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      outline: none;
      color: #222222;
      background: #ffffff;
      width: 100%;
      transition: border-color 0.2s ease;
    }

    .scout-manual-input:focus {
      border-color: #3b82f6;
    }

    .scout-search-btn {
      font-family: 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      color: #ffffff;
      background: #181e25;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      cursor: pointer;
      width: 100%;
      transition: background 0.2s ease;
    }

    .scout-search-btn:hover {
      background: #2563eb;
    }

    .scout-error-msg {
      font-size: 0.875rem;
      font-weight: 400;
      color: #45515e;
      text-align: center;
      padding: 24px 16px;
    }

    .scout-structuring-msg {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #3b82f6;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .scout-structuring-msg .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
      animation: scoutPulse 1s ease-in-out infinite;
    }

    .scout-fallback-item {
      font-size: 0.8125rem;
      line-height: 1.50;
      padding: 8px 0;
      border-bottom: 1px solid #f2f3f5;
    }

    .scout-fallback-item .fallback-title {
      font-weight: 600;
      color: #222222;
    }

    .scout-fallback-item .fallback-snippet {
      font-weight: 400;
      color: #45515e;
      margin-top: 2px;
    }

    .scout-fallback-item a {
      color: #3b82f6;
      text-decoration: none;
      font-size: 0.75rem;
    }

    .scout-fallback-item a:hover {
      text-decoration: underline;
    }

    @keyframes scoutFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes scoutPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;

  // --- SIMPLE NAME DETECTION ---

  function detectRecipient() {
    // Try to auto-detect who the user is messaging.
    // Simple strategies — no complex DOM walking.

    // 1. Page title: LinkedIn messaging titles are often "FirstName LastName | LinkedIn"
    const title = document.title || "";
    const titleMatch = title.match(/^(.+?)\s*[\|–—-]\s*(?:LinkedIn|Messaging)/i);
    if (titleMatch) {
      const name = titleMatch[1].trim();
      if (name && name.length > 1 && name.length < 60 && name !== "Messaging") {
        console.log("[Scout] Detected from page title:", name);
        return { name, title: "", company: "" };
      }
    }

    // 2. Any h2 on the page (LinkedIn uses h2 for conversation partner names)
    const h2s = document.querySelectorAll("h2");
    for (const h2 of h2s) {
      const text = h2.textContent.trim();
      if (text && text.length > 2 && text.length < 60) {
        console.log("[Scout] Detected from h2:", text);
        return { name: text, title: "", company: "" };
      }
    }

    // 3. Profile links (/in/) — the person's name is often a link to their profile
    const profileLinks = document.querySelectorAll('a[href*="/in/"]');
    for (const link of profileLinks) {
      const text = link.textContent.trim();
      if (text && text.length > 2 && text.length < 60 && !text.toLowerCase().includes("linkedin")) {
        const rect = link.getBoundingClientRect();
        if (rect.top > 0 && rect.top < window.innerHeight * 0.6 && rect.width > 30) {
          console.log("[Scout] Detected from profile link:", text);
          return { name: text, title: "", company: "" };
        }
      }
    }

    console.log("[Scout] Auto-detection failed — user can type name manually");
    return null;
  }

  // --- MUTATION OBSERVER ---

  function onDomChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const recipient = detectRecipient();

      if (!recipient) {
        // Don't clear sidebar — keep showing idle/manual input state
        return;
      }

      if (recipient.name === lastResearchedName) {
        return; // Already researched this person
      }

      lastResearchedName = recipient.name;
      startResearch(recipient.name);
    }, 500);
  }

  function startResearch(name) {
    ensureSidebar();
    updateSidebar("loading", { name });

    chrome.runtime.sendMessage({
      action: "research",
      name: name,
      title: "",
      company: "",
    });
  }

  // --- MESSAGE LISTENER (from background.js) ---

  chrome.runtime.onMessage.addListener((msg) => {
    switch (msg.action) {
      case "research-started":
        updateSidebar("searching", {
          name: msg.name,
          title: msg.title,
          company: msg.company,
          searchLabels: msg.searchLabels,
        });
        break;
      case "search-complete":
        updateSidebar("search-update", {
          index: msg.index,
          resultCount: msg.resultCount,
          done: false,
        });
        break;
      case "search-failed":
        updateSidebar("search-update", {
          index: msg.index,
          failed: true,
        });
        break;
      case "structuring":
        updateSidebar("structuring", {});
        break;
      case "profile-ready":
        updateSidebar("profile", { profile: msg.profile });
        break;
      case "profile-fallback":
        updateSidebar("fallback", { items: msg.items });
        break;
      case "no-results":
        updateSidebar("no-results", { name: msg.name });
        break;
      case "error":
        updateSidebar("error", { message: msg.message });
        break;
    }
  });

  // --- SIDEBAR (Shadow DOM) ---

  // State held across updates
  let currentSearchLabels = [];
  let currentName = "";
  let currentTitle = "";
  let currentCompany = "";

  function ensureSidebar() {
    if (sidebarRoot) return;

    sidebarRoot = document.createElement("div");
    sidebarRoot.id = "scout-root";
    document.body.appendChild(sidebarRoot);

    shadowRoot = sidebarRoot.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = SIDEBAR_CSS;
    shadowRoot.appendChild(style);

    const sidebar = document.createElement("div");
    sidebar.className = "scout-sidebar";
    sidebar.innerHTML = getIdleHtml();
    shadowRoot.appendChild(sidebar);

    attachManualSearchHandler();

    const toggle = document.createElement("button");
    toggle.className = "scout-toggle";
    toggle.textContent = "S";
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("visible");
    });
    shadowRoot.appendChild(toggle);

    // Show sidebar immediately
    requestAnimationFrame(() => {
      sidebar.classList.add("visible");
    });
  }

  function getIdleHtml() {
    return `
      <div class="scout-header-name">Scout</div>
      <hr class="scout-divider">
      <div class="scout-idle-msg">Research anyone — type a name or Scout will auto-detect from the page.</div>
      <input type="text" class="scout-manual-input" id="scout-name-input" placeholder="Type a name to research...">
      <button class="scout-search-btn" id="scout-search-btn">Research</button>
    `;
  }

  function attachManualSearchHandler() {
    if (!shadowRoot) return;
    const btn = shadowRoot.getElementById("scout-search-btn");
    const input = shadowRoot.getElementById("scout-name-input");
    if (!btn || !input) return;

    const doSearch = () => {
      const name = input.value.trim();
      if (!name) return;
      lastResearchedName = name;
      startResearch(name);
    };

    btn.addEventListener("click", doSearch);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }

  function updateSidebar(state, data) {
    if (!shadowRoot) return;
    const sidebar = shadowRoot.querySelector(".scout-sidebar");
    if (!sidebar) return;

    switch (state) {
      case "idle":
        sidebar.innerHTML = getIdleHtml();
        attachManualSearchHandler();
        break;

      case "loading":
        currentName = data.name || "";
        sidebar.innerHTML = `
          <div class="scout-header-name">${escapeHtml(data.name)}</div>
          <p class="scout-structuring-msg"><span class="dot"></span> Starting research...</p>
        `;
        break;

      case "searching":
        currentName = data.name || "";
        currentTitle = data.title || "";
        currentCompany = data.company || "";
        currentSearchLabels = data.searchLabels || [];

        const titleLine = currentTitle && currentCompany
          ? `${currentTitle} at ${currentCompany}`
          : currentTitle || currentCompany || "";

        let searchLines = currentSearchLabels.map((label, i) =>
          `<div class="scout-search-line" style="animation-delay: ${i * 200}ms" id="scout-search-${i}">
            <span class="dot active"></span>
            <span class="label">${escapeHtml(label)}</span>
            <span class="status">...</span>
          </div>`
        ).join("");

        sidebar.innerHTML = `
          <div class="scout-header-name">${escapeHtml(currentName)}</div>
          ${titleLine ? `<div class="scout-header-title">${escapeHtml(titleLine)}</div>` : ""}
          <hr class="scout-divider">
          ${searchLines}
        `;
        break;

      case "search-update": {
        const line = shadowRoot.getElementById(`scout-search-${data.index}`);
        if (!line) break;
        const dot = line.querySelector(".dot");
        const status = line.querySelector(".status");
        if (data.failed) {
          dot.className = "dot failed";
          status.textContent = "Skipped";
        } else {
          dot.className = "dot done";
          status.textContent = `Found ${data.resultCount} results`;
        }
        break;
      }

      case "structuring": {
        // Append structuring message after search lines
        const existing = sidebar.querySelector(".scout-structuring-msg");
        if (!existing) {
          const msg = document.createElement("p");
          msg.className = "scout-structuring-msg";
          msg.innerHTML = `<span class="dot"></span> Structuring profile...`;
          sidebar.appendChild(msg);
        }
        break;
      }

      case "profile": {
        const p = data.profile;

        // Display talking points as clean bullets
        let talkingPointsHtml = "";
        if (p.talking_points && p.talking_points.length > 0) {
          talkingPointsHtml = `
            <div class="scout-section-heading">Talking Points</div>
            ${p.talking_points.map((item) => `<div class="scout-section-item">${escapeHtml(item)}</div>`).join("")}
          `;
        }

        sidebar.innerHTML = `
          <div class="scout-header-name">${escapeHtml(currentName)}</div>
          <hr class="scout-divider">
          ${p.background ? `<div class="scout-summary">${escapeHtml(p.background)}</div>` : ""}
          ${talkingPointsHtml}
          <hr class="scout-divider">
          <div class="scout-sources">Based on ${p.source_count || 0} sources</div>
          <button class="scout-refresh-btn" id="scout-refresh">Refresh</button>
          <hr class="scout-divider">
          <input type="text" class="scout-manual-input" id="scout-name-input" placeholder="Research someone else...">
          <button class="scout-search-btn" id="scout-search-btn">Research</button>
        `;

        // Attach refresh handler
        const refreshBtn = shadowRoot.getElementById("scout-refresh");
        if (refreshBtn) {
          refreshBtn.addEventListener("click", () => {
            lastResearchedName = "";
            startResearch(currentName);
          });
        }
        attachManualSearchHandler();
        break;
      }

      case "fallback": {
        const titleLine3 = currentTitle && currentCompany
          ? `${currentTitle} at ${currentCompany}`
          : currentTitle || currentCompany || "";

        const itemsHtml = data.items.map((item) => `
          <div class="scout-fallback-item">
            <div class="fallback-title">${escapeHtml(item.title)}</div>
            <div class="fallback-snippet">${escapeHtml(item.snippet)}</div>
            ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank">Source</a>` : ""}
          </div>
        `).join("");

        sidebar.innerHTML = `
          <div class="scout-header-name">${escapeHtml(currentName)}</div>
          ${titleLine3 ? `<div class="scout-header-title">${escapeHtml(titleLine3)}</div>` : ""}
          <hr class="scout-divider">
          <div class="scout-error-msg">AI synthesis unavailable. Raw results:</div>
          ${itemsHtml}
          <button class="scout-refresh-btn" id="scout-refresh">Refresh</button>
        `;

        const refreshBtn2 = shadowRoot.getElementById("scout-refresh");
        if (refreshBtn2) {
          refreshBtn2.addEventListener("click", () => {
            lastResearchedName = "";
            onDomChange();
          });
        }
        break;
      }

      case "no-results":
        sidebar.innerHTML = `
          <div class="scout-header-name">${escapeHtml(data.name || currentName)}</div>
          <hr class="scout-divider">
          <div class="scout-idle-msg">Not much found publicly about ${escapeHtml(data.name || currentName)}</div>
          <button class="scout-refresh-btn" id="scout-refresh">Refresh</button>
        `;
        const refreshBtn3 = shadowRoot.getElementById("scout-refresh");
        if (refreshBtn3) {
          refreshBtn3.addEventListener("click", () => {
            lastResearchedName = "";
            onDomChange();
          });
        }
        break;

      case "error":
        sidebar.innerHTML = `
          <div class="scout-error-msg">${escapeHtml(data.message)}</div>
        `;
        break;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // --- FLOATING SCOUT BUTTON ---

  function createScoutButton() {
    const btn = document.createElement("button");
    btn.id = "scout-trigger-btn";
    btn.textContent = "Scout";
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483646;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 9999px;
      padding: 12px 24px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: rgba(44, 30, 116, 0.16) 0px 4px 12px;
      transition: all 0.2s ease;
    `;

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#2563eb";
      btn.style.transform = "scale(1.05)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#3b82f6";
      btn.style.transform = "scale(1)";
    });

    btn.addEventListener("click", () => {
      // Try to auto-detect the person's name
      const recipient = detectRecipient();

      if (recipient) {
        // Found someone — research them
        lastResearchedName = recipient.name;
        ensureSidebar();
        startResearch(recipient.name);
      } else {
        // Couldn't find name — show sidebar with manual input
        ensureSidebar();
        const sidebar = shadowRoot.querySelector(".scout-sidebar");
        if (sidebar) sidebar.classList.add("visible");
      }
    });

    document.body.appendChild(btn);
  }

  // --- INIT ---

  console.log("[Scout] Content script loaded on", window.location.href);

  // Only show the Scout button on messaging pages
  if (window.location.pathname.includes("/messaging")) {
    createScoutButton();
  }

  // Watch for navigation to messaging (LinkedIn is a SPA)
  const urlObserver = new MutationObserver(() => {
    if (window.location.pathname.includes("/messaging") && !document.getElementById("scout-trigger-btn")) {
      createScoutButton();
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });
})();
