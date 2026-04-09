// Scout background service worker
// Handles Tavily search + OpenRouter (Claude) structuring
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
    "openrouterApiKey",
    "scoutEnabled",
  ]);

  if (data.scoutEnabled === false) return;

  if (!data.tavilyApiKey || !data.openrouterApiKey) {
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
      data.openrouterApiKey
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
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const result = await response.json();
  const text = result.choices[0].message.content;

  // Parse JSON from response — handle possible markdown fencing
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}
