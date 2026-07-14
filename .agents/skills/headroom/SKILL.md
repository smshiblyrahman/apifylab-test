---
name: headroom
description: >
  Expert guide for integrating Headroom (headroom-ai) — the context compression layer for AI agents.
  Compresses tool outputs, logs, RAG chunks, files, and conversation history before they reach the LLM.
  Achieves 60–95% token reduction while preserving accuracy. Library, proxy, MCP server, and agent-wrap modes.

  ALWAYS trigger this skill when user mentions:
  - "headroom", "headroom-ai", "compress context", "token compression", "context compression"
  - reducing tokens in LLM calls, compressing tool outputs or agent context
  - integrating headroom with Claude Code, Cursor, Codex, LangChain, Agno, Vercel AI SDK, LiteLLM
  - setting up headroom proxy, headroom wrap, headroom MCP, SmartCrusher, CodeCompressor, Kompress
  - cross-agent memory, CCR (reversible compression), CacheAligner, IntelligentContext
  - "headroom learn", output token reduction, verbosity steering, effort routing
  - questions like "how do I reduce my LLM token usage" or "compress prompts before sending"
---

# Headroom Skill

Headroom compresses everything AI agents read (tool outputs, logs, RAG chunks, files, history) before it hits the LLM. Same answers, 60–95% fewer tokens.

## Modes

| Mode | Command | Use when |
|------|---------|----------|
| **Library** | `from headroom import compress` / `import { compress }` | Inline in app code |
| **Proxy** | `headroom proxy --port 8787` | Zero code changes, any language |
| **Agent wrap** | `headroom wrap claude\|codex\|cursor\|aider\|copilot` | Wrap existing coding agent |
| **MCP server** | `headroom mcp install` | MCP-native clients |

## Install

```bash
pip install "headroom-ai[all]"    # Python (requires 3.10+)
npm install headroom-ai           # TypeScript/Node
docker pull ghcr.io/chopratejas/headroom:latest
```

Granular extras: `[proxy]` `[mcp]` `[ml]` `[code]` `[memory]` `[relevance]` `[image]` `[agno]` `[langchain]` `[evals]` `[pytorch-mps]`

## Quick Start (60 seconds)

```bash
headroom wrap claude        # wrap Claude Code agent
headroom proxy --port 8787  # drop-in proxy
headroom perf               # see savings
headroom dashboard          # live savings dashboard
```

## Integration Patterns

Read `references/integrations.md` for full code examples per framework.

| Stack | Hook |
|-------|------|
| Python app | `compress(messages, model=…)` |
| TypeScript app | `await compress(messages, { model })` |
| Anthropic SDK | `withHeadroom(new Anthropic())` |
| OpenAI SDK | `withHeadroom(new OpenAI())` |
| Vercel AI SDK | `wrapLanguageModel({ model, middleware: headroomMiddleware() })` |
| LiteLLM | `litellm.callbacks = [HeadroomCallback()]` |
| LangChain | `HeadroomChatModel(your_llm)` |
| Agno | `HeadroomAgnoModel(your_model)` |
| ASGI | `app.add_middleware(CompressionMiddleware)` |
| Multi-agent | `SharedContext().put / .get` |

## Architecture: How It Works

```
Your agent / app
  (Claude Code, Cursor, Codex, LangChain, Agno, Strands…)
       │   prompts · tool outputs · logs · RAG results · files
       ▼
   ┌────────────────────────────────────────────────────┐
   │  Headroom   (runs locally — your data stays here)  │
   │  ────────────────────────────────────────────────  │
   │  CacheAligner  →  ContentRouter  →  CCR            │
   │                    ├─ SmartCrusher   (JSON)        │
   │                    ├─ CodeCompressor (AST)         │
   │                    └─ Kompress-base  (text, HF)    │
   │                                                    │
   │  Cross-agent memory  ·  headroom learn  ·  MCP     │
   └────────────────────────────────────────────────────┘
       │   compressed prompt  +  retrieval tool
       ▼
LLM provider  (Anthropic · OpenAI · Bedrock · …)
```

**Core components:**
- **ContentRouter** — detects content type, selects right compressor
- **SmartCrusher** — universal JSON (arrays, nested objects, mixed types)
- **CodeCompressor** — AST-aware: Python, JS, Go, Rust, Java, C++
- **Kompress-base** — HuggingFace model trained on agentic traces
- **CacheAligner** — stabilizes prefixes so provider KV caches hit
- **CCR** — reversible compression; LLM retrieves originals on demand
- **IntelligentContext** — score-based context fitting with learned importance
- **Cross-agent memory** — shared store, agent provenance, auto-dedup

## Output Token Reduction

Cuts what the model *writes back* (not just what you send). Particularly valuable on Opus-class models where output costs 5× input.

```bash
export HEADROOM_OUTPUT_SHAPER=1
headroom proxy --port 8787
```

Features:
- **Verbosity steering** — appends terse note to system prompt (preserves prompt cache)
- **Effort routing** — dials thinking effort down for routine tool-result turns

Auto-tune verbosity from past sessions:
```bash
headroom learn --verbosity         # dry run preview
headroom learn --verbosity --apply # save & apply
```

Measure savings:
```bash
headroom output-savings
# Reduction: 31.7%  (95% CI 27.7% … 35.7%)   [estimated]
# Set HEADROOM_OUTPUT_HOLDOUT=0.1 for measured control group
```

## headroom learn

Mines failed agent sessions, writes corrections to `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`.

```bash
headroom learn              # mine failures from recent sessions
headroom learn --verbosity  # also tune output verbosity
```

## Agent Compatibility

| Agent | `headroom wrap` | Notes |
|-------|-----------------|-------|
| Claude Code | ✅ | `--memory` · `--code-graph` |
| Codex | ✅ | shares memory with Claude |
| Cursor | ✅ | prints config — paste once |
| Aider | ✅ | starts proxy + launches |
| Copilot CLI | ✅ | starts proxy + launches |
| OpenClaw | ✅ | installs as ContextEngine plugin |

Any OpenAI-compatible client works via `headroom proxy`.

## MCP Tools

When using headroom as MCP server, three tools are exposed:
- `headroom_compress` — compress context before sending
- `headroom_retrieve` — retrieve original (CCR) when needed
- `headroom_stats` — view compression stats

Install: `headroom mcp install`

## Key Env Vars

| Var | Effect |
|-----|--------|
| `HEADROOM_OUTPUT_SHAPER=1` | Enable output token reduction |
| `HEADROOM_OUTPUT_HOLDOUT=0.1` | 10% control group for measured savings |
| `HEADROOM_EMBEDDER_RUNTIME=pytorch_mps` | Apple-GPU memory-embedder offload |
| `HEADROOM_UPDATE_CHECK=off` | Disable update checks (CI) |
| `HEADROOM_CONTEXT_TOOL=lean-ctx` | Use lean-ctx for CLI context |
| `HF_HUB_OFFLINE=1` | Offline mode (pre-download Kompress model) |
| `ORT_STRATEGY=system` | Use system ONNX Runtime |

## Benchmark Results

| Workload | Before | After | Savings |
|----------|--------|-------|---------|
| Code search (100 results) | 17,765 | 1,408 | **92%** |
| SRE incident debugging | 65,694 | 5,118 | **92%** |
| GitHub issue triage | 54,174 | 14,761 | **73%** |
| Codebase exploration | 78,502 | 41,254 | **47%** |

Accuracy preserved: GSM8K ±0.000, TruthfulQA +0.030, SQuAD v2 97% @ 19% compression.

## When to Use / Skip

**Great fit:** daily AI coding agents, cross-agent memory needs, reversible compression requirement.

**Skip if:** single-provider native compaction is enough, or sandboxed env where local processes can't run.

## Update

```bash
headroom update          # auto-detects pip/pipx/uv and upgrades
headroom update --check  # check latest without upgrading
headroom update --pre    # include pre-releases
```

## SSL / Corporate Proxy Issues

If `pip install` fails with `CERTIFICATE_VERIFY_FAILED`:
```bash
# Install Rust first (avoids maturin downloading rustup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh && rustup default stable
pip install "headroom-ai[all]"
# Or prebuilt wheel: pip install --only-binary headroom-ai headroom-ai
```

Two runtime assets need TLS access:
- `cdn.pyke.io` — ONNX Runtime (override: `ORT_STRATEGY=system`)
- `huggingface.co` — Kompress-base model (override: `HF_HUB_OFFLINE=1`)

## Docs & Resources

- Full docs: https://headroom-docs.vercel.app/docs
- llms.txt: https://headroom-docs.vercel.app/llms.txt
- Full docs blob: https://headroom-docs.vercel.app/llms-full.txt
- Kompress model: https://huggingface.co/chopratejas/kompress-v2-base
- Discord: https://discord.gg/yRmaUNpsPJ

See `references/integrations.md` for full code examples.
