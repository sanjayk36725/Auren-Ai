# Auren AI

Auren is a Context-Aware Conversational Visual Intelligence Assistant for chat, project analysis and developer workflows. The interface follows the supplied visual reference: warm neutral palette, collapsible navigation, centered composer, model selector, dashboard upload workflow, analysis progress and project cards. The original reference used simulated responses; this implementation replaces those simulations with real server-side provider calls and a safe demo fallback. fileciteturn1file1L1-L8

## Features

- OpenAI, Google Gemini and Anthropic Claude provider adapters
- Automatic provider selection when a requested provider is unavailable
- Safe local demo mode when no API key is configured
- Conversational chat with recent context
- Text/source-file attachment support
- Project upload and AI analysis endpoint
- Architecture, bug, security and performance analysis prompt
- Dashboard workflow and preview/code/structure/log views
- Code Analyzer, Bug Finder, UI Generator, Performance and project workspaces
- Light/dark theme and responsive layout
- API keys stay server-side in environment variables

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

With no provider keys, chat and analysis still run in Demo Mode. For live inference, add one or more provider keys to `.env.local`.

## Provider configuration

`OPENAI_API_KEY` + optional `OPENAI_MODEL`
`GEMINI_API_KEY` + optional `GEMINI_MODEL`
`ANTHROPIC_API_KEY` + optional `ANTHROPIC_MODEL`

Auren selects the explicitly requested provider when its key exists; otherwise it falls back to the first configured provider and finally to Demo Mode.

## Important implementation note

The browser never receives provider API keys. `/api/chat` and `/api/analyze` execute provider calls on the server. Uploaded source text is capped before inference to keep requests bounded. Production deployments should add authentication, persistent database storage, rate limiting, file scanning and per-user quotas before exposing the API publicly.

## Project structure

```text
app/
  api/chat/route.ts       # conversational inference
  api/analyze/route.ts    # project analysis
  globals.css             # Auren visual system
  layout.tsx
  page.tsx                # workspace UI
lib/
  ai.ts                   # provider abstraction + routing
.env.example
```

## Academic project identity

Formal name: **Context-Aware Conversational Visual Intelligence Assistant**

AI name: **Auren**

The system is designed as a unified interface over multiple AI providers with intelligent routing, project intelligence and developer-oriented analysis workflows.
