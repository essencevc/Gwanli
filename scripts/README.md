# Scripts

## list-notion-pages.ts

Lists all accessible Notion pages for a user and prints their IDs and titles.

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
   bun list-notion-pages.ts
   ```

### Output

The script will print each page ID and title:

```
Found 3 pages:

216730a8-3bea-8055-b8fa-e96018e3e848 - Home
216730a8-3bea-8150-8ce5-fa3662679809 - Kura - Updated  
216730a8-3bea-8131-8040-f4625f248a04 - Kura
```
