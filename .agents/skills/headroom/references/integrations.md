# Headroom Integration Examples

## Python Library

```python
from headroom import compress

messages = [{"role": "user", "content": "...huge tool output..."}]
compressed = compress(messages, model="claude-sonnet-4-6")
# compressed is drop-in replacement for messages
```

## TypeScript Library

```typescript
import { compress } from 'headroom-ai';

const compressed = await compress(messages, { model: 'claude-sonnet-4-6' });
```

## Anthropic SDK Wrapper

```python
from anthropic import Anthropic
from headroom import withHeadroom

client = withHeadroom(Anthropic())
# Use client exactly like normal Anthropic client
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "..."}]
)
```

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { withHeadroom } from 'headroom-ai';

const client = withHeadroom(new Anthropic());
```

## OpenAI SDK Wrapper

```python
from openai import OpenAI
from headroom import withHeadroom

client = withHeadroom(OpenAI())
```

## Vercel AI SDK

```typescript
import { wrapLanguageModel } from 'ai';
import { headroomMiddleware } from 'headroom-ai';
import { anthropic } from '@ai-sdk/anthropic';

const model = wrapLanguageModel({
  model: anthropic('claude-sonnet-4-6'),
  middleware: headroomMiddleware(),
});
```

## LiteLLM

```python
import litellm
from headroom.integrations.litellm import HeadroomCallback

litellm.callbacks = [HeadroomCallback()]
# All litellm calls now compressed automatically
```

## LangChain

```python
from langchain_anthropic import ChatAnthropic
from headroom.integrations.langchain import HeadroomChatModel

llm = HeadroomChatModel(ChatAnthropic(model="claude-sonnet-4-6"))
```

## Agno

```python
from agno.models.anthropic import Claude
from headroom.integrations.agno import HeadroomAgnoModel

model = HeadroomAgnoModel(Claude(id="claude-sonnet-4-6"))
```

## ASGI Middleware (FastAPI / Starlette)

```python
from fastapi import FastAPI
from headroom.middleware import CompressionMiddleware

app = FastAPI()
app.add_middleware(CompressionMiddleware)
```

## Multi-Agent: SharedContext

```python
from headroom.memory import SharedContext

ctx = SharedContext()

# Agent A writes
ctx.put("key", large_data, agent="claude")

# Agent B reads (auto-deduped, compressed)
data = ctx.get("key", agent="codex")
```

## Proxy Mode (zero code changes)

```bash
# Start proxy
headroom proxy --port 8787

# Point any OpenAI-compatible client to localhost:8787
export ANTHROPIC_BASE_URL=http://localhost:8787
export OPENAI_BASE_URL=http://localhost:8787

# All requests compressed transparently
```

## Agent Wrap Examples

```bash
# Claude Code
headroom wrap claude
headroom wrap claude --memory              # enable cross-agent memory
headroom wrap claude --memory --code-graph # + code graph indexing

# Cursor (prints config to paste)
headroom wrap cursor

# Aider
headroom wrap aider

# Codex (shares memory with Claude)
headroom wrap codex

# GitHub Copilot CLI
headroom copilot-auth login
headroom wrap copilot --subscription -- --model gpt-4o
```

## GitHub Copilot Enterprise

```bash
export GITHUB_COPILOT_ENTERPRISE_DOMAIN=ghe.example.com
headroom wrap copilot --subscription
```

## MCP Server Setup

```bash
headroom mcp install
```

Then in any MCP client, tools available:
- `headroom_compress` — compress context
- `headroom_retrieve` — retrieve original via CCR
- `headroom_stats` — view compression stats

## CCR: Reversible Compression

Headroom stores originals locally. LLM can call `headroom_retrieve` to get originals when needed.

```python
from headroom import compress
from headroom.ccr import CCRStore

store = CCRStore()
compressed, ccr_id = compress(messages, model="...", return_ccr_id=True)
# Later...
original = store.retrieve(ccr_id)
```

## Perf & Monitoring

```bash
headroom perf              # benchmark compression on sample data
headroom dashboard         # live savings dashboard (proxy must be running)
headroom output-savings    # estimate output token savings
headroom stats             # compression stats summary
```

## Pipeline Lifecycle Hooks

```python
from headroom import HeadroomClient
from headroom.pipeline import PipelineExtension

class MyExtension(PipelineExtension):
    def on_pipeline_event(self, event, context):
        if event == "Input Compressed":
            print(f"Compressed to {context.token_count} tokens")

client = HeadroomClient(extensions=[MyExtension()])
```

Pipeline stages (in order):
`Setup` → `Pre-Start` → `Post-Start` → `Input Received` → `Input Cached` → `Input Routed` → `Input Compressed` → `Input Remembered` → `Pre-Send` → `Post-Send` → `Response Received`
