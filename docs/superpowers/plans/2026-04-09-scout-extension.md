# Scout Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that detects LinkedIn DM recipients and shows a live research sidebar with structured profile info from the open web.

**Architecture:** Manifest V3 Chrome extension with no backend. Content script detects recipient via MutationObserver + Shadow DOM sidebar. Background service worker calls Tavily for web search and Claude for structuring results. API keys in chrome.storage.local.

**Tech Stack:** Vanilla JS, Chrome Extension APIs (Manifest V3), Tavily Search API, Anthropic Claude API, Shadow DOM, CSS (DESIGN.md system)

---

## File Structure

```
extension/
├── manifest.json       # Extension config — permissions, content scripts, service worker
├── content.js          # DOM detection (MutationObserver) + sidebar injection (Shadow DOM)
├── background.js       # Service worker — Tavily search + Claude structuring + message passing
├── popup.html          # Settings popup markup
├── popup.css           # Settings popup styles (DESIGN.md)
├── popup.js            # Settings popup logic — save/load API keys + toggle
└── icons/
    ├── icon16.png      # Toolbar icon
    ├── icon48.png      # Extensions page icon
    └── icon128.png     # Chrome Web Store icon
```

- `content.js` is the largest file — handles both DOM detection and the entire sidebar UI (create, update states, animations). These are tightly coupled (detection triggers sidebar updates) so they live together.
- `background.js` handles all API communication. Content script never touches API keys or makes external requests.
- `popup.*` is the settings page — completely independent from the main flow.

---

### Task 1: Project Scaffold + manifest.json

**Files:**
- Create: `extension/manifest.json`

- [ ] **Step 1: Create the extension directory**

```bash
mkdir -p extension/icons
```

- [ ] **Step 2: Create manifest.json**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Scout",
  "version": "0.1.0",
  "description": "Real-time person research for LinkedIn DMs",
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["https://www.linkedin.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/messaging/*"],
      "js": ["content.js"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 3: Create placeholder icons**

Generate simple placeholder PNG icons at 16x16, 48x48, and 128x128. These can be solid blue (`#3b82f6`) squares with a white "S" letter, or any simple placeholder. Save as `extension/icons/icon16.png`, `extension/icons/icon48.png`, `extension/icons/icon128.png`.

Use a canvas-based approach or download simple placeholders. The goal is just to have valid PNGs so the extension loads.

- [ ] **Step 4: Create stub files so the extension loads**

Create `extension/background.js`:

```js
// Scout background service worker
console.log("Scout background worker loaded");
```

Create `extension/content.js`:

```js
// Scout content script
console.log("Scout content script loaded on LinkedIn messaging");
```

Create `extension/popup.html`:

```html
<!DOCTYPE html>
<html>
<head><title>Scout Settings</title></head>
<body><p>Scout settings placeholder</p></body>
</html>
```

- [ ] **Step 5: Load in Chrome and verify**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` directory
4. Verify: extension appears with name "Scout", no errors in the extensions page
5. Navigate to `https://www.linkedin.com/messaging/` → open DevTools console → verify "Scout content script loaded on LinkedIn messaging" appears
6. Click the Scout extension icon in toolbar → verify popup shows "Scout settings placeholder"

- [ ] **Step 6: Commit**

```bash
git add extension/
git commit -m "feat: scaffold Scout extension with manifest v3"
```

---

### Task 2: Settings Popup (popup.html + popup.css + popup.js)

**Files:**
- Create: `extension/popup.html` (replace stub)
- Create: `extension/popup.css`
- Create: `extension/popup.js`

- [ ] **Step 1: Write popup.html**

Replace `extension/popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Scout Settings</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <h1 class="popup-title">Scout</h1>
    <p class="popup-subtitle">LinkedIn DM Research</p>

    <div class="field">
      <label for="tavily-key">Tavily API Key</label>
      <input type="password" id="tavily-key" placeholder="tvly-...">
    </div>

    <div class="field">
      <label for="anthropic-key">Anthropic API Key</label>
      <input type="password" id="anthropic-key" placeholder="sk-ant-...">
    </div>

    <div class="field toggle-field">
      <label for="scout-enabled">Enable Scout</label>
      <input type="checkbox" id="scout-enabled" checked>
    </div>

    <button id="save-btn">Save</button>
    <p id="status-msg" class="status-msg"></p>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup.css**

Create `extension/popup.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Outfit:wght@500;600&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #ffffff;
  color: #222222;
  width: 300px;
  padding: 24px;
}

.popup-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.popup-title {
  font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #222222;
  line-height: 1.10;
}

.popup-subtitle {
  font-size: 0.875rem;
  font-weight: 400;
  color: #45515e;
  margin-top: -8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #222222;
}

.field input[type="password"] {
  font-family: 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.875rem;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  outline: none;
  color: #222222;
  background: #ffffff;
  transition: border-color 0.2s ease;
}

.field input[type="password"]:focus {
  border-color: #3b82f6;
}

.toggle-field {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.toggle-field input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
}

#save-btn {
  font-family: 'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  background: #181e25;
  border: none;
  border-radius: 8px;
  padding: 11px 20px;
  cursor: pointer;
  transition: background 0.2s ease;
}

#save-btn:hover {
  background: #2563eb;
}

.status-msg {
  font-size: 0.75rem;
  font-weight: 500;
  color: #3b82f6;
  min-height: 1rem;
  text-align: center;
}
```

- [ ] **Step 3: Write popup.js**

Create `extension/popup.js`:

```js
const tavilyKeyInput = document.getElementById("tavily-key");
const anthropicKeyInput = document.getElementById("anthropic-key");
const enabledToggle = document.getElementById("scout-enabled");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");

// Load saved settings on popup open
chrome.storage.local.get(
  ["tavilyApiKey", "anthropicApiKey", "scoutEnabled"],
  (data) => {
    if (data.tavilyApiKey) tavilyKeyInput.value = data.tavilyApiKey;
    if (data.anthropicApiKey) anthropicKeyInput.value = data.anthropicApiKey;
    enabledToggle.checked = data.scoutEnabled !== false; // default true
  }
);

saveBtn.addEventListener("click", () => {
  const tavilyApiKey = tavilyKeyInput.value.trim();
  const anthropicApiKey = anthropicKeyInput.value.trim();
  const scoutEnabled = enabledToggle.checked;

  chrome.storage.local.set(
    { tavilyApiKey, anthropicApiKey, scoutEnabled },
    () => {
      statusMsg.textContent = "Saved";
      setTimeout(() => {
        statusMsg.textContent = "";
      }, 2000);
    }
  );
});
```

- [ ] **Step 4: Reload extension and verify**

1. Go to `chrome://extensions/` → click reload on Scout
2. Click Scout icon in toolbar
3. Verify popup renders: title "Scout", subtitle, two key inputs, toggle, save button
4. Enter dummy keys, click Save → verify "Saved" appears briefly
5. Close and reopen popup → verify keys are still there
6. Toggle off, save, reopen → verify toggle is off

- [ ] **Step 5: Commit**

```bash
git add extension/popup.html extension/popup.css extension/popup.js
git commit -m "feat: add settings popup with API key inputs and enable toggle"
```

---

### Task 3: Background Service Worker — API Communication

**Files:**
- Create: `extension/background.js` (replace stub)

- [ ] **Step 1: Write background.js**

Replace `extension/background.js`:

```js
// Scout background service worker
// Handles Tavily search + Claude structuring
// Content script sends { action, name, title, company }
// Background sends back partial search results and final structured profile

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "research") {
    handleResearch(msg, sender.tab.id);
  }
  // Return false — we respond asynchronously via chrome.tabs.sendMessage
  return false;
});

async function handleResearch({ name, title, company }, tabId) {
  // Load API keys
  const data = await chrome.storage.local.get([
    "tavilyApiKey",
    "anthropicApiKey",
    "scoutEnabled",
  ]);

  if (data.scoutEnabled === false) return;

  if (!data.tavilyApiKey || !data.anthropicApiKey) {
    chrome.tabs.sendMessage(tabId, {
      action: "error",
      message: "Set your API keys in Scout settings",
    });
    return;
  }

  const companyStr = company || "";
  const queries = [
    `${name} ${companyStr}`.trim(),
    `${name} ${companyStr} work OR publications OR projects`.trim(),
    `${name} ${companyStr} news OR interview OR article`.trim(),
  ];

  const searchLabels = [
    "Searching web presence",
    "Looking for work & publications",
    "Checking recent news",
  ];

  // Notify content script that research started
  chrome.tabs.sendMessage(tabId, {
    action: "research-started",
    name,
    title,
    company,
    searchLabels,
  });

  // Fire 3 searches in parallel, stream results as they complete
  const allResults = [];
  const searchPromises = queries.map((query, index) =>
    tavilySearch(query, data.tavilyApiKey)
      .then((results) => {
        allResults[index] = results;
        chrome.tabs.sendMessage(tabId, {
          action: "search-complete",
          index,
          resultCount: results.length,
        });
        return results;
      })
      .catch((err) => {
        allResults[index] = [];
        chrome.tabs.sendMessage(tabId, {
          action: "search-failed",
          index,
        });
        return [];
      })
  );

  await Promise.all(searchPromises);

  // Check if we got any results at all
  const flatResults = allResults.flat();
  if (flatResults.length === 0) {
    chrome.tabs.sendMessage(tabId, {
      action: "no-results",
      name,
    });
    return;
  }

  // Send to Claude for structuring
  chrome.tabs.sendMessage(tabId, {
    action: "structuring",
  });

  try {
    const profile = await claudeStructure(
      name,
      title,
      company,
      flatResults,
      data.anthropicApiKey
    );
    chrome.tabs.sendMessage(tabId, {
      action: "profile-ready",
      profile,
    });
  } catch (err) {
    // Fallback: show raw results
    const fallbackItems = flatResults.slice(0, 10).map((r) => ({
      title: r.title,
      snippet: r.content ? r.content.slice(0, 120) : "",
      url: r.url,
    }));
    chrome.tabs.sendMessage(tabId, {
      action: "profile-fallback",
      items: fallbackItems,
    });
  }
}

async function tavilySearch(query, apiKey) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function claudeStructure(name, title, company, searchResults, apiKey) {
  const resultsText = searchResults
    .map(
      (r) =>
        `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content || "N/A"}`
    )
    .join("\n\n---\n\n");

  const titleStr = title ? `, ${title}` : "";
  const companyStr = company ? ` at ${company}` : "";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Here is public web information about ${name}${titleStr}${companyStr}.

${resultsText}

Create a structured profile. Return JSON only, no markdown fencing:
{
  "summary": "2-3 sentence bio based on what was found",
  "notable_work": ["item 1", "item 2"],
  "recent_activity": ["item 1", "item 2"],
  "source_count": number
}

Rules:
- Only include facts found in the search results. Do not fabricate.
- If little was found, say so honestly in the summary.
- Keep each list item under 15 words.
- Maximum 5 items per list.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude error: ${response.status}`);
  }

  const result = await response.json();
  const text = result.content[0].text;

  // Parse JSON from response — handle possible markdown fencing
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse Claude response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}
```

- [ ] **Step 2: Verify background worker loads**

1. Reload extension at `chrome://extensions/`
2. Click "Inspect views: service worker" link on the Scout extension card
3. Verify console shows "Scout background worker loaded" (remove this log line later — it's from the stub, but the new file replaces it, so just verify no errors)
4. Verify no errors in the service worker console

- [ ] **Step 3: Commit**

```bash
git add extension/background.js
git commit -m "feat: add background service worker with Tavily search and Claude structuring"
```

---

### Task 4: Content Script — DOM Detection

**Files:**
- Create: `extension/content.js` (replace stub)

This task implements only the DOM detection logic. Sidebar injection is Task 5.

- [ ] **Step 1: Write the DOM detection portion of content.js**

Replace `extension/content.js`:

```js
// Scout content script
// Detects LinkedIn DM recipient from page DOM, injects research sidebar

(function () {
  "use strict";

  let lastResearchedName = "";
  let sidebarRoot = null;
  let shadowRoot = null;
  let debounceTimer = null;

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

  // --- SIDEBAR PLACEHOLDER (implemented in Task 5) ---

  function ensureSidebar() {
    // Will be implemented in Task 5
    if (sidebarRoot) return;
    console.log("[Scout] Sidebar would be created here");
  }

  function updateSidebar(state, data) {
    // Will be implemented in Task 5
    console.log("[Scout] Sidebar state:", state, data);
  }

  // --- INIT ---

  const observer = new MutationObserver(onDomChange);
  observer.observe(document.body, { childList: true, subtree: true });

  // Run detection once on load
  onDomChange();
})();
```

- [ ] **Step 2: Reload and verify detection**

1. Reload extension at `chrome://extensions/`
2. Navigate to `https://www.linkedin.com/messaging/`
3. Open a DM conversation
4. Open DevTools console
5. Verify you see `[Scout] Sidebar state: loading { name: "SomeName" }` followed by `[Scout] Sidebar state: searching { ... }`
6. If you have API keys saved, you should also see search-complete and profile messages logged

If detection doesn't work on the current LinkedIn DOM, debug by inspecting the DOM structure in DevTools and adjusting the `findConversationContainer` / `findNameElement` heuristics. This is expected — LinkedIn's DOM varies and may need tuning.

- [ ] **Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: add DOM detection for LinkedIn DM recipients via MutationObserver"
```

---

### Task 5: Content Script — Sidebar UI (Shadow DOM)

**Files:**
- Modify: `extension/content.js` (replace placeholder sidebar functions)

This is the largest task. It implements the full sidebar inside Shadow DOM with all visual states.

- [ ] **Step 1: Add sidebar CSS as a string constant**

Add the following at the top of the IIFE in `content.js`, right after the variable declarations (`let lastResearchedName = ""` etc.):

```js
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
```

- [ ] **Step 2: Implement ensureSidebar()**

Replace the placeholder `ensureSidebar()` function in `content.js`:

```js
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
```

- [ ] **Step 3: Implement updateSidebar()**

Replace the placeholder `updateSidebar()` function in `content.js`:

```js
  // State held across updates
  let currentSearchLabels = [];
  let currentName = "";
  let currentTitle = "";
  let currentCompany = "";

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
```

- [ ] **Step 4: Reload and verify sidebar renders**

1. Reload extension at `chrome://extensions/`
2. Navigate to `https://www.linkedin.com/messaging/`
3. Verify sidebar slides in from the right edge
4. Verify the toggle tab ("S") is visible on the left edge of the sidebar
5. Click toggle to collapse/expand
6. Open a DM → verify the sidebar updates with the recipient's name and search progress
7. If API keys are saved and valid, verify the full flow: searching → structuring → profile display
8. Inspect the shadow DOM in DevTools (Elements panel → expand `#scout-root` → `#shadow-root`) to verify CSS isolation

- [ ] **Step 5: Commit**

```bash
git add extension/content.js
git commit -m "feat: add sidebar UI with Shadow DOM, all visual states, and live search feed"
```

---

### Task 6: End-to-End Testing + Polish

**Files:**
- Modify: `extension/content.js` (minor fixes)
- Modify: `extension/background.js` (minor fixes)

- [ ] **Step 1: Set up API keys for testing**

1. Click Scout icon → enter real Tavily API key and Anthropic API key
2. Save settings

- [ ] **Step 2: Full end-to-end test**

1. Navigate to `https://www.linkedin.com/messaging/`
2. Open a DM with someone
3. Verify sidebar shows:
   - Recipient name (and title/company if visible)
   - Three search lines with pulsing dots
   - Each search line updates as it completes (dot stops pulsing, shows result count)
   - "Structuring profile..." message appears
   - Final profile renders with Summary, Notable Work, Recent Activity sections
4. Switch to a different DM conversation → verify sidebar resets and researches the new person
5. Switch back to the first conversation → verify sidebar re-researches (since we track by name and it changed)
6. Click Refresh → verify research re-runs
7. Click toggle tab → verify sidebar collapses and expands

- [ ] **Step 3: Test error states**

1. Remove the Anthropic API key from settings, save
2. Open a DM → verify sidebar shows "Set your API keys in Scout settings"
3. Enter an invalid Tavily key → verify search lines show "Skipped" and fallback behavior
4. Restore valid keys → verify normal flow works again
5. Disable Scout toggle → verify sidebar doesn't activate
6. Re-enable → verify it works

- [ ] **Step 4: Test edge cases**

1. Navigate to `https://www.linkedin.com/feed/` → verify no sidebar appears (content script only loads on /messaging/*)
2. Open a group conversation (if available) → verify detection handles or gracefully ignores
3. Resize browser window → verify sidebar width adapts (fluid min(320px, 25vw))

- [ ] **Step 5: Fix any issues found during testing**

Apply any fixes needed. Common issues:
- DOM detection heuristics may need tuning for current LinkedIn DOM — adjust selectors in `findNameElement()` and `findConversationContainer()`
- Font loading in Shadow DOM may flash — add a small delay before showing content if needed
- Sidebar z-index conflicts — verify `2147483647` is sufficient

- [ ] **Step 6: Commit**

```bash
git add extension/
git commit -m "fix: end-to-end testing fixes and polish"
```

---

### Task 0 (Run Before Task 1): Initialize Git Repo

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/varunnukala/Desktop/sriko
git init
```

- [ ] **Step 2: Create .gitignore**

Create `.gitignore`:

```
.DS_Store
*.pem
node_modules/
.env
```

- [ ] **Step 3: Initial commit**

```bash
git add .gitignore DESIGN.md docs/
git commit -m "chore: initial project setup with design system and specs"
```
