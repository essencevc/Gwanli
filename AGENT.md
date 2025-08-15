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
├── gwanli-mcp/    # Feature-complete MCP server with 9 tools
│   ├── src/
│   │   ├── index.ts                    # Main server (15 lines)
│   │   └── tools/
│   │       ├── schemas.ts             # Tool definitions & Zod schemas
│   │       ├── types.ts               # Shared TypeScript types
│   │       ├── registry.ts            # Tool registration system
│   │       └── implementations/       # Individual tool handlers
│   │           ├── auth.ts
│   │           ├── workspace.ts
│   │           ├── search.ts
│   │           ├── glob.ts
│   │           ├── view.ts
│   │           ├── index.ts
│   │           ├── jobs.ts
│   │           └── listWorkspace.ts
├── gwanli-core/   # Core Notion management functionality
├── gwanli/        # CLI interface
└── gh-action/     # GitHub Action implementation
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

- Create a new branch for each issue and make sure it's an atomic change.
- Use vibe-all-coding MCP server to suggest issues when asked to solve issues
- Before generating issues, look into the code base to roughly understand what the code base is using, main goals and then update this Agent.md
- Follow the monorepo workspace structure defined in plan.md
- Use Zod schemas for structured data validation
- Keep packages focused: mcp for protocol server, gh-action for GitHub integration, core for shared utilities

## Function Structure & Organization Patterns

**Tool Definition Pattern**:
- Define tools as const objects with `name`, `description`, and `inputSchema` (Zod schema)
- Use `as const` assertions for type safety
- Example:
  ```typescript
  export const MyTool = {
    name: "my_tool" as const,
    description: "Tool description",
    inputSchema: z.object({
      param: z.string().min(1, "Param is required"),
    }),
  } as const;
  ```

**Validation & Type Safety**:
- Always validate inputs using `tool.inputSchema.parse(args)` before processing
- Use Zod's `.min()`, `.optional()`, `.default()` for comprehensive validation
- Generate TypeScript types with `z.infer<typeof Schema>`
- Convert Zod schemas to JSON Schema using `zodToJsonSchema()` for MCP compatibility

**Function Organization**:
- Separate tool definitions (`schemas.ts`) from implementations (`lib/mcp.ts`)
- Pass dependencies as function parameters (dependency injection pattern)
- Use type-safe tool lookup with union types and exhaustive switch statements
- Handle async operations properly with `async/await`

**Environment & Configuration**:
- Use environment validation with Zod schemas for config validation
- Initialize external dependencies (storage, APIs) through environment setup
- Keep environment setup separate from core logic

**Error Handling**:
- Use MCP-specific error types (`McpError`, `ErrorCode`)
- Validate all inputs before processing
- Provide meaningful error messages
- Handle both validation errors and runtime errors appropriately

## How to Define a New MCP Tool

Follow this step-by-step process to add a new MCP tool to the gwanli-mcp server:

### 1. Define Tool Schema (`src/tools/schemas.ts`)

Add your tool definition with proper Zod validation:

```typescript
// Example: Weather tool schema
export const WeatherTool = {
  name: "getWeather" as const,
  description: "Get weather information for a location",
  inputSchema: z.object({
    location: z.string().min(1).describe("Location to get weather for"),
    units: z.enum(["celsius", "fahrenheit"]).default("celsius")
      .describe("Temperature units - defaults to celsius"),
  }),
} as const;
```

### 2. Add to Tools Export

Update the `Tools` export and add TypeScript type:

```typescript
// Export all tools
export const Tools = {
  // ... existing tools
  getWeather: WeatherTool,
} as const;

// Generate TypeScript types  
export type GetWeatherArgs = z.infer<typeof WeatherTool.inputSchema>;
```

### 3. Create Implementation (`src/tools/implementations/weather.ts`)

Create a handler file with proper error handling:

```typescript
import type { GetWeatherArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";

export const weatherHandler: ToolHandler<GetWeatherArgs> = async (args) => {
  try {
    // Your tool logic here
    const weather = await fetchWeather(args.location, args.units);
    
    return {
      content: [
        {
          type: "text",
          text: `Weather in ${args.location}: ${weather.temperature}°${args.units}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text", 
          text: `Error getting weather: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
```

### 4. Register in Registry (`src/tools/registry.ts`)

Import and add your handler:

```typescript
import { weatherHandler } from "./implementations/weather.js";

export const toolHandlers = {
  // ... existing handlers
  getWeather: weatherHandler,
} as const;
```

### 5. Build and Test

```bash
bun run build:mcp
```

**Key Patterns to Follow:**
- Always use `McpResponse` return type with `content` array
- Include `isError: true` for error responses  
- Validate inputs with `tool.inputSchema.parse(args)`
- Use descriptive error messages
- Follow async/await patterns consistently
- Keep handlers pure and testable

## Knowledge Management

**After successfully implementing features, always ask the user:**
"Should I update AGENT.md with any new technical patterns, configurations, or lessons learned from this implementation to help with future development?"

This ensures we capture:

- Build system gotchas and solutions
- Configuration patterns that work
- Common error patterns and fixes
- Tech stack integration details
