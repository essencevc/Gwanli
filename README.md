# Gwanli

A powerful Notion workspace management tool that represents your Notion pages as Markdown with filesystem-like operations.

Gwanli provides a fast, cached interface to your Notion workspace through both an MCP server and CLI tool. It converts Notion's complex block structure into clean Markdown while maintaining full read/write capabilities.

## Why Gwanli?

**Fast Local Access**: All queries run against a local SQLite cache, eliminating Notion's rate limits and providing instant results.

**Filesystem-Like Navigation**: Use familiar paths like `/fitness/weight-log` instead of cryptic page IDs.

**Markdown Interface**: Read and write Notion content as clean Markdown, perfect for automation and AI integration.

**Powerful Filtering**: Query your databases with simple conditions like `Weight > 75` or `Mood = Great` - all processed locally.

**AI-Ready**: Built-in MCP server enables AI assistants to manage your Notion workspace naturally.

## Installation

### Prerequisites

- Node.js 18 or higher
- A Notion workspace with integration access

### Install Gwanli

```bash
npm install -g gwanli
```

Or use without installing:

```bash
npx gwanli --help
```

## Setup

### 1. Get Your Notion API Key

Visit [Our deployed worker](https://worker.ivanleomk9297.workers.dev) to get your NOTION_API_KEY. If you'd like to know how the worker works, just check out [our source code here](./worker/index.ts)

### 2. Start Using the MCP Server

You can now use the MCP server directly with your API key.

## Quick Start

### Basic Usage

```bash
# List all pages
npx gwanli list "/**"

# List pages in a specific section
npx gwanli list "/projects/**"

# Get page content as Markdown
npx gwanli get "/projects/roadmap"

# Search across all content
npx gwanli search "meeting notes"
```

### Database Operations

```bash
# View database entries
npx gwanli db get "/projects/tasks"

# Filter by column values (all local - instant results)
npx gwanli db get "/projects/tasks" --where "Status = In Progress"
npx gwanli db get "/projects/tasks" --where "Priority >= 3"

# Show only specific columns
npx gwanli db get "/projects/tasks" --columns "Title,Status,Due Date"

# Combine filtering and column selection
npx gwanli db get "/projects/tasks" \
  --where "Status = In Progress" \
  --where "Priority >= 3" \
  --columns "Title,Due Date"

# Add new database entry
npx gwanli db add "/projects/tasks" --data '{
  "Title": "Review documentation",
  "Status": "Todo",
  "Priority": 2,
  "Due Date": "2025-01-10"
}'
```

### Content Management

```bash
# Create new page
npx gwanli create "/projects/new-feature" --content "# New Feature\n\nDescription here..."

# Update existing page
npx gwanli update "/projects/roadmap" --content "# Updated Roadmap\n\nNew content..."

# Append to page
npx gwanli append "/projects/meeting-notes" --content "## Action Items\n- Review code"

# Replace specific section
npx gwanli replace "/projects/status" --section "Current Sprint" --content "Sprint 23 - Week 2"
```

## Filtering and Querying

Gwanli processes all filters locally against your cached data, providing instant results without API rate limits.

### Supported Filter Operators

```bash
# Numeric comparisons
--where "Priority > 2"
--where "Score >= 85"
--where "Count <= 10"
--where "Rating = 5"

# Text matching
--where "Status = Done"
--where "Title contains 'meeting'"
--where "Notes startswith 'Important'"

# Date comparisons
--where "Due Date > 2025-01-01"
--where "Created >= 2025-01-01"

# Boolean values
--where "Completed = true"
--where "Archived = false"

# Range queries
--where "Priority between 2 and 4"

# Multiple conditions (AND logic)
--where "Status = In Progress" --where "Priority >= 3"
```

### Output Formats

```bash
# Markdown table (default)
npx gwanli db get "/projects/tasks" --where "Status = Done"

# JSON for scripting
npx gwanli db get "/projects/tasks" --format json

# XML with embedded content
npx gwanli db get "/projects/tasks" --format xml
```

## MCP Server for AI Integration

### Start MCP Server

```bash
npx gwanli-mcp
```

### Claude Desktop Integration

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "gwanli": {
      "command": "npx",
      "args": ["gwanli-mcp"],
      "env": {
        "NOTION_TOKEN": "secret_your_integration_token_here"
      }
    }
  }
}
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector gwanli-mcp
```

## Workspace Management

### Syncing Data

```bash
# Sync entire workspace
npx gwanli index

# Sync specific page and its children
npx gwanli sync "/projects/roadmap"

# Sync specific database entries
npx gwanli db sync "/projects/tasks"
```

### Workspace Exploration

```bash
# Show workspace structure
npx gwanli tree "/"

# Find all databases
npx gwanli list "/**" --type database

# Find all pages containing specific text
npx gwanli search "quarterly review"

# List pages by pattern
npx gwanli list "/projects/*/roadmap"  # All project roadmaps
npx gwanli list "/**/meeting-notes"    # All meeting notes
```

## Common Workflows

### Project Management

```bash
# View current sprint tasks
npx gwanli db get "/projects/tasks" \
  --where "Sprint = Current" \
  --where "Status != Done" \
  --columns "Title,Assignee,Priority"

# Add new task
npx gwanli db add "/projects/tasks" --data '{
  "Title": "Implement user authentication",
  "Status": "Todo",
  "Priority": 3,
  "Sprint": "Current",
  "Assignee": "John"
}'

# Update task status
npx gwanli db update "/projects/tasks" \
  --row-id "page_123" \
  --data '{"Status": "In Progress"}'

# Generate weekly report
npx gwanli create "/projects/reports/week-$(date +%Y-%m-%d)" \
  --content "# Weekly Report\n\n$(npx gwanli db get '/projects/tasks' --where 'Status = Done' --format markdown)"
```

### Personal Knowledge Management

```bash
# Daily note template
npx gwanli create "/notes/daily/$(date +%Y-%m-%d)" --content "# $(date +%Y-%m-%d)\n\n## Tasks\n\n## Notes\n\n## Reflections"

# Find all notes mentioning a topic
npx gwanli search "machine learning" --scope "/notes"

# Weekly review of completed tasks
npx gwanli db get "/personal/tasks" \
  --where "Completed = true" \
  --where "Date >= $(date -d '7 days ago' +%Y-%m-%d)"
```

### Content Migration

```bash
# Export database as JSON for processing
npx gwanli db get "/old-project/tasks" --format json > tasks.json

# Bulk create pages from data
cat tasks.json | jq -r '.[] | "/new-project/tasks/" + .id' | while read slug; do
  npx gwanli create "$slug" --content "# Task\n\nMigrated from old project"
done
```

## Configuration

### Environment Variables

```bash
NOTION_TOKEN=secret_your_integration_token_here
GWANLI_DB_PATH=/path/to/workspace.db  # Optional: custom database location
GWANLI_CACHE_TTL=3600                 # Optional: cache TTL in seconds
```

### Configuration File

Create `~/.gwanli/config.json`:

```json
{
  "notion_token": "secret_your_integration_token_here",
  "db_path": "~/Documents/gwanli-workspace.db",
  "default_format": "markdown",
  "auto_sync": false
}
```

## Data Storage

Gwanli stores your Notion data locally in SQLite for fast access:

- **Pages**: Stored as Markdown with metadata
- **Database entries**: Properties stored as JSON key-value pairs
- **Schemas**: Column definitions for validation
- **Content**: Full-text searchable

### Database Location

By default, Gwanli stores data in:

- macOS: `~/Library/Application Support/gwanli/workspace.db`
- Linux: `~/.local/share/gwanli/workspace.db`
- Windows: `%APPDATA%/gwanli/workspace.db`

## Troubleshooting

### Common Issues

**"Integration not found"**

- Ensure you've shared the specific pages with your integration
- Check that your token is correct and starts with `secret_`

**"No pages found"**

- Run `npx gwanli index` to sync your workspace
- Verify pages are shared with your integration

**"Database not found"**

- Ensure the database page is shared with your integration
- Check the slug path with `npx gwanli list "/**"`

### Getting Help

```bash
# View help for any command
npx gwanli --help
npx gwanli db --help
npx gwanli search --help

# Check current configuration
npx gwanli config

# Verify integration access
npx gwanli test-connection
```

## Privacy and Security

- All data is stored locally on your machine
- Gwanli only accesses pages explicitly shared with your integration
- No data is sent to external services (except Notion for syncing)
- Integration tokens are stored securely in environment variables

## License

MIT License - see LICENSE file for details.

---

Transform your Notion workspace into a powerful, queryable knowledge base with filesystem-like navigation and instant local search.
