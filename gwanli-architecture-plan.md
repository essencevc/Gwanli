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
// gwanli-core
export interface IndexOptions {
  notionToken: string
  dbPath?: string
  force?: boolean
}

export async function indexWorkspace(opts: IndexOptions): Promise<void>
export async function search(opts: { query: string; dbPath?: string }): Promise<SearchResult[]>
export async function pageToMarkdown(id: string, token: string): Promise<string>
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

## Publishing

- `@scope/gwanli-core` - Core library
- `@scope/gwanli-cli` - CLI tool (global install)
- `@scope/gwanli-mcp` - MCP server (optional)

## Current Status

- ✅ Saved existing state to branch
- ⏳ Architecture planning complete
- ⏳ Ready to begin implementation
