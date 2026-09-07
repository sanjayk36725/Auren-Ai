import { NextRequest, NextResponse } from "next/server";
import { generateReply } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files = Array.isArray(body.files) ? body.files : [];
    const summary = files.map((f: { name?: string; content?: string }) => `FILE: ${f.name}\n${String(f.content || "").slice(0, 10000)}`).join("\n\n");
    const prompt = `Analyze this project snapshot as Auren. Return: 1) architecture summary, 2) likely bugs, 3) security risks, 4) performance opportunities, 5) prioritized next steps.\n\n${summary || "No readable source files were supplied."}`;
    const result = await generateReply([{ role: "user", content: prompt }], body.provider);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}
