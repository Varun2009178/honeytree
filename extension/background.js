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
          content: `You are helping someone write a personalized cold message on LinkedIn to ${name}${titleStr}${companyStr}.

Here is public web information found about them:

${resultsText}

Extract the most useful information for writing a personalized cold message. Return ONLY valid JSON with no markdown fencing:

{
  "talking_points": [
    "Specific thing about their work you could reference",
    "Recent achievement or project to mention",
    "Interest or background to connect on"
  ],
  "background": "One sentence: who they are and what they do",
  "source_count": ${searchResults.length}
}

Rules:
- talking_points: 3-5 specific, concrete facts from the search results that would make good conversation starters
- Each talking point should be under 20 words
- Focus on: recent work, publications, talks, articles, projects, interests
- Skip generic info like job titles (that's already visible on LinkedIn)
- If search results are thin, extract whatever is most specific/personal
- Return ONLY the JSON object, no other text`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Scout] OpenRouter error:", response.status, errorText);
    throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("[Scout] OpenRouter response:", result);

  const text = result.choices[0].message.content;
  console.log("[Scout] Claude output:", text);

  // Parse JSON from response — handle possible markdown fencing
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Scout] Could not find JSON in response:", text);
    throw new Error("Could not parse response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}
