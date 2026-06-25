import { memoryStorage } from "./memory";
import { postgresConfigured, postgresStorage } from "./postgres";
import type { StorageAdapter } from "./types";

// ┌─ Persistence seam ────────────────────────────────────────────────────────┐
// │ Uses Vercel Postgres when configured (POSTGRES_URL / DATABASE_URL present), │
// │ otherwise falls back to in-memory + structured console logging so the app   │
// │ keeps working locally and before the database is provisioned.               │
// └────────────────────────────────────────────────────────────────────────────┘
export const storage: StorageAdapter = postgresConfigured()
  ? postgresStorage
  : memoryStorage;

// OUT OF SCOPE (#4): auto-creating a customer-service ticket when a run completes.
// Implement and call it from app/api/runs/route.ts when the stopgap API lands.
//   export async function notifyTicketSystem(record: RunRecord): Promise<void> {}

export type {
  RunRecord,
  RunFeedback,
  RunAnswer,
  StoredAnswer,
  StoredDiagnosis,
  Contact,
  StorageAdapter,
} from "./types";
