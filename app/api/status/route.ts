import { NextResponse } from "next/server";
import { providerAvailability } from "@/lib/ai";

export async function GET() {
  return NextResponse.json(
    {
      providers: providerAvailability(),
      models: {
        openai: process.env.OPENAI_MODEL || "gpt-4o-mini",
        gemini: process.env.GEMINI_MODEL || "gemini-3.8-flash",
        anthropic: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        groq: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
