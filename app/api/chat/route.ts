import { NextRequest, NextResponse } from "next/server";
import { generateReply, type ChatMessage, type Provider } from "@/lib/ai";

const MAX_REQUEST_BYTES = 2_000_000;
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 12_000;
const ALLOWED_ROLES = new Set<ChatMessage["role"]>(["user", "assistant", "system"]);
const ALLOWED_PROVIDERS = new Set<Provider>(["openai", "gemini", "anthropic", "demo"]);

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const input = body as { messages?: unknown; provider?: unknown };
    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }
    if (input.messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: `A maximum of ${MAX_MESSAGES} messages is allowed.` }, { status: 413 });
    }

    const provider = input.provider === undefined ? undefined : String(input.provider);
    if (provider !== undefined && !ALLOWED_PROVIDERS.has(provider as Provider)) {
      return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
    }

    const safe: ChatMessage[] = input.messages
      .filter((message): message is { role: unknown; content: unknown } => Boolean(message) && typeof message === "object")
      .map((message) => ({
        role: ALLOWED_ROLES.has(message.role as ChatMessage["role"]) ? (message.role as ChatMessage["role"]) : "user",
        content: String(message.content ?? "").slice(0, MAX_CONTENT_CHARS),
      }))
      .slice(-MAX_MESSAGES);

    if (!safe.length || safe.every((message) => !message.content.trim())) {
      return NextResponse.json({ error: "At least one non-empty message is required." }, { status: 400 });
    }

    const result = await generateReply(safe, provider);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("AI request failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "AI request failed. Check your provider configuration." }, { status: 500 });
  }
}
