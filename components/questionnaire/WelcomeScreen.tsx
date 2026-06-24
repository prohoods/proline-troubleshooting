import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="py-4">
      <Eyebrow>Proline Troubleshooting</Eyebrow>
      <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
        Welcome to the Proline
        <br className="hidden sm:block" /> Troubleshooting Guide.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
        Answer a few quick questions and we&apos;ll point you to the most likely
        cause — and the fix. It works whether you&apos;re sorting out your own
        kitchen or helping a customer on the line. No account needed.
      </p>
      <div className="mt-8">
        <Button onClick={onStart}>
          Get started <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
