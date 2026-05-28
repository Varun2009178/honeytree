import { getSupabase } from "@/lib/supabase"
import { getPostHogClient } from "@/lib/posthog-server"

const TAVILY_API_KEY = process.env.TAVILY_API_KEY!
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const FREE_LIMIT = 3

const COMMON_NAMES = new Set([
  "michael chapman",
  "john smith",
  "james johnson",
  "robert williams",
  "david brown",
  "michael jones",
  "james miller",
  "robert davis",
  "michael wilson",
  "john taylor",
  "james anderson",
  "robert thomas",
  "david jackson",
  "michael white",
  "john harris",
  "james martin",
  "robert thompson",
  "david garcia",
  "michael martinez",
  "john robinson",
  "james clark",
  "robert rodriguez",
  "david lewis",
  "michael lee",
  "john walker",
  "james hall",
  "robert allen",
  "david young",
])

function isCommonName(name: string) {
  return COMMON_NAMES.has(name.toLowerCase().trim())
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

async function tavilySearch(query: string, signal: AbortSignal) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 5,
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Tavily error: ${response.status}`)
  }

  const json = await response.json()
  return json.results || []
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fingerprint, name, title, company, userContext } = body

    if (!fingerprint || !name) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Check usage limit
    const { data: usage } = await getSupabase()
      .from("usage")
      .select("generation_count")
      .eq("fingerprint", fingerprint)
      .single()

    const currentCount = usage?.generation_count ?? 0
    if (currentCount >= FREE_LIMIT) {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: fingerprint,
        event: "research_limit_reached",
        properties: {
          fingerprint,
          name,
          title: title || null,
          company: company || null,
        },
      })
      return new Response(
        JSON.stringify({ error: "limit_reached", remaining: 0 }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Build search queries (mirrors content.js logic)
    const contextParts = [company, title].filter(Boolean)
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts[0] || ""
    const lastName = nameParts[nameParts.length - 1] || ""
    const contextStr = contextParts.join(" ")

    const queries: string[] = []
    if (contextParts.length > 0) {
      queries.push(`${name} ${contextStr} LinkedIn profile`.trim())
    } else {
      queries.push(`${name} LinkedIn profile`.trim())
    }
    queries.push(`${name} ${contextStr} work OR projects OR portfolio`.trim())
    queries.push(`${name} ${contextStr} news OR interview OR podcast`.trim())
    if (isCommonName(name)) {
      queries.push(
        `"${firstName} ${lastName}" ${contextStr} professional background`.trim()
      )
    }
    queries.push(`site:linkedin.com/in "${name}" ${contextStr}`.trim())

    // Run Tavily searches in parallel
    const abortController = new AbortController()
    const searchResults: {
      results: Array<{
        title: string
        url: string
        content: string
        score?: number
      }>
      count: number
    }[] = []

    const searchPromises = queries.map(async (query, index) => {
      try {
        const results = await tavilySearch(query, abortController.signal)
        searchResults[index] = { results, count: results.length }
        return results
      } catch {
        searchResults[index] = { results: [], count: 0 }
        return []
      }
    })

    await Promise.all(searchPromises)

    const flatResults = searchResults.flatMap((s) => s.results)
    const totalFound = flatResults.length

    if (flatResults.length === 0) {
      return new Response(JSON.stringify({ error: "no_results", name }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Score and rank results
    const scoredResults = flatResults.map((r) => {
      const text = (
        (r.title || "") +
        " " +
        (r.content || "") +
        " " +
        (r.url || "")
      ).toLowerCase()
      let score = 0
      if (text.includes(name.toLowerCase())) score += 10
      if (firstName && text.includes(firstName.toLowerCase())) score += 3
      if (lastName && text.includes(lastName.toLowerCase())) score += 3
      for (const part of contextParts) {
        if (text.includes(part.toLowerCase())) score += 5
      }
      if (r.url && r.url.includes("linkedin.com/in/")) score += 4
      return { ...r, score }
    })

    scoredResults.sort((a, b) => b.score - a.score)
    const topResults = scoredResults.filter((r) => r.score >= 3).slice(0, 12)

    if (topResults.length === 0) {
      return new Response(JSON.stringify({ error: "no_results", name }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Build Claude prompt
    const resultsText = topResults
      .map(
        (r, i) =>
          `[Result ${i + 1}] (relevance: ${r.score || 0})\nTitle: ${r.title}\nURL: ${r.url}\nContent: ${r.content || "N/A"}`
      )
      .join("\n\n---\n\n")

    const titleStr = title ? `, ${title}` : ""
    const companyStr = company ? ` at ${company}` : ""

    let userBlock = ""
    if (userContext) {
      userBlock = `\n\nAbout the job seeker (ME):
- Targeting: ${userContext.targetRole}
- My experience: ${userContext.experience}`
    }

    const prompt = `You are Honeydew, a cold DM research assistant for job seekers. I'm about to message ${name}${titleStr}${companyStr} on LinkedIn.${userBlock}

Here is what we found about them online:

${resultsText}

Give me a fast research brief. Use these EXACT section headers (ALL CAPS, each on its own line):

WHO THEY ARE
[1 sentence. What they actually do or are working on right now.]

DM HOOKS
[2-4 bullet points. Each must be SPECIFIC: name the project, article, company, hire, or event.]

COLD DM
Write a cold DM that is EXACTLY 2 sentences. The DM must:
1. Open with "Hi [their first name]," then reference ONE specific fact from the research (a recent hire, product launch, funding round, project, etc.)
2. Connect my experience to their needs and end with a soft ask

Use my actual experience and target role from "About the job seeker" above. Do NOT use blank underscores for things I already told you. Only use ___ for my name, city, and salary.

Rules:
- EXACTLY 2 sentences, period. No more.
- NEVER use em dashes. Use commas or periods instead.
- Keep it under 280 characters
- Sound human and direct, not salesy
- Reference ONE specific fact from the research, not generic praise
- NEVER refuse. Use the best match from the research.
- ALWAYS use the exact 3 section headers
- No preamble before WHO THEY ARE
- No URLs or links
- No quotation marks around the DM`

    // Stream from OpenRouter
    const openrouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://tryhoney.xyz",
          "X-Title": "Honeydew",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4",
          max_tokens: 1024,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        }),
      }
    )

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text()
      console.error("OpenRouter error:", errorText)
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create SSE stream back to client
    const remaining = FREE_LIMIT - currentCount - 1
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Send search status event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "search", status: "done", count: totalFound })}\n\n`
          )
        )

        // Proxy OpenRouter SSE stream
        const reader = openrouterResponse.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith("data: ")) continue
              const payload = trimmed.slice(6)
              if (payload === "[DONE]") continue

              try {
                const json = JSON.parse(payload)
                const delta = json.choices?.[0]?.delta?.content || ""
                if (delta) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "token", content: delta })}\n\n`
                    )
                  )
                }
              } catch {
                // skip malformed
              }
            }
          }

          // Increment usage count
          await getSupabase()
            .from("usage")
            .upsert(
              {
                fingerprint,
                generation_count: currentCount + 1,
                last_generated_at: new Date().toISOString(),
              },
              { onConflict: "fingerprint" }
            )

          const posthog = getPostHogClient()
          posthog.capture({
            distinctId: fingerprint,
            event: "research_generated",
            properties: {
              fingerprint,
              name,
              title: title || null,
              company: company || null,
              search_results_count: totalFound,
              remaining,
            },
          })

          // Send done event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", remaining })}\n\n`
            )
          )
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Stream interrupted" })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Remaining": String(remaining),
      },
    })
  } catch (err) {
    console.error("Research API error:", err)
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}
