# Scout — Real-Time Person Research Sidebar for LinkedIn DMs

## Overview

Scout is a Chrome extension. When you open a LinkedIn DM, it reads the recipient's name from the page, searches the open web for public info about them, and shows you a structured profile in a sidebar — live, as you compose your message.

No backend. No server. Just a Chrome extension that calls Tavily and Claude directly from the background service worker.

**Think Cluely for messaging:** a transparent research layer that shows you who you're talking to.

## What It Does

1. You open a LinkedIn DM conversation
2. Scout reads the recipient's name and title from the page (visible text only)
3. Runs 3 web searches via Tavily in parallel
4. You see each search happening live in the sidebar
5. Feeds all results to Claude to structure into a clean profile
6. Shows you: who this person is, what they do, notable work, recent activity

That's it. You read, you write your own message.

## Architecture

### Files

```
extension/
├── manifest.json       # Manifest V3, linkedin.com only
├── content.js          # DOM detection + sidebar (Shadow DOM)
├── background.js       # Service worker — Tavily + Claude API calls
├── popup.html          # Settings popup (API keys)
├── popup.css
├── popup.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

No build step. No bundler. No framework. Load it as an unpacked extension.

### Data Flow

1. `content.js` detects recipient name/title/company from DOM
2. Sends `{ name, title, company }` to `background.js` via `chrome.runtime.sendMessage`
3. `background.js` fires 3 parallel Tavily searches
4. As each completes, sends partial results back to `content.js` → sidebar shows live progress
5. Once all done, `background.js` calls Claude with all results
6. Sends structured profile to `content.js` → sidebar renders final view

### Why No Server

- Background service workers in Manifest V3 can make cross-origin `fetch()` calls — no CORS issues
- API keys stored in `chrome.storage.local`, read only by the background worker
- This is a personal tool / MVP — chrome.storage.local is fine for now
- Eliminates an entire deployment, auth layer, and failure mode

## manifest.json

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
  "content_scripts": [{
    "matches": ["https://www.linkedin.com/messaging/*"],
    "js": ["content.js"]
  }],
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

## DOM Detection (content.js)

**High-risk area.** LinkedIn's DOM changes frequently. Detection must be pattern-based.

### MutationObserver

- Observe `document.body` with `{ childList: true, subtree: true }`
- On mutation, look for the compose container: elements with `role="textbox"` or `contenteditable="true"` inside the messaging area
- Walk up from compose container to find the conversation header (name + title)
- Debounce callback at 200ms

### What We Read

- **Name** (required): heading text above the message thread
- **Title/Company** (optional): subtitle line, usually "Title at Company"
- Nothing else. No clicks, no scrolling, no profile visits.

### Deduplication

- Track last-researched name in memory
- Same person doesn't re-trigger
- "Refresh" button in sidebar for manual re-trigger

### Failure

- Can't find name → sidebar shows "Open a DM to activate Scout"

## Sidebar (content.js, Shadow DOM)

**Shadow DOM is critical.** Without it, LinkedIn's CSS destroys injected HTML.

### Injection

- Create `<div>` on `document.body`
- Attach `shadowRoot` with `mode: "open"`
- All HTML + CSS inside the shadow root
- Fonts (DM Sans, Outfit) loaded via `@import` in shadow root `<style>`

### Layout

- Fixed position, right edge of viewport
- Width: `min(320px, 25vw)` — fluid
- Height: 100vh, internal scroll
- Slide in from right, 300ms ease-out
- Collapse/expand toggle tab (pill-shaped)

### Visual Treatment (from DESIGN.md)

- Background: `#ffffff`
- Border-left: `1px solid #e5e7eb`
- Shadow: `rgba(44, 30, 116, 0.16) 0px 0px 15px`
- Padding: 16px–24px fluid

### States

**Loading — Live Search Feed:**
```
Scout
━━━━━━━━━━━━━━━━━━━

Researching John Smith...

● Searching web presence...
✓ Found 4 results
● Looking for publications...
● Checking recent news...
```

- Each line fades in with 200ms stagger
- Active: pulsing blue dot (`#3b82f6`)
- Done: blue checkmark
- Labels: DM Sans 13px weight 600
- Status: DM Sans 13px weight 400 `#8e8e93`

**Results — Structured Profile:**
```
John Smith
VP Engineering at Acme Corp
━━━━━━━━━━━━━━━━━━━

Summary
Building AI infrastructure at Acme Corp.
Previously led platform team at StartupX.

Notable Work
• Led migration to microservices (2024)
• Speaker at KubeCon on observability
• Co-authored paper on distributed caching

Recent Activity
• Quoted in TechCrunch article on AI ops
• Podcast appearance on Engineering Weekly

Sources (7)
━━━━━━━━━━━━━━━━━━━
[Refresh]
```

- Name: Outfit, 24px, weight 600, `#222222`
- Title: DM Sans, 14px, weight 400, `#45515e`
- Section headings: Outfit, 16px, weight 600, `#222222`
- Body text: DM Sans, 14px, weight 400, `#222222`, line-height 1.50
- List items: left border `3px solid #3b82f6`
- Source count: DM Sans, 12px, `#8e8e93`
- Refresh button: pill (9999px radius), `#f0f0f0` bg, `#333` text

### Fluid Behaviors

- All sizes in `rem`, spacing relative
- Content reflows — no fixed heights
- Long names truncate with ellipsis
- Lists wrap freely
- Scroll when content exceeds viewport

## Search Pipeline (background.js)

### 3 Parallel Tavily Searches

From `{name, title, company}`:

1. `"{name} {company}"` — general web presence
2. `"{name} {company} work OR publications OR projects"` — what they've done
3. `"{name} {company} news OR interview OR article"` — recent activity

If company is empty, queries use name only. Each search: `search_depth: "basic"`, `max_results: 5`.

As each resolves, send partial update to content script immediately.

### Claude Structuring

Once all searches return, send results to Claude (`claude-sonnet-4-20250514`, `max_tokens: 1024`):

```
Here is public web information about {name}, {title} at {company}.

{all search results}

Create a structured profile. Return JSON:
{
  "summary": "2-3 sentence bio based on what was found",
  "notable_work": ["item 1", "item 2", ...],
  "recent_activity": ["item 1", "item 2", ...],
  "source_count": number
}

Rules:
- Only include facts found in the search results. Do not fabricate.
- If little was found, say so honestly in the summary.
- Keep each list item under 15 words.
- Maximum 5 items per list.
```

### Edge Cases

- All searches empty → show "Not much found publicly about [Name]" — no Claude call
- Some searches fail → proceed with whatever returned
- Claude fails → show raw search result titles/snippets grouped by query as fallback

## Settings Popup (popup.html)

- Input: Tavily API Key
- Input: Anthropic API Key
- Toggle: Enable/Disable Scout
- Save to `chrome.storage.local`
- Styled from DESIGN.md: white bg, DM Sans, pill button, 8px radius inputs

That's it.

## Error Handling

| Scenario | Sidebar Shows |
|----------|---------------|
| No name detected | "Open a DM to activate Scout" |
| No API keys set | "Set your API keys in Scout settings" |
| Tavily call fails | That search line shows "Skipped" |
| All searches fail | "Search failed — try again" + retry |
| Claude fails | Raw search snippets as fallback |
| No web presence found | "Not much found publicly about [Name]" |

Calm messages. Clear actions. No scary errors.

## Constraints

- NEVER automate LinkedIn actions
- NEVER scrape via LinkedIn API
- ONLY read visibly rendered text
- ALL searching via Tavily on open web
- User writes every message themselves

## Future (Not Built)

- Proxy server for key security (when distributing)
- Talking points / opener generation
- Usage limits / monetization
- Saved profiles / CRM export
