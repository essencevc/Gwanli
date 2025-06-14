# Vibe All Coding - Monorepo Implementation Plan

## Final File Structure

```
vibe-all-coding/
├── package.json                 # Root workspace configuration
├── action.yml                   # GitHub Action definition (at root)
├── turbo.json                   # Turborepo build configuration
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
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean",
    "build:action": "cd packages/gh-action && npm run build",
    "build:mcp": "cd packages/mcp && npm run build",
    "dev:web": "cd apps/web && npm run dev"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.0.0"
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

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "clean": {
      "cache": false
    }
  }
}
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
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
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
    "build": "tsc && ncc build lib/main.js --source-map --license licenses.txt -o dist",
    "dev": "tsc --watch",
    "package": "ncc build lib/main.js --source-map --license licenses.txt -o dist",
    "all": "npm run build && npm run package"
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
    "build": "tsc",
    "dev": "tsc --watch"
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
        run: npm ci
        
      - name: Build all packages
        run: npm run build
        
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
          npm run build:action
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
npm install

# Build all packages
npm run build

# Start development mode
npm run dev

# Build specific components
npm run build:action
npm run build:mcp

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
