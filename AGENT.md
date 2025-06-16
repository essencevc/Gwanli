# Vibe All Coding - Agent Configuration

## Codebase Overview

**Main Goal**: A monorepo providing coding agent tools through multiple distribution channels:
- GitHub Action for automated code review and agent triggering in PR workflows
- MCP Server for Model Context Protocol integration with Claude/other LLMs
- Web interface for direct interaction

**Tech Stack**:
- TypeScript monorepo using workspaces
- Bun as package manager and runtime
- MCP SDK for server implementation
- GitHub Actions SDK for workflow integration
- Zod for schema validation

**Module System & Configuration**:
- **ES Modules**: All packages use `"type": "module"` in package.json
- **TypeScript Config**: Use `"module": "ES2022"` and `"moduleResolution": "node"` 
- **Import Rules**: Always use `.js` extensions for local TypeScript imports (e.g., `"./lib/plan.js"`)
- **Path Resolution**: Use `fileURLToPath(import.meta.url)` and `dirname()` instead of `__dirname` in ES modules
- **Build Compatibility**: Ensure TypeScript output matches package.json module type

**Architecture**:
```
packages/
├── mcp/           # MCP server (currently basic echo server)
├── gh-action/     # GitHub Action implementation
└── core/          # Shared utilities and types (planned)
apps/
└── web/           # Frontend application (planned)
```

## Commands

**Build Commands**:
- `bun run build` - Build all packages
- `bun run build:action` - Build GitHub Action only  
- `bun run build:mcp` - Build MCP server only

**Development**:
- `bun run dev` - Watch mode development
- `bun run dev:web` - Start web app development server

**Testing & QA**:
- `bun test` - Run all tests
- `bun run lint` - Lint all packages

## Rules

- Create a new branch for each issue and make sure it's an atomic change
- Use vibe-all-coding MCP server to suggest issues when asked to solve issues
- Before generating issues, look into the code base to roughly understand what the code base is using, main goals and then update this Agent.md
- Follow the monorepo workspace structure defined in plan.md
- Use Zod schemas for structured data validation
- Keep packages focused: mcp for protocol server, gh-action for GitHub integration, core for shared utilities

## Knowledge Management

**After successfully implementing features, always ask the user:**
"Should I update AGENT.md with any new technical patterns, configurations, or lessons learned from this implementation to help with future development?"

This ensures we capture:
- Build system gotchas and solutions
- Configuration patterns that work
- Common error patterns and fixes
- Tech stack integration details
