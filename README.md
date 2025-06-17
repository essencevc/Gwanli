# vibe-all-coding

A powerful MCP (Model Context Protocol) server that provides AI-powered coding assistance tools.

## Features

- **Echo Tool**: Simple text echoing for testing
- **Suggest Issues**: Break down tasks and features into actionable development issues using AI
- **Task Planning**: Generate structured, manageable work items from complex requirements

## Installation

Run vibe-all-coding directly using npx:

```bash
npx -y vibe-all-coding@latest
```

## Claude Desktop Setup

To use vibe-all-coding with Claude Desktop, add this configuration to your Claude Desktop settings:

1. Open Claude Desktop settings
2. Add the following MCP server configuration:

```json
{
  "mcpServers": {
    "vibe-all-coding": {
      "command": "npx",
      "args": ["-y", "vibe-all-coding@latest"],
      "env": {
        "ANTHROPIC_API_KEY": "your-anthropic-api-key-here"
      }
    }
  }
}
```

3. Replace `your-anthropic-api-key-here` with your actual Anthropic API key
4. Restart Claude Desktop

## Environment Variables

- `ANTHROPIC_API_KEY`: Required for the suggest_issues tool to work with Claude AI

## Tools Available

### echo
Simple tool that echoes back the provided text.

**Parameters:**
- `text` (string): The text to echo back

### suggest_issues
Breaks down complex tasks or feature requests into manageable, actionable development issues.

**Parameters:**
- `task` (string): The task or feature request to break down

**Returns:**
- Structured list of 2-4 actionable issues
- Each issue designed to take ~30 minutes of focused work
- AI-powered analysis with error handling

## Example Usage

Once configured with Claude Desktop, you can use commands like:
- "Echo this message back to me"
- "Break down building a user authentication system into development issues"
- "Suggest issues for implementing a REST API with user management"

## Development

This is a TypeScript project using ES modules and the MCP SDK.

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun test
```

## Repository Structure

- `packages/mcp/` - MCP server implementation
- `packages/gh-action/` - GitHub Action integration
- `apps/web/` - Web interface (planned)

## License

MIT
