import { AppShell } from "@/components/layout/AppShell";
import { Troubleshooter } from "@/components/questionnaire/Troubleshooter";

export default function Home() {
  return (
    <AppShell>
      <Troubleshooter />
    </AppShell>
  );
}
