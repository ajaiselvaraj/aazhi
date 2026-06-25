import { NextRequest, NextResponse } from "next/server";

// Keep the system prompt server-side so it can't be tampered with from the client.
const SYSTEM_PROMPT = `You are Aria, a friendly voice assistant built into a web app. Your job is to guide users through the app, help them complete tasks, and answer questions clearly.

Rules:
- Keep replies concise and natural for speech (2–4 sentences max, unless explaining a multi-step task)
- For tasks, give numbered steps with clear UI element descriptions (e.g. "Click the blue Save button at the top right")
- Mention related features that could help the user
- Ask clarifying questions if the request is vague
- Be warm and encouraging, like a knowledgeable colleague
- If asked about a specific app you don't know, give general web app guidance and ask for context

You can help with: navigation, account settings, dashboard features, form completion, data entry, troubleshooting errors, finding features, keyboard shortcuts, and general workflows.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

function isValidHistory(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0 || value.length > MAX_HISTORY_MESSAGES) return false;
  return value.every(
    (m) =>
      m &&
      typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.length > 0 &&
      m.content.length <= MAX_MESSAGE_LENGTH
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return NextResponse.json(
      { error: "Server is not configured correctly." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!isValidHistory(messages)) {
    return NextResponse.json(
      { error: "Invalid or missing 'messages' array." },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("Anthropic API error:", upstream.status, errText);
      return NextResponse.json(
        { error: "Upstream model request failed." },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const textBlock = data?.content?.find(
      (block: { type: string }) => block.type === "text"
    );
    const reply: string =
      textBlock?.text ?? "Sorry, I couldn't get a response. Please try again.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Aria API route error:", err);
    return NextResponse.json(
      { error: "Something went wrong reaching the assistant." },
      { status: 500 }
    );
  }
}
