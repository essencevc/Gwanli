# vibe-all-coding

A powerful MCP (Model Context Protocol) server that provides AI-powered coding assistance tools with Notion integration.

## Features

- **Suggest Issues**: Break down tasks and features into actionable development issues using AI
- **Task Planning**: Generate structured, manageable work items from complex requirements
- **Notion Integration**: Fetch and analyze content from Notion databases and pages

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
        "ANTHROPIC_API_KEY": "your-anthropic-api-key-here",
        "NOTION_API_KEY": "your-notion-integration-token-here"
      }
    }
  }
}
```

3. Replace the API keys with your actual tokens (see below for setup instructions)
4. Restart Claude Desktop

## Setting Up Notion Integration

To enable Notion features, you'll need to create a Notion integration:

### 1. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill out the integration details:
   - **Name**: Choose a name (e.g., "vibe-all-coding")
   - **Associated workspace**: Select your workspace
   - **Type**: Internal integration
4. Click **"Submit"**

### 2. Get Your Integration Token

1. After creation, you'll see the **"Internal Integration Token"**
2. Click **"Show"** and copy the token
3. This is your `NOTION_API_KEY` value

### 3. Share Your Content with the Integration

**Important**: Your integration needs explicit permission to access Notion content.

**For databases:**
1. Open your Notion database
2. Click the **"..."** menu in the top-right corner
3. Select **"+ Add connections"**
4. Search for and select your integration
5. Confirm access

**For pages:**
1. Open your Notion page
2. Click the **"..."** menu in the top-right corner  
3. Select **"+ Add connections"**
4. Search for and select your integration
5. Confirm access (this gives access to the page and all child pages)

### 4. Get Database/Page IDs

**Database ID**: In your database URL, copy the 32-character string before any "?" 
- Example: `https://notion.so/myworkspace/a8aec43384f447ed84390e8e42c2e089?v=...`
- Database ID: `a8aec43384f447ed84390e8e42c2e089`

**Page ID**: In your page URL, copy the 32-character string at the end
- Example: `https://notion.so/myworkspace/My-Page-a8aec43384f447ed84390e8e42c2e089`
- Page ID: `a8aec43384f447ed84390e8e42c2e089`

## Environment Variables

- `ANTHROPIC_API_KEY`: Required for the suggest_issues tool to work with Claude AI
- `NOTION_API_KEY`: Required for Notion integration features

## Tools Available

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
- "Break down building a user authentication system into development issues"
- "Suggest issues for implementing a REST API with user management"
- "Help me plan out a new feature for user dashboard analytics"

## Testing Your Setup

Use the included test script to verify your Notion integration works:

```bash
# Test your Notion API key and database access
node scripts/notion-crawler.js your-database-id
```

This script will:
- Verify your `NOTION_API_KEY` environment variable
- Test database access and permissions
- Fetch and display all pages from your database
- Show page content and metadata

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
- `scripts/` - Testing and utility scripts
- `apps/web/` - Web interface (planned)

## License

MIT
