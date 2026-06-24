import type { RunRecord, StorageAdapter } from "./types";

// v1 adapter: keep runs in memory AND emit a structured log line.
//
// Why not a JSON file? On Vercel the filesystem is read-only and ephemeral, so
// file writes wouldn't persist. The in-memory array resets on cold start, but the
// `[proline-run]` log line is captured by Vercel's logs — enough to verify the
// pipeline end-to-end until a real database is plugged in via lib/storage/index.ts.
const runs: RunRecord[] = [];

export const memoryStorage: StorageAdapter = {
  async saveRun(record: RunRecord): Promise<void> {
    runs.push(record);
    console.log(`[proline-run] ${JSON.stringify(record)}`);
  },
  async listRuns(): Promise<RunRecord[]> {
    return [...runs];
  },
};
