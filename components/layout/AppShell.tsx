import { Logo } from "@/components/brand/Logo";

// White-surface chrome: logo header, generous content column, quiet footer.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo tone="mono" />
          <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted sm:block">
            Agent Console
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5 text-xs text-muted">
          <span>Proline Kitchen Appliances</span>
          <span>Troubleshooting Console · v1</span>
        </div>
      </footer>
    </div>
  );
}
