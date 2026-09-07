import { NextRequest, NextResponse } from "next/server";
import { generateReply, type ChatMessage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages as ChatMessage[];
    if (!Array.isArray(messages) || messages.length === 0) return NextResponse.json({ error: "messages is required" }, { status: 400 });
    const safe = messages.slice(-20).map(m => ({ role: m.role, content: String(m.content).slice(0, 12000) }));
    const result = await generateReply(safe, body.provider);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "AI request failed. Check your provider configuration." }, { status: 500 });
  }
}
