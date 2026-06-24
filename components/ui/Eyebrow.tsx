// Brand eyebrow: uppercase, wide-tracked, Sky Blue, with the short rule used
// throughout the playbook section openers.
export function Eyebrow({
  children,
  rule = true,
  className = "",
}: {
  children: React.ReactNode;
  rule?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky">
        {children}
      </p>
      {rule && <span className="mt-2 block h-0.5 w-8 rounded-full bg-sky" />}
    </div>
  );
}
