import { NextRequest, NextResponse } from "next/server";
import type { Provider } from "./ai";

export const ALLOWED_PROVIDERS = new Set<Provider>(["openai", "gemini", "anthropic", "groq", "demo"]);

export async function readJsonObject(req: NextRequest, maxBytes: number): Promise<Record<string, unknown> | NextResponse> {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  const body: unknown = await req.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  return body as Record<string, unknown>;
}

export function readProvider(value: unknown): Provider | undefined | NextResponse {
  if (value === undefined) return undefined;
  const provider = String(value);
  if (!ALLOWED_PROVIDERS.has(provider as Provider)) {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }
  return provider as Provider;
}
