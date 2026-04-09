// Scout background service worker
// Handles Tavily search + OpenRouter Claude STREAMING
// Sends stream-token messages to content script for live text generation

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "research") {
    console.log("[Scout BG] Research request received:", msg.name);
    handleResearch(msg, sender.tab.id);
  } else if (msg.action === "open-settings") {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
  return false;
});

async function handleResearch({ name, title, company }, tabId) {
  console.log("[Scout BG] === Starting research for:", name, "===");

  // 1. Load API keys
  const data = await chrome.storage.local.get([
    "tavilyApiKey",
    "openrouterApiKey",
    "scoutEnabled",
  ]);

  console.log("[Scout BG] Keys loaded — tavily:", !!data.tavilyApiKey, "openrouter:", !!data.openrouterApiKey, "enabled:", data.scoutEnabled);

  if (data.scoutEnabled === false) {
    console.log("[Scout BG] Scout is disabled, aborting");
    return;
  }

  if (!data.tavilyApiKey || !data.openrouterApiKey) {
    console.log("[Scout BG] Missing API keys");
    chrome.tabs.sendMessage(tabId, {
      action: "error",
      message: "Set your API keys in Scout settings (click gear icon in dock)",
    });
    return;
  }

  // 2. Build search queries
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

  // 3. Notify content script
  chrome.tabs.sendMessage(tabId, {
    action: "research-started",
    name,
    title,
    company,
    searchLabels,
  });

  // 4. Fire 3 Tavily searches in parallel
  console.log("[Scout BG] Firing 3 Tavily searches...");
  const allResults = [];
  const searchPromises = queries.map((query, index) =>
    tavilySearch(query, data.tavilyApiKey)
      .then((results) => {
        console.log(`[Scout BG] Search ${index} ("${query.slice(0, 40)}...") => ${results.length} results`);
        allResults[index] = results;
        chrome.tabs.sendMessage(tabId, {
          action: "search-complete",
          index,
          resultCount: results.length,
        });
        return results;
      })
      .catch((err) => {
        console.error(`[Scout BG] Search ${index} FAILED:`, err.message);
        allResults[index] = [];
        chrome.tabs.sendMessage(tabId, {
          action: "search-failed",
          index,
        });
        return [];
      })
  );

  await Promise.all(searchPromises);

  const flatResults = allResults.flat();
  console.log("[Scout BG] Total search results:", flatResults.length);

  if (flatResults.length === 0) {
    console.log("[Scout BG] No results found — aborting");
    chrome.tabs.sendMessage(tabId, { action: "no-results", name });
    return;
  }

  // 5. Stream Claude response
  console.log("[Scout BG] Starting Claude streaming...");
  chrome.tabs.sendMessage(tabId, { action: "structuring" });

  try {
    await claudeStream(name, title, company, flatResults, data.openrouterApiKey, tabId);
    console.log("[Scout BG] === Research complete ===");
  } catch (err) {
    console.error("[Scout BG] Claude stream FAILED:", err.message, err);
    // Fallback: send raw results
    const fallbackItems = flatResults.slice(0, 8).map((r) => ({
      title: r.title,
      snippet: r.content ? r.content.slice(0, 140) : "",
      url: r.url,
    }));
    chrome.tabs.sendMessage(tabId, {
      action: "profile-fallback",
      items: fallbackItems,
    });
  }
}

// ==========================================
// TAVILY SEARCH
// ==========================================
async function tavilySearch(query, apiKey) {
  console.log("[Scout BG] Tavily request:", query);

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
    const errText = await response.text();
    console.error("[Scout BG] Tavily HTTP error:", response.status, errText);
    throw new Error(`Tavily error: ${response.status}`);
  }

  const json = await response.json();
  console.log("[Scout BG] Tavily response — results:", json.results?.length || 0);
  return json.results || [];
}

// ==========================================
// CLAUDE STREAMING via OpenRouter
// ==========================================
async function claudeStream(name, title, company, searchResults, apiKey, tabId) {
  // Build context from search results
  const resultsText = searchResults
    .map((r) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content || "N/A"}`)
    .join("\n\n---\n\n");

  const titleStr = title ? `, ${title}` : "";
  const companyStr = company ? ` at ${company}` : "";

  const prompt = `You are Scout, an AI assistant helping write personalized LinkedIn cold messages to ${name}${titleStr}${companyStr}.

Here is public web information found about them:

${resultsText}

Write a brief research briefing with these exact section headers (ALL CAPS, each on its own line):

BACKGROUND
[1-2 sentences: who they are and what they do, beyond their job title]

TALKING POINTS
\u2022 [Specific, concrete fact from search results \u2014 good conversation starter]
\u2022 [Another detail about their work, project, or achievement]
\u2022 [Something recent, notable, or personal to connect on]

SUGGESTED OPENER
[A natural, personalized opening message for a cold LinkedIn DM. Reference one specific talking point. Keep it under 3 sentences. Sound genuine, not salesy.]

Rules:
- 3-5 talking points, each specific and under 20 words
- Focus on: recent work, publications, talks, articles, projects, interests
- Skip generic info already visible on LinkedIn (job title, company name)
- If search results are thin, extract whatever is most specific and personal
- Write in a clean, direct style \u2014 no filler words`;

  console.log("[Scout BG] Claude prompt length:", prompt.length, "chars");
  console.log("[Scout BG] Sending streaming request to OpenRouter...");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "chrome-extension://scout",
      "X-Title": "Scout",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-20250514",
      max_tokens: 1024,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Scout BG] OpenRouter HTTP error:", response.status, errorText);
    throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
  }

  console.log("[Scout BG] Stream response started — reading chunks...");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log("[Scout BG] Stream reader done");
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const payload = trimmed.slice(6);
      if (payload === "[DONE]") {
        console.log("[Scout BG] Received [DONE] signal");
        continue;
      }

      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content || "";
        if (delta) {
          fullText += delta;
          chunkCount++;
          // Send each token to content script for live rendering
          chrome.tabs.sendMessage(tabId, {
            action: "stream-token",
            text: delta,
          });
        }
      } catch (e) {
        // Skip malformed SSE chunks (e.g. comments, empty data)
        console.log("[Scout BG] Skipped non-JSON chunk:", trimmed.slice(0, 60));
      }
    }
  }

  console.log("[Scout BG] Stream complete — total chunks:", chunkCount, "total chars:", fullText.length);
  console.log("[Scout BG] Full response:\n", fullText);

  // Signal completion
  chrome.tabs.sendMessage(tabId, {
    action: "stream-done",
    fullText,
  });
}
