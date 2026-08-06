import { Icon } from "@/components/ui/Icon";

// Customer-facing safety gate shown above any suggested fixes. Kept short and
// non-negotiable: power off first, never open the housing, pros for wiring.
export function SafetyNotice() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
          <Icon name="alert" className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 text-sm text-amber-900">
          <p className="font-bold">Safety first</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              Before trying any fix, switch off the hood&apos;s power at the
              circuit breaker.
            </li>
            <li>
              Never open the motor housing or touch internal wiring — if a step
              seems to need that, stop and contact us instead.
            </li>
            <li>
              Anything involving your home&apos;s wiring or ductwork is a job
              for a licensed professional.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
