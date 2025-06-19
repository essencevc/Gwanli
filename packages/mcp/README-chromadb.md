# ChromaDB Setup

This MCP server uses ChromaDB for storing task examples with vector embeddings and requires a Chroma Cloud account.

## Prerequisites

You must have a Chroma Cloud account to use this MCP server.

## Setup

1. **Sign up for Chroma Cloud:**
   Visit [https://docs.trychroma.com/cloud/getting-started](https://docs.trychroma.com/cloud/getting-started)

2. **Get your credentials:**

   - Copy your Chroma Cloud URL from your dashboard
   - Copy your authentication token

3. **Set environment variables:**
   ```bash
   export CHROMA_URL="https://your-instance.trychroma.com"
   export CHROMA_AUTH_TOKEN="your-auth-token"
   export OPENAI_API_KEY="your-openai-key"
   ```

## Configuration

The MCP server requires these environment variables:

- `CHROMA_URL` - Your Chroma Cloud endpoint URL (required)
- `CHROMA_AUTH_TOKEN` - Your Chroma Cloud authentication token (required)
- `CHROMA_DATABASE` - Your Chroma Cloud database name ( required )
- `OPENAI_API_KEY` - OpenAI API key for generating embeddings (required)

## Data Persistence

All data is automatically persisted and managed by Chroma Cloud. No local setup or maintenance required.
