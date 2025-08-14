import { spawn, ChildProcess } from "child_process";
import { execSync } from "child_process";

export interface ProcessInfo {
  pid: number;
  command: string;
  args: string[];
  jobId?: string;
  status: "running";
}

/**
 * Spawn a child Node.js process that executes a function
 * @param taskName Name of the task for identification (will be prefixed with 'gwanli-')
 * @param taskFunction Function to execute in the child process
 * @param jobId Optional job ID to associate with the process
 * @returns ChildProcess instance
 */
export function spawnGwanliProcess(
  taskName: string,
  taskFunction: () => Promise<void> | void,
  jobId?: string
): ChildProcess {
  // Prefix task name with 'gwanli-' for identification
  const processTitle = `gwanli-${taskName}-${
    Math.floor(Math.random() * 1000) + 1
  }`;

  // Serialize the function to be executed
  const functionCode = `
    // Set process title for identification
    process.title = "${processTitle}";
    
    // Execute the task function
    (${taskFunction.toString()})()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error('Task failed:', error);
        process.exit(1);
      });
  `;

  const child = spawn("node", ["-e", functionCode], {
    stdio: ["pipe", "pipe", "pipe"],
    detached: false,
  });

  return child;
}

/**
 * Get all active gwanli processes by querying system processes
 * @returns Array of ProcessInfo objects
 */
export function listActiveGwanliProcesses(): ProcessInfo[] {
  try {
    // Get all running processes that start with 'gwanli-'
    const output = execSync('ps aux | grep "gwanli-" | grep -v grep', {
      encoding: "utf8",
    });
    const lines = output
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    const processes: ProcessInfo[] = lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[1]);
      const command = parts[10] || "gwanli-unknown";
      const args = parts.slice(11) || [];

      return {
        pid,
        command,
        args,
        status: "running" as const,
      };
    });

    return processes;
  } catch (error) {
    // If ps command fails, return empty array
    return [];
  }
}

/**
 * Kill a gwanli process by PID
 * @param pid Process ID to kill
 * @returns true if process was killed, false otherwise
 */
export function killGwanliProcess(pid: number): boolean {
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get process information by searching for a specific gwanli task name
 * @param taskName Task name to search for (will be prefixed with 'gwanli-' if not already)
 * @returns ProcessInfo if found, null otherwise
 */
export function getProcessByTaskName(taskName: string): ProcessInfo | null {
  const processTitle = taskName.startsWith("gwanli-")
    ? taskName
    : `gwanli-${taskName}`;
  const processes = listActiveGwanliProcesses();

  return processes.find((p) => p.command.includes(processTitle)) || null;
}
