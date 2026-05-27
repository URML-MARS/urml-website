// Gemini — wraps the Google AI Studio API. One call per draft.
//
// Model: gemini-2.5-pro for editorial quality. Cost per draft is
// ~$0.008 (negligible at any realistic cadence).
//
// Uses structured-output (responseSchema) so the model returns valid
// JSON matching the Draft schema. The prompt itself enforces style
// (no LLM tells, no em-dashes, no inferred names) and content rules
// (every claim must trace to a supplied source).

import type { QueueItem } from "./queue";

// Switched from 2.5-pro to 2.5-flash after the pro model regularly took
// 15-20s+ and tripped Netlify's Function timeout (10s on Starter, 26s
// on Pro). 2.5-flash typically responds in 3-7s with sufficient
// editorial quality for this workload. If quality degrades, the next
// step is background generation (returns 202 + polling) rather than
// going back to pro on the request path.
export const GEMINI_MODEL = "gemini-2.5-flash";

// Bump when the prompt or schema changes. Stored on every draft so we
// can audit which version produced what.
export const PROMPT_VERSION = "v2-2026-05-27";

export interface GeminiOutput {
  title: string;
  summary: string;
  body_markdown: string;
  suggested_tags: string[];
  suggested_category:
    | "Vendor"
    | "Research"
    | "Regulation"
    | "Ecosystem"
    | "Engineering"
    | "URML";
  urml_angle: "explicit" | "implicit" | "none";
  confidence_notes?: string;
}

export type GeminiResult =
  | { ok: true; output: GeminiOutput; rawText: string }
  | { ok: false; error: string; status?: number };

const SYSTEM_INSTRUCTION = `
You are an editorial assistant for urml.dev, a robotics standards project. You produce short, plain-English posts about robotics topics — vendor moves, research, regulation, the wider ecosystem. URML is one voice among many in this content; do not force the angle.

STRICT STYLE RULES:
- No em-dashes. Use periods, commas, or rephrase.
- No "delve", "tapestry", "in the realm of", "it's worth noting", "moreover", "furthermore", "in conclusion", "navigating the landscape", or other AI tells.
- No rhetorical questions.
- Plain declarative sentences. Vary length, but stay readable.
- Length target: 200-500 words in body_markdown.
- No bullet lists unless the source material is intrinsically a list.

STRICT NAMING RULE:
- Do not name any company, maintainer, project, or individual unless their name appears verbatim in one of the supplied reference URLs (in the URL itself or in a supplied title) or in the user-supplied notes.
- Specifically: do not infer "X is using URML" or "Y partnered with Z" from indirect signals. If you are not sure a name is in the supplied sources, omit it.

URML ANGLE RULE:
- If the topic has an organic connection to URML (robot interoperability, intent layers, standards, conformance, safety policy, the integration tax), make that connection at the end in one or two sentences. Set urml_angle = "explicit".
- If the connection is real but subtle, mention it briefly. Set urml_angle = "implicit".
- If the topic has no natural URML angle, do not force one. Set urml_angle = "none".

SOURCES DISCIPLINE:
- Every factual claim must trace to a supplied reference URL, video URL, or the user's notes.
- If a claim cannot be sourced from the supplied inputs, omit it.
- Do not invent statistics, dates, quotes, or names.

VIDEO LINKS:
- When a video URL is supplied (YouTube, Instagram, TikTok, Vimeo, etc.), reference it inline in the body where it's contextually relevant, using a plain markdown link. Example: "A demo on the BMW floor shows the gait change ([video](https://youtu.be/...))."
- If the video is the central subject of the post, mention and link it within the first paragraph.
- Do not embed via HTML/iframe; emit a plain markdown link. The site renders these as links today; embed treatment is a future enhancement.
- Do not link a video unless it actually appears in the supplied videos list.

OUTPUT:
- Strict JSON matching the supplied responseSchema.
- title: a plain headline (no quotes, no punctuation gymnastics).
- summary: one sentence, <140 chars. Used in the post card and RSS description.
- body_markdown: the post body in CommonMark markdown, 200-500 words, no front-matter.
- suggested_tags: 1-5 lowercase tags (kebab-case).
- suggested_category: pick the one that best fits.
- urml_angle: per the rule above.
- confidence_notes: free-text for the founder (NOT published) explaining any judgement calls, missing facts, or warnings.
`.trim();

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    body_markdown: { type: "string" },
    suggested_tags: {
      type: "array",
      items: { type: "string" },
    },
    suggested_category: {
      type: "string",
      enum: ["Vendor", "Research", "Regulation", "Ecosystem", "Engineering", "URML"],
    },
    urml_angle: {
      type: "string",
      enum: ["explicit", "implicit", "none"],
    },
    confidence_notes: { type: "string" },
  },
  required: ["title", "summary", "body_markdown", "suggested_tags", "suggested_category", "urml_angle"],
};

function buildUserPrompt(item: QueueItem): string {
  const lines: string[] = [];
  lines.push(`TOPIC: ${item.topic}`);
  lines.push("");
  if (item.notes.trim()) {
    lines.push("NOTES:");
    lines.push(item.notes.trim());
    lines.push("");
  }
  if (item.refs.length > 0) {
    lines.push("REFERENCE LINKS (articles, news):");
    for (const r of item.refs) {
      const title = r.title ? r.title : "(no title)";
      lines.push(`- ${title} — ${r.url}`);
    }
    lines.push("");
  }
  if (item.videos.length > 0) {
    lines.push("VIDEO LINKS:");
    for (const v of item.videos) {
      const platform = v.platform ? ` [${v.platform}]` : "";
      const title = v.title ? v.title : "(no title)";
      lines.push(`- ${title}${platform} — ${v.url}`);
    }
    lines.push("");
  }
  lines.push("Write the post per the style and sourcing rules above. Return JSON only.");
  return lines.join("\n");
}

export async function generateFromQueueItem(item: QueueItem): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "GEMINI_API_KEY is not set. Get a key at https://aistudio.google.com/app/apikey and add it to Netlify env vars.",
    };
  }

  const userPrompt = buildUserPrompt(item);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: `network error: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (resp.status === 429) {
    return { ok: false, status: 429, error: "Gemini rate-limited. Try again in a minute." };
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    // Log the full response so Netlify Function logs capture what actually
    // went wrong (model name typo, schema error, etc.). The error string
    // returned to the UI is trimmed.
    console.error(`[gemini] API ${resp.status} from ${GEMINI_MODEL}:`, text);
    return {
      ok: false,
      status: resp.status,
      error: `Gemini API ${resp.status}: ${text.slice(0, 400)}`,
    };
  }

  const json = (await resp.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!rawText) {
    return { ok: false, error: "Gemini returned empty response." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    return {
      ok: false,
      error: `Gemini output is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Light shape check; trust the schema enforcement for the rest.
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as GeminiOutput).title !== "string" ||
    typeof (parsed as GeminiOutput).body_markdown !== "string"
  ) {
    return { ok: false, error: "Gemini output missing required fields." };
  }

  const output = parsed as GeminiOutput;

  // Post-process: replace em-dashes with periods, flag (don't remove)
  // banned phrases by wrapping them in HTML comments so the founder
  // catches them in the editor.
  output.body_markdown = postProcess(output.body_markdown);
  output.title = output.title.replace(/—/g, ", ");
  output.summary = output.summary.replace(/—/g, ", ");

  return { ok: true, output, rawText };
}

const BANNED_TELLS = [
  "delve",
  "delves into",
  "tapestry",
  "in the realm of",
  "it's worth noting",
  "moreover",
  "furthermore",
  "in conclusion",
  "navigating the landscape",
];

function postProcess(md: string): string {
  let out = md.replace(/—/g, ".");
  // Flag tells (case-insensitive) by wrapping in a TELL HTML comment.
  for (const tell of BANNED_TELLS) {
    const re = new RegExp(`\\b${tell.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    out = out.replace(re, (match) => `<!-- TELL: ${tell} -->${match}`);
  }
  return out;
}
