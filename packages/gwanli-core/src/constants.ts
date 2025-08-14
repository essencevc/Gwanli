import { homedir } from 'os';
import { join } from 'path';

// OAuth configuration
export const OAUTH_BASE_URL = "https://worker.ivanleomk9297.workers.dev";

// Home directory configuration
export const GWANLI_HOME = join(homedir(), 'gwanli');
