import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import type { AppMode } from "@/lib/types";

export function WelcomeScreen({
  onStart,
  mode = "agent",
}: {
  onStart: () => void;
  mode?: AppMode;
}) {
  return (
    <section>
      <Eyebrow>Proline Troubleshooting</Eyebrow>
      <h1 className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-4xl">
        {mode === "customer" ? (
          <>
            Let&apos;s get your Proline
            <br className="hidden sm:block" /> working again.
          </>
        ) : (
          <>
            Welcome to the Proline
            <br className="hidden sm:block" /> Troubleshooting Guide.
          </>
        )}
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted">
        {mode === "customer" ? (
          <>
            Answer a few quick questions about what&apos;s happening. It takes
            about two minutes, and everything you tell us — photos included —
            goes straight to a Proline specialist, who&apos;ll email you within
            one to two business days. You won&apos;t have to repeat any of it.
          </>
        ) : (
          <>
            Answer a few quick questions and we&apos;ll point you to the most
            likely cause — and the fix. It works whether you&apos;re sorting out
            your own kitchen or helping a customer on the line. No account
            needed.
          </>
        )}
      </p>
      <div className="mt-6">
        <Button onClick={onStart}>
          Get started <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
