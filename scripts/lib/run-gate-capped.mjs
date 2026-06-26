// Thin wrapper around spawnSync with a hard timeout and output-size cap.
// Returns a plain object so callers never have to inspect the raw SpawnSyncReturns.
//
// runGateCapped(cmdArray, options) -> { status, stdout, stderr, timedOut }
//   cmdArray   - [cmd, ...args]
//   timeoutMs  - kill the process after this many milliseconds (default 30 000)
//   maxBuffer  - maximum bytes captured per stream (default 64 MiB)
//   timedOut   - true when spawnSync sets .signal or error.code === "ETIMEDOUT"
import { spawnSync } from "node:child_process";

export function runGateCapped(cmdArray, { timeoutMs = 30000, maxBuffer = 67108864 } = {}) {
  const [cmd, ...args] = cmdArray;
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer,
    killSignal: "SIGKILL",
  });

  const timedOut = result.signal !== null || (result.error && result.error.code === "ETIMEDOUT");

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut: Boolean(timedOut),
  };
}
