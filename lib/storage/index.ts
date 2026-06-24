import { memoryStorage } from "./memory";
import type { StorageAdapter } from "./types";

// ┌─ Persistence seam ────────────────────────────────────────────────────────┐
// │ v1 default: in-memory + structured console logging (see ./memory.ts).      │
// │ To plug in a real database, implement StorageAdapter (e.g. ./postgres,     │
// │ ./vercel-kv, ./supabase) and assign it here — nothing else in the app      │
// │ needs to change.                                                           │
// └────────────────────────────────────────────────────────────────────────────┘
export const storage: StorageAdapter = memoryStorage;

// OUT OF SCOPE (v1): auto-creating a customer-service ticket when a run completes.
// Implement this and call it from app/api/runs/route.ts when ready.
//   export async function notifyTicketSystem(record: RunRecord): Promise<void> {}

export type {
  RunRecord,
  RunFeedback,
  RunAnswer,
  RunDiagnosis,
  StorageAdapter,
} from "./types";
