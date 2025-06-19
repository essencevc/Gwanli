# Scripts

## download-notion-pages.ts

Downloads all accessible Notion pages for a user and saves them as markdown files.

### Setup Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the "Internal Integration Token" (starts with `ntn_`)
4. Share your Notion pages/databases with the integration

### Test Your Token

Before running the script, test your Notion token with this curl command:

```bash
curl -X POST 'https://api.notion.com/v1/search' \
  -H 'Authorization: Bearer YOUR_NOTION_TOKEN' \
  -H 'Notion-Version: 2022-06-28' \
  -H 'Content-Type: application/json' \
  --data '{"query":"","page_size":10}'
```

If successful, you'll see a JSON response with your accessible pages.

### Usage

1. Set your Notion integration token:
   ```bash
   export NOTION_TOKEN="your_notion_integration_token"
   ```

2. Run the script:
   ```bash
   cd scripts
   bun download-notion-pages.ts
   ```

### Output

- Creates a `data/` directory in the project root
- Saves each page as `data/<page_id>.md`
- Includes metadata (title, creation date, last edited) in frontmatter
- Converts Notion blocks to markdown format

### Supported Block Types

- Paragraphs
- Headings (H1, H2, H3)
- Lists (bulleted, numbered)
- Todo items
- Code blocks
- Quotes
- Dividers
- Nested blocks (with indentation)
