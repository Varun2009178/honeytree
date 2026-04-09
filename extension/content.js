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
      padding: 40px 16px;
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

  // --- DOM DETECTION ---

  function detectRecipient() {
    // Strategy: find the compose textbox, then walk up to find the conversation header
    // LinkedIn uses role="textbox" or contenteditable for the message input
    const textboxes = document.querySelectorAll(
      '[role="textbox"][contenteditable="true"]'
    );

    // Find the one inside the messaging area
    let composeBox = null;
    for (const tb of textboxes) {
      if (isInMessagingArea(tb)) {
        composeBox = tb;
        break;
      }
    }

    if (!composeBox) return null;

    // Walk up from compose box to find conversation header
    // The header contains the recipient's name (typically h2 or a prominent link)
    const conversationContainer = findConversationContainer(composeBox);
    if (!conversationContainer) return null;

    const nameEl = findNameElement(conversationContainer);
    if (!nameEl) return null;

    const name = nameEl.textContent.trim();
    if (!name) return null;

    // Title/company is usually in a subtitle element near the name
    const titleCompany = findTitleCompany(conversationContainer, nameEl);

    return {
      name,
      title: titleCompany.title,
      company: titleCompany.company,
    };
  }

  function isInMessagingArea(element) {
    // Walk up ancestors looking for messaging-related containers
    let current = element;
    let depth = 0;
    while (current && depth < 20) {
      // Check for messaging-related attributes and URL patterns
      const classes = current.className || "";
      const id = current.id || "";
      if (
        classes.includes("messaging") ||
        id.includes("messaging") ||
        current.tagName === "MAIN"
      ) {
        return true;
      }
      current = current.parentElement;
      depth++;
    }
    // Also check the URL as a signal
    return window.location.pathname.includes("/messaging");
  }

  function findConversationContainer(composeBox) {
    // Walk up from compose box to find the conversation thread container
    // Look for a container that has both the header and the compose area
    let current = composeBox;
    let depth = 0;
    while (current && depth < 15) {
      // Look for heading elements inside this container
      const headings = current.querySelectorAll("h2, h3");
      if (headings.length > 0) {
        return current;
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }

  function findNameElement(container) {
    // Priority 1: h2 elements (LinkedIn typically uses h2 for conversation name)
    const h2s = container.querySelectorAll("h2");
    for (const h2 of h2s) {
      const text = h2.textContent.trim();
      // Filter out empty or clearly non-name headings
      if (text && text.length > 1 && text.length < 80) {
        return h2;
      }
    }

    // Priority 2: prominent links near the top of the container
    // LinkedIn often wraps the name in a link to their profile
    const links = container.querySelectorAll('a[href*="/in/"]');
    for (const link of links) {
      const text = link.textContent.trim();
      if (text && text.length > 1 && text.length < 80) {
        return link;
      }
    }

    // Priority 3: h3 elements
    const h3s = container.querySelectorAll("h3");
    for (const h3 of h3s) {
      const text = h3.textContent.trim();
      if (text && text.length > 1 && text.length < 80) {
        return h3;
      }
    }

    return null;
  }

  function findTitleCompany(container, nameEl) {
    // Look for a subtitle element near the name — usually a sibling or nearby <p> or <span>
    let result = { title: "", company: "" };

    // Check next sibling elements of the name's parent
    let parent = nameEl.parentElement;
    if (!parent) return result;

    const siblings = parent.parentElement
      ? parent.parentElement.children
      : parent.children;
    let foundName = false;

    for (const sibling of siblings) {
      if (sibling === parent || sibling === nameEl) {
        foundName = true;
        continue;
      }
      if (foundName) {
        const text = sibling.textContent.trim();
        if (text && text.length > 2 && text.length < 120) {
          // Try to parse "Title at Company" pattern
          const atMatch = text.match(/^(.+?)\s+at\s+(.+)$/i);
          if (atMatch) {
            result.title = atMatch[1].trim();
            result.company = atMatch[2].trim();
          } else {
            // Use the whole thing as title
            result.title = text;
          }
          break;
        }
      }
    }

    return result;
  }

  // --- MUTATION OBSERVER ---

  function onDomChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const recipient = detectRecipient();

      if (!recipient) {
        if (sidebarRoot) {
          updateSidebar("idle", {});
        }
        return;
      }

      if (recipient.name === lastResearchedName) {
        return; // Already researched this person
      }

      lastResearchedName = recipient.name;
      startResearch(recipient);
    }, 200);
  }

  function startResearch(recipient) {
    ensureSidebar();
    updateSidebar("loading", { name: recipient.name });

    chrome.runtime.sendMessage({
      action: "research",
      name: recipient.name,
      title: recipient.title,
      company: recipient.company,
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
    sidebar.innerHTML = `
      <div class="scout-idle-msg">Open a DM to activate Scout</div>
    `;
    shadowRoot.appendChild(sidebar);

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

  function updateSidebar(state, data) {
    if (!shadowRoot) return;
    const sidebar = shadowRoot.querySelector(".scout-sidebar");
    if (!sidebar) return;

    switch (state) {
      case "idle":
        sidebar.innerHTML = `
          <div class="scout-idle-msg">Open a DM to activate Scout</div>
        `;
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
        const titleLine2 = currentTitle && currentCompany
          ? `${currentTitle} at ${currentCompany}`
          : currentTitle || currentCompany || "";

        let notableHtml = "";
        if (p.notable_work && p.notable_work.length > 0) {
          notableHtml = `
            <div class="scout-section-heading">Notable Work</div>
            ${p.notable_work.map((item) => `<div class="scout-section-item">${escapeHtml(item)}</div>`).join("")}
          `;
        }

        let recentHtml = "";
        if (p.recent_activity && p.recent_activity.length > 0) {
          recentHtml = `
            <div class="scout-section-heading">Recent Activity</div>
            ${p.recent_activity.map((item) => `<div class="scout-section-item">${escapeHtml(item)}</div>`).join("")}
          `;
        }

        sidebar.innerHTML = `
          <div class="scout-header-name">${escapeHtml(currentName)}</div>
          ${titleLine2 ? `<div class="scout-header-title">${escapeHtml(titleLine2)}</div>` : ""}
          <hr class="scout-divider">
          <div class="scout-summary">${escapeHtml(p.summary || "")}</div>
          ${notableHtml}
          ${recentHtml}
          <hr class="scout-divider">
          <div class="scout-sources">Sources: ${p.source_count || 0}</div>
          <button class="scout-refresh-btn" id="scout-refresh">Refresh</button>
        `;

        // Attach refresh handler
        const refreshBtn = shadowRoot.getElementById("scout-refresh");
        if (refreshBtn) {
          refreshBtn.addEventListener("click", () => {
            lastResearchedName = "";
            onDomChange();
          });
        }
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

  // --- INIT ---

  const observer = new MutationObserver(onDomChange);
  observer.observe(document.body, { childList: true, subtree: true });

  // Run detection once on load
  onDomChange();
})();
