import { NextResponse } from "next/server";
import { providerAvailability } from "@/lib/ai";

export async function GET() {
  return NextResponse.json(
    {
      providers: providerAvailability(),
      models: {
        openai: process.env.OPENAI_MODEL || "gpt-4o-mini",
        gemini: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        anthropic: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        groq: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
