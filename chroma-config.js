import { ChromaClient } from 'chromadb';
import { join } from 'path';
import { homedir } from 'os';

// Environment variable for ChromaDB path
const CHROMA_DB_PATH = process.env.CHROMA_DB_PATH || join(homedir(), '.vibeallcoding', 'chromadb');

// Create ChromaDB client with persistent storage
export function createChromaClient() {
  const client = new ChromaClient({
    path: CHROMA_DB_PATH
  });
  
  console.log(`ChromaDB initialized at: ${CHROMA_DB_PATH}`);
  return client;
}

// Export the path for reference
export { CHROMA_DB_PATH };
