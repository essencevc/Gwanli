# Gwanli (관리) - Notion Management Architecture Plan

## Overview
Gwanli (Korean for "management") is a multi-distribution Notion integration that provides:
1. **gwanli-core** - Pure, reusable library
2. **gwanli-cli** - Command-line interface 
3. **gwanli-mcp** - MCP server for Model Context Protocol integration

## Architecture (From Oracle Consultation)

```
packages/  
├─ gwanli-core/              → Pure, reusable library  
│  ├─ src/  
│  │   ├─ index.ts          (public barrel)  
│  │   ├─ indexer.ts        (IndexNotion class)  
│  │   ├─ search.ts         (Searcher class)  
│  │   ├─ markdown.ts       (Notion→MD helpers)  
│  │   └─ db/               (better-sqlite abstractions)  
│  ├─ package.json          (type=module, exports, no bin)  
│  └─ tsconfig.json  
├─ gwanli-cli/              → End-user CLI built on the library  
│  ├─ src/cli.ts            (commander / yargs)  
│  ├─ package.json          (bin: { "gwanli": "dist/cli.js" })  
│  └─ tsconfig.json  
└─ gwanli-mcp/              → MCP server (refactored from existing)  
   ├─ src/index.ts          (MCP protocol entry)  
   ├─ src/lib/mcp.ts        (delegates to gwanli-core)  
   └─ package.json          (depends on gwanli-core)
```

## Core Library API Design

```typescript
// gwanli-core/src/index.ts - Public API
export interface IndexOptions {
  notionToken: string
  dbPath?: string
  force?: boolean
}

export interface SearchOptions {
  query: string
  dbPath?: string
  limit?: number
}

export interface SearchResult {
  id: string
  title: string
  url: string
  content: string
  lastEditedTime: string
  score: number
}

// Main API functions
export async function indexWorkspace(opts: IndexOptions): Promise<void>
export async function search(opts: SearchOptions): Promise<SearchResult[]>
export async function pageToMarkdown(id: string, token: string): Promise<string>
export async function getDatabasePages(databaseId: string, token: string): Promise<any[]>

// Re-export types for consumers
export type { Page, Block, Database } from '@notionhq/client/build/src/api-endpoints'
```

## Usage Examples

### 1. Library Usage (gwanli-core)
```typescript
// Developer using gwanli-core in their own project
import { indexWorkspace, search, pageToMarkdown } from 'gwanli-core'

// Index a workspace
await indexWorkspace({
  notionToken: process.env.NOTION_TOKEN!,
  dbPath: './my-notion.db',
  force: false
})

// Search indexed content
const results = await search({
  query: 'project management',
  dbPath: './my-notion.db',
  limit: 10
})

// Convert specific page to markdown
const markdown = await pageToMarkdown('page-id', process.env.NOTION_TOKEN!)
```

### 2. CLI Usage (gwanli-cli)
```bash
# Install globally
npm install -g gwanli-cli

# Index workspace
gwanli index --token $NOTION_TOKEN --db ./notion.db --force

# Search content
gwanli search "project management" --db ./notion.db

# Export page to markdown
gwanli export page-id --token $NOTION_TOKEN --output page.md
```

**CLI Implementation Detail:**
The CLI is a thin wrapper around gwanli-core:

```typescript
// gwanli-cli/src/cli.ts
import { Command } from 'commander'
import { indexWorkspace, search } from 'gwanli-core'  // ← Direct import

const program = new Command('gwanli')

program
  .command('index')
  .option('-t, --token <token>', 'Notion API token')
  .option('--db <path>', 'Database path', './notion.db')
  .option('--force', 'Force reindex')
  .action(async (opts) => {
    // CLI just validates args and delegates to core
    await indexWorkspace({
      notionToken: opts.token,
      dbPath: opts.db,
      force: opts.force
    })
  })
```

### 3. MCP Server Usage (gwanli-mcp)

**Installation:**
```bash
npm install gwanli-mcp
# OR use with MCP inspector
npx @modelcontextprotocol/inspector gwanli-mcp
```

**MCP Configuration:**
```json
{
  "mcpServers": {
    "gwanli": {
      "command": "gwanli-mcp",
      "env": {
        "NOTION_TOKEN": "secret_xyz",
        "ANTHROPIC_API_KEY": "sk-ant-xyz"  // ← Enables agentic features
      }
    }
  }
}
```

**Agentic Capabilities:**
The MCP server provides intelligent Notion management through these tools:

```typescript
// Available MCP tools when ANTHROPIC_API_KEY is provided
{
  "search_notion": {
    "description": "Search through indexed Notion pages. Creates index on first use.",
    "schema": { "query": "string", "notionToken": "string" }
  },
  "index_notion": {
    "description": "Index a Notion workspace using the NOTION_API_KEY",  
    "schema": { "force_reindex": "boolean", "db_location": "string" }
  },
  "suggest_issues": {
    "description": "AI-powered: Break down tasks into actionable issues using Claude",
    "schema": { "taskDescription": "string", "context": "string" }
  },
  "save_task_example": {
    "description": "AI-powered: Save task examples for future AI learning",
    "schema": { "task": "string", "context": "string", "issues": "string" }
  }
}
```

**MCP Server Architecture:**
```typescript
// gwanli-mcp/src/index.ts
import { indexWorkspace, search } from 'gwanli-core'      // ← Core functions
import { Server } from '@modelcontextprotocol/sdk/server'
import { Anthropic } from '@anthropic-ai/sdk'             // ← AI capabilities

const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const server = new Server({ name: 'gwanli', version: '1.0.0' })

// Basic Notion tools (always available)
server.setRequestHandler('search_notion', async (args) => {
  return await search({ query: args.query, dbPath: './notion.db' })
})

// AI-powered tools (only when ANTHROPIC_API_KEY provided)
if (anthropic) {
  server.setRequestHandler('suggest_issues', async (args) => {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ 
        role: 'user', 
        content: `Break down this task into actionable issues: ${args.taskDescription}` 
      }]
    })
    return { content: response.content[0].text }
  })
}
```

## Implementation Steps

1. **Create gwanli-core** - Extract all Notion logic into pure library
2. **Create gwanli-cli** - Build CLI using commander.js + gwanli-core
3. **Refactor gwanli-mcp** - Convert existing MCP to use gwanli-core
4. **Setup workspace** - Configure monorepo with TypeScript project references
5. **Add build tooling** - Turborepo/nx for efficient builds
6. **Publishing strategy** - Independent versioning for each package

## Benefits

✓ Single source of truth for Notion logic  
✓ Three distribution methods: library, CLI, MCP  
✓ Minimal dependency footprint per target  
✓ Scalable to new runtimes (web, serverless)  
✓ Professional developer experience

## Migration Strategy

- Keep existing functionality during refactor
- Temporary re-exports for backward compatibility
- Incremental migration of handlers to use gwanli-core
- Clean up after validation

## Dependencies & Publishing

### Package Dependencies
```
gwanli-core (no deps on other gwanli packages)
├── @notionhq/client
├── notion-to-md  
├── better-sqlite3
└── zod

gwanli-cli
├── gwanli-core        ← main dependency
├── commander
└── chalk (optional)

gwanli-mcp  
├── gwanli-core        ← main dependency
├── @modelcontextprotocol/sdk
└── @anthropic-ai/sdk  ← for agentic features
```

### Publishing Strategy

**Option 1: Independent Versioning** (Recommended)
- `gwanli-core@1.2.3` - Core library, independent releases
- `gwanli-cli@2.1.0` - CLI tool, depends on `gwanli-core@^1.0.0`  
- `gwanli-mcp@1.5.2` - MCP server, depends on `gwanli-core@^1.0.0`

**Option 2: Lockstep Versioning**
- All packages share same version: `@1.2.3`
- Released together, simpler but less flexible

**Publishing Order:**
1. `npm publish gwanli-core` (foundation first)
2. `npm publish gwanli-cli gwanli-mcp` (consumers second)

**Package Names:**
- `gwanli-core` - Core library
- `gwanli-cli` - CLI tool (global: `npm i -g gwanli-cli`)
- `gwanli-mcp` - MCP server (optional for most users)

## Key Architectural Insights

### Import Patterns
```typescript
// gwanli-core: Pure library - no external gwanli deps
import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'

// gwanli-cli: Simple wrapper
import { indexWorkspace, search } from 'gwanli-core'  // ← Main dependency
import { Command } from 'commander'

// gwanli-mcp: Protocol + AI wrapper  
import { indexWorkspace, search } from 'gwanli-core'  // ← Core functions
import { Server } from '@modelcontextprotocol/sdk/server'
import { Anthropic } from '@anthropic-ai/sdk'          // ← AI capabilities
```

### Distribution Strategy
- **gwanli-core**: Developers import this for embedding in apps
- **gwanli-cli**: End users install globally for command-line usage
- **gwanli-mcp**: AI agents use this for intelligent Notion management

### Agentic vs Non-Agentic Features
**Non-Agentic** (gwanli-core + gwanli-cli):
- Index Notion workspaces  
- Search indexed content
- Convert pages to markdown
- Direct API access

**Agentic** (gwanli-mcp with ANTHROPIC_API_KEY):
- All non-agentic features +
- AI-powered task breakdown
- Intelligent content analysis  
- Learning from task examples
- Context-aware suggestions

## Current Status

- ✅ Saved existing state to branch
- ✅ Architecture planning complete with detailed usage examples
- ✅ Import patterns and distribution strategy defined
- ⏳ Ready to begin implementation
