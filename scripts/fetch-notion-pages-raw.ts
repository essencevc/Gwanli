#!/usr/bin/env bun

import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) {
  console.error('Please set NOTION_TOKEN environment variable');
  process.exit(1);
}

const notion = new Client({
  auth: NOTION_TOKEN,
});

async function fetchAllPages() {
  try {
    console.log('Fetching all accessible pages...\n');
    
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'page',
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });

    console.log('Raw payload:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Failed to fetch pages:', error);
    process.exit(1);
  }
}

fetchAllPages();
