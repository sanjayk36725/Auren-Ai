import { NextRequest, NextResponse } from "next/server";
import { generateReply, type ChatMessage } from "@/lib/ai";
import { readJsonObject, readProvider } from "@/lib/request";

const MAX_REQUEST_BYTES = 2_000_000;
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 12_000;
const ALLOWED_ROLES = new Set<ChatMessage["role"]>(["user", "assistant", "system"]);

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonObject(req, MAX_REQUEST_BYTES);
    if (body instanceof NextResponse) return body;

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }
    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: `A maximum of ${MAX_MESSAGES} messages is allowed.` }, { status: 413 });
    }

    const provider = readProvider(body.provider);
    if (provider instanceof NextResponse) return provider;

    const safe: ChatMessage[] = body.messages
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
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AI request failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "AI request failed. Check your provider configuration." }, { status: 500 });
  }
}
