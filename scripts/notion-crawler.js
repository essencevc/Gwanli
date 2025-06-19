#!/usr/bin/env node

import { Client } from '@notionhq/client';
import { config } from 'dotenv';

// Load environment variables
config();

const notion = new Client({
  auth: process.env.NOTION_API_KEY || process.env.NOTION_TOKEN,
});

console.log(process.env.NOTION_API_KEY || process.env.NOTION_TOKEN,)

const result = await notion.search({
  filter: {
    property: 'object',
    value: 'page'
  }
});

console.log(result.results)