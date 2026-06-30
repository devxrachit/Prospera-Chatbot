# Prospera

Prospera is a production-grade agentic AI assistant, not just a wrapper around a single LLM call. It reasons over your query, autonomously selects and chains tools (web search, document RAG, code execution, SQL, live APIs), streams its reasoning and tool steps token by token, and cites every source.

> [!WARNING]
> A previous version of this repository committed a live Google Gemini API key in `.env`. That key is now compromised and must be rotated at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey). It has since been removed from the active codebase, and `.env` is now in `.gitignore`.

## Architecture

```mermaid
graph TB
    subgraph Browser
        UI[Next.js App Router UI\nReact Server + Client Components]
    end

    subgraph Next.js Server
        API[Route Handlers\n/api/chat, /api/documents, /api/health]
        Agent[AI SDK Agent Loop\nmulti-step · streaming · tool-calling]
        Auth[Auth.js v5\nCredentials + GitHub OAuth]
    end

    subgraph Tools
        WebSearch[Web Search\nlive retrieval + citations]
        RAG[Document RAG\npgvector cosine similarity]
        Sandbox[Code Sandbox\nsafe JS/Python execution]
        SQL[SQL Query\nread-only user-scoped]
        Weather[Weather API\nstructured third-party data]
    end

    subgraph Worker Process
        BullMQ[BullMQ Worker\ndocument ingestion pipeline]
        Pipeline[Parse → OCR → Chunk\n→ Embed → pgvector]
    end

    subgraph Storage
        PG[(PostgreSQL 17\n+ pgvector)]
        Redis[(Redis 7\nqueue + rate limit cache)]
    end

    UI -->|streaming fetch| API
    API --> Auth
    API --> Agent
    Agent --> Tools
    RAG --> PG
    SQL --> PG
    Agent --> PG
    API -->|enqueue job| Redis
    BullMQ --> Redis
    BullMQ --> Pipeline
    Pipeline --> PG
```

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Agent / AI | Vercel AI SDK v4 |
| Models | Anthropic Claude (default), OpenAI, Google Gemini |
| Database | PostgreSQL 17 + pgvector |
| ORM | Drizzle |
| Cache / Queue | Redis 7 + BullMQ |
| Auth | Auth.js v5 (NextAuth) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Deploy | Docker Compose (self-hosted) or Vercel + Neon + Upstash |

## Quickstart (Docker Compose)

Prerequisites: Docker Desktop and Node.js (for running migrations locally).

```bash
# 1. Clone and set up secrets
cp .env.example .env.local
# Edit .env.local: at minimum, set NEXTAUTH_SECRET and one AI provider key

# 2. Start Postgres + Redis
docker compose up postgres redis -d

# 3. Run database migrations
DATABASE_URL=postgresql://prospera:prospera@localhost:5432/prospera npm run db:migrate

# 4. Build and start everything
docker compose up --build
```

The app will be available at `http://localhost:3000`.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values
docker compose up postgres redis -d
npm run db:migrate
npm run dev                  # Next.js on :3000 (Turbopack)
npm run worker:dev           # BullMQ worker (separate terminal)
```

### Database commands

```bash
npm run db:generate   # generate migration files from schema changes
npm run db:migrate    # apply migrations + create pgvector HNSW index
npm run db:studio     # Drizzle Studio UI on :4983
```

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `NEXTAUTH_SECRET` | Phase 2+ | - | Auth.js secret (32+ characters) |
| `NEXTAUTH_URL` | Phase 2+ | - | Canonical app URL |
| `AUTH_GITHUB_ID` | Optional | - | GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | Optional | - | GitHub OAuth client secret |
| `AI_PROVIDER` | No | `anthropic` | Active provider: `anthropic`, `openai`, or `google` |
| `AI_MODEL` | No | `claude-sonnet-4-6` | Model slug passed to the provider |
| `ANTHROPIC_API_KEY` | If `AI_PROVIDER` is `anthropic` | - | Anthropic API key |
| `OPENAI_API_KEY` | If `AI_PROVIDER` is `openai` | - | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | If `AI_PROVIDER` is `google` | - | Google AI Studio key |
| `SKIP_ENV_VALIDATION` | Build only | - | Skip env validation during the Docker build |

## How the agent loop works

1. **Request.** The user sends a message, and the Next.js route handler receives the full conversation history.
2. **Model call.** `streamText` runs with `maxSteps`, so the AI SDK calls the model with tool schemas attached. The model returns either a final answer or a tool call.
3. **Tool execution.** The SDK invokes the matching tool (web search, RAG, sandbox, and so on). Results are appended to the context, and the loop continues.
4. **Chaining.** Steps repeat until the model produces a final response, capped by the `maxSteps` guard.
5. **Streaming to the client.** Tokens and tool events stream to the UI through the AI SDK's `useChat` hook, which renders each step as it happens.
6. **Persistence.** Once streaming finishes, the full message, including all of its parts, is written to Postgres.

## Build phases

| Phase | Status | Description |
|---|---|---|
| 1. Scaffold & infra | Done | Next.js 15, Tailwind v4, Drizzle, Docker Compose, env validation |
| 2. Auth + chat shell | In progress | Auth.js, conversation sidebar, streamed model call |
| 3. Agent core + tools | Planned | AI SDK agent loop, web search, sandbox, weather |
| 4. RAG pipeline | Planned | Document upload, BullMQ ingestion, pgvector retrieval |
| 5. Polish & hardening | Planned | Rate limiting, tests, accessibility, final UI |

## Testing

```bash
npm run test       # watch mode
npm run test:run   # single run (CI)
npm run typecheck  # TypeScript strict check
```

## Vercel + managed services (production path)

1. Push to GitHub and import the project into Vercel.
2. Add a Neon Postgres and an Upstash Redis integration from the Vercel Marketplace.
3. Set the environment variables in the Vercel dashboard (AI keys, `NEXTAUTH_SECRET`, OAuth credentials).
4. Deploy. For the BullMQ worker, use Railway, Render, or a Vercel Cron Job.
