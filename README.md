# vibe-all-coding

A powerful MCP (Model Context Protocol) server that provides AI-powered coding assistance tools with Notion integration.

Includes **Gwanli (관리)** - A Korean-inspired CLI tool for Notion workspace management, where "관리" means "management" in Korean.

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
        "NOTION_API_KEY": "your-notion-integration-token-here",
        "CHROMA_API_KEY": "your-chroma-api-key-here",
        "CHROMA_TENANT": "your-chroma-tenant-id",
        "CHROMA_DATABASE": "your-chroma-database-name"
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

## Setting Up ChromaDB Cloud Integration

The vibe-all-coding server uses ChromaDB for vector storage to save and retrieve task examples with embeddings. You'll need a ChromaDB Cloud account.

### 1. Create a ChromaDB Cloud Account

1. Visit [https://docs.trychroma.com/cloud/getting-started](https://docs.trychroma.com/cloud/getting-started)
2. Sign up for a ChromaDB Cloud account
3. Create a new database and tenant for your project

### 2. Get Your ChromaDB Credentials

From your ChromaDB Cloud dashboard, you'll need:
- **API Key**: Your authentication token
- **Tenant ID**: Your unique tenant identifier 
- **Database Name**: The database you want to use (e.g., "vibeallcoding")

### 3. Set Your ChromaDB Environment Variables

Add these to your environment configuration:
- `CHROMA_API_KEY`: Your ChromaDB Cloud API key
- `CHROMA_TENANT`: Your tenant ID
- `CHROMA_DATABASE`: Your database name

Note: Embeddings are automatically generated using ChromaDB's default embedding function, so no additional API keys are required for vector operations.

## Environment Variables

- `ANTHROPIC_API_KEY`: Required for the suggest_issues tool to work with Claude AI
- `NOTION_API_KEY`: Required for Notion integration features
- `CHROMA_API_KEY`: Required for ChromaDB vector storage (for task examples)
- `CHROMA_TENANT`: Your ChromaDB tenant ID
- `CHROMA_DATABASE`: Your ChromaDB database name

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

## Local CLI Usage - Gwanli (관리)

This project includes **Gwanli (관리)** - a CLI for local Notion management. "관리" means "management" in Korean.

### Quick Start

```bash
# Install dependencies
bun install

# Run CLI commands directly (builds automatically)
bun run cli --help
bun run cli hello
bun run cli index --token "your-notion-token"
```

### All CLI Commands

**Help Command**:
```bash
bun run cli --help
```

**Hello Command** (test the CLI):
```bash
bun run cli hello
```

**Index Command** (list Notion pages):
```bash
# Using environment variable for token
export NOTION_TOKEN="your-notion-integration-token"
bun run cli index

# Or pass token directly
bun run cli index --token "your-notion-integration-token"

# Index a specific database
bun run cli index --database "your-database-id"
```

### Alternative: Manual Build and Run

If you prefer to build manually:

```bash
# Build the project
bun run build

# Run from the gwanli package directory
cd packages/gwanli
node dist/cli.js --help
```

### Setting Up Your Notion Token

You can provide your Notion integration token in two ways:

1. **Environment variable** (recommended):
   ```bash
   export NOTION_TOKEN="your-notion-integration-token"
   ```

2. **Command line option**:
   ```bash
   bun run cli index --token "your-notion-integration-token"
   ```

The CLI will display all accessible pages with their titles, IDs, URLs, and timestamps.

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
