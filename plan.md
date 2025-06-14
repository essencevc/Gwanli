# Vibe All Coding - Monorepo Implementation Plan

## Final File Structure

```
vibe-all-coding/
├── package.json                 # Root workspace configuration
├── action.yml                   # GitHub Action definition (at root)
├── README.md                    # Main project documentation
├── .github/
│   └── workflows/
│       ├── release.yml          # Automated release workflow
│       └── ci.yml               # Continuous integration
├── packages/
│   ├── core/                    # Shared utilities and types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── utils.ts
│   │       └── agents/
│   ├── gh-action/               # GitHub Action source code
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   └── main.ts
│   │   └── dist/               # Built files
│   │       └── index.js
│   └── mcp/                     # MCP Server
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
└── apps/
    └── web/                     # Frontend application
        ├── package.json
        ├── next.config.js
        ├── src/
        └── public/
```

## Workspace Configuration

### Root package.json
```json
{
  "name": "@essencevc/vibe-all-coding",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "bun run build:action && bun run build:mcp",
    "dev": "bun --watch dev",
    "lint": "bun run lint --filter=*",
    "test": "bun test",
    "clean": "bun run clean --filter=*",
    "build:action": "cd packages/gh-action && bun run build",
    "build:mcp": "cd packages/mcp && bun run build",
    "dev:web": "cd apps/web && bun run dev"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### Root action.yml
```yaml
name: 'Vibe All Coding Agent'
description: 'A GitHub Action for activating coding agents with configurable models and trigger words'
author: 'Ivan Leo'
inputs:
  agent:
    description: 'Which coding agent to use (amp, claude, etc.)'
    required: false
    default: 'amp'
  model:
    description: 'Model to use for the agent'
    required: false
    default: 'claude-3-sonnet'
  trigger-word:
    description: 'Trigger word to activate the agent'
    required: false
    default: '@agent'
outputs:
  result:
    description: 'Result from the coding agent'
runs:
  using: 'node20'
  main: 'packages/gh-action/dist/index.js'
```



## Package Configurations

### packages/mcp/package.json
```json
{
  "name": "@essencevc/vibe-all-coding-mcp",
  "version": "0.1.0",
  "description": "MCP server for Vibe All Coding agent",
  "main": "dist/index.js",
  "bin": {
    "vibe-all-coding-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "bun build src/index.ts --outdir=dist --target=node",
    "dev": "bun --watch src/index.ts",
    "start": "bun dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "@anthropic-ai/sdk": "^0.24.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### packages/gh-action/package.json
```json
{
  "name": "vibe-all-coding-action",
  "version": "1.0.0",
  "description": "GitHub Action source for Vibe All Coding",
  "main": "dist/index.js",
  "private": true,
  "scripts": {
    "build": "bun build src/main.ts --outdir=lib --target=node && bun run package",
    "dev": "bun --watch src/main.ts",
    "package": "ncc build lib/main.js --source-map --license licenses.txt -o dist",
    "all": "bun run build"
  },
  "dependencies": {
    "@actions/core": "^1.10.1",
    "@actions/github": "^6.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@vercel/ncc": "^0.38.0",
    "typescript": "^5.0.0"
  }
}
```

### packages/core/package.json
```json
{
  "name": "@essencevc/vibe-all-coding-core",
  "version": "0.1.0",
  "description": "Core utilities and types for Vibe All Coding",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "bun build src/index.ts --outdir=dist --target=node --format=esm --splitting",
    "dev": "bun --watch src/index.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## Release Workflow Configuration

### .github/workflows/release.yml
```yaml
name: Release

on:
  release:
    types: [published]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install dependencies
        run: bun install
        
      - name: Build all packages
        run: bun run build
        
      - name: Publish MCP package
        if: startsWith(github.ref, 'refs/tags/mcp/')
        run: cd packages/mcp && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          
      - name: Publish Core package
        if: startsWith(github.ref, 'refs/tags/core/')
        run: cd packages/core && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          
      - name: Update action dist files
        if: startsWith(github.ref, 'refs/tags/v')
        run: |
          bun run build:action
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add packages/gh-action/dist/
          git diff --staged --quiet || git commit -m "Update action dist files"
          git push origin HEAD:main
```

## Implementation Requirements

### MCP Server Setup
- Implement stdio transport for MCP protocol
- Provide tools for code review and agent triggering
- Export as executable binary via npm
- Include proper error handling and logging

### GitHub Action Setup  
- Move existing action.yml to root directory
- Update main path to reference packages/gh-action/dist/index.js
- Ensure dist/ files are committed after builds
- Maintain backward compatibility with existing usage

### Shared Core Package
- Define common types and interfaces
- Implement agent configuration utilities
- Export reusable functions for both MCP and GitHub Action
- Provide consistent error handling patterns

## Final User Experience

### GitHub Action Usage
```yaml
name: Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: essencevc/vibe-all-coding@v1
        with:
          agent: 'claude'
          model: 'claude-3-sonnet'
          trigger-word: '@review'
```

### MCP Server Usage
```json
{
  "mcpServers": {
    "vibe-all-coding": {
      "command": "npx",
      "args": ["@essencevc/vibe-all-coding-mcp@latest"]
    }
  }
}
```

### Development Workflow
```bash
# Install all dependencies
bun install

# Build all packages
bun run build

# Start development mode
bun run dev

# Build specific components
bun run build:action
bun run build:mcp

# Release process
git tag v1.0.0          # For GitHub Action
git tag mcp/v1.0.0      # For MCP package  
git tag core/v1.0.0     # For Core package
git push --tags
```

## Publishing Strategy

1. **GitHub Action**: Direct usage from main repository using root action.yml
2. **MCP Server**: Published to NPM as @essencevc/vibe-all-coding-mcp
3. **Core Package**: Published to NPM as @essencevc/vibe-all-coding-core  
4. **Frontend**: Auto-deployed to Vercel/Netlify on main branch updates

Releases are triggered by creating GitHub releases with appropriate tag patterns. The workflow automatically determines what to publish based on the tag prefix.
