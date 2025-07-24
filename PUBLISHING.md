# Gwanli Publishing Guide

## Package Architecture

This monorepo follows the architecture defined in `gwanli-architecture-plan.md`:

- **gwanli-core** - Pure, reusable library for Notion integration
- **gwanli-mcp** - MCP server that uses gwanli-core with AI capabilities
- **gwanli** - Main package combining CLI and MCP server (published as "gwanli")

## Publishing Order

The packages must be published in this specific order due to dependencies:

1. **gwanli-core** (foundation)
2. **gwanli-mcp** (depends on gwanli-core)
3. **gwanli** (main package, depends on both)

## Manual Publishing

### Prerequisites

1. Ensure you have NPM publish access to the packages
2. Set up NPM authentication: `npm login`
3. Build all packages: `bun run build`

### Step-by-Step Publishing

```bash
# 1. Publish core library first
cd packages/gwanli-core
npm publish --access public

# 2. Update gwanli-mcp dependencies and publish
cd ../gwanli-mcp
# Replace workspace:* with actual version in package.json
npm publish --access public

# 3. Update gwanli dependencies and publish main package
cd ../gwanli
# Replace workspace:* with actual versions in package.json
npm publish --access public
```

## Automated Publishing via GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/publish-gwanli.yml`) that handles automated publishing.

### Triggers

1. **Release**: Automatically triggered when a GitHub release is published
2. **Manual**: Can be triggered manually via GitHub Actions UI with selective publishing

### Setup

1. Add `NPM_TOKEN` secret to GitHub repository settings
2. The workflow will automatically handle dependency resolution and publishing order

### Manual Trigger

Go to GitHub Actions → "Publish Gwanli Packages" → "Run workflow" and select which packages to publish.

## Installation for Users

After publishing, users can install:

```bash
# Main package (includes CLI and MCP server)
npm install -g gwanli

# Use CLI
gwanli index --token $NOTION_TOKEN
gwanli search "my query"

# Use MCP server
npx gwanli-mcp

# Install core library for development
npm install gwanli-core
```

## Verification

After publishing, verify the packages are available:

```bash
npm view gwanli-core version
npm view gwanli-mcp version
npm view gwanli version
```

## Package Dependencies

```
gwanli-core (no gwanli dependencies)
├── @notionhq/client
├── notion-to-md
├── @tursodatabase/turso
└── zod

gwanli-mcp
├── gwanli-core ← published version
├── @modelcontextprotocol/sdk
├── @anthropic-ai/sdk
└── zod

gwanli (main package)
├── gwanli-core ← published version
├── gwanli-mcp ← published version
└── commander
```
