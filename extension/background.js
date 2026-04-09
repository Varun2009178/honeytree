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

  const prompt = `You are Scout — a cold DM research assistant. I'm about to message ${name}${titleStr}${companyStr} on LinkedIn and I need ACTIONABLE intel to write a killer personalized cold DM.

Here is what we found about them online:

${resultsText}

Give me a fast research brief I can scan in 10 seconds. Use these EXACT section headers (ALL CAPS, each on its own line):

WHO THEY ARE
[1 sentence max. What do they actually DO — not their job title, but what they're known for or working on.]

DM HOOKS
\u2022 [Something specific they did/built/wrote that I can reference in my opening line]
\u2022 [A recent win, project, or milestone I can congratulate them on]
\u2022 [A shared interest or angle I could use to build rapport]
\u2022 [An opinion they expressed publicly that I could reference]
[Give me 3-5 hooks. Each must be SPECIFIC — name the project, article, company, or event. "They have experience in tech" is useless. "They built the recommendation engine at Spotify" is gold.]

COLD DM
[Write me a ready-to-send cold DM. 2-3 sentences max. Reference ONE specific hook from above. Sound like a real person, not a salesperson. No "I hope this message finds you well" garbage.]

Rules:
- Every hook must name a SPECIFIC thing (project name, article title, event, company, metric)
- No generic filler like "extensive experience" or "passionate about innovation"
- No URLs or links — I just need the facts
- If the search results are thin, be honest and work with what you have
- Write like a sharp friend briefing me before a networking event`;

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
