// The working area for a step. Without it the questionnaire's heading, inputs,
// and buttons float directly on the page background, which reads as a wall of
// white with no sense of where the form begins or ends.
export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
      {children}
    </div>
  );
}
