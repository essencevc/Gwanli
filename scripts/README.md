# Notion Database Crawler

A simple script to fetch all pages from a Notion database using the Notion API.

## Setup

1. **Create a Notion Integration**:
   - Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Click "New integration"
   - Fill out the form and submit
   - Copy the "Internal Integration Token"

2. **Share your database with the integration**:
   - Go to your Notion database
   - Click "Share" in the top right
   - Search for your integration name and add it
   - Make sure it has "Read content" permission

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your integration token
   ```

4. **Get your database ID**:
   - Go to your Notion database
   - Copy the URL - the database ID is the 32-character alphanumeric string
   - Example: `https://notion.so/myworkspace/a8aec43384f447ed84390e8e42c2e089?v=...`
   - Database ID: `a8aec43384f447ed84390e8e42c2e089`

## Usage

```bash
# Run the crawler
node scripts/notion-crawler.js <database-id>

# Example
node scripts/notion-crawler.js a8aec43384f447ed84390e8e42c2e089
```

## What it does

- Fetches all pages from the specified Notion database
- Displays page metadata (title, creation time, last edited time)
- Retrieves and displays text content from each page
- Handles pagination automatically (fetches all pages regardless of size)
- Shows progress as it processes pages

## Output

The script will output:
- Total number of pages found
- For each page:
  - Page ID
  - Title
  - Creation and last edited timestamps
  - Number of content blocks
  - Text preview (first 200 characters)

## Error Handling

Common errors and solutions:

- **"object_not_found"**: Database ID is wrong or integration doesn't have access
- **"unauthorized"**: Integration token is invalid or missing
- **Missing NOTION_API_KEY**: Environment variable not set

## Requirements

- Node.js (or Bun)
- `@notionhq/client` package (already installed)
- Valid Notion integration token
- Database shared with the integration
