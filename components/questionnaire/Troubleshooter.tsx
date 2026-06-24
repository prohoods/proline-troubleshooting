"use client";

import { useMemo, useState } from "react";
import type { Diagnosis } from "@/lib/diagnoses/types";
import { resolveDiagnoses } from "@/lib/diagnoses/resolve";
import type { Category } from "@/lib/flow";
import { NO_ORDER_VALUE } from "@/lib/flow/constants";
import {
  buildSteps,
  collectAnswers,
  collectAnswersDisplay,
  isAnswered,
  projectedTotal,
  sectionLabel,
} from "@/lib/flow/engine";
import { findSpec, type SpecMatch } from "@/lib/knowledge/specSheets";
import type { SelectedOrder } from "@/lib/shopify/types";
import type { RunFeedback } from "@/lib/storage/types";
import type { Answers, AnswerValue } from "@/lib/types";
import { CategoryScreen } from "./CategoryScreen";
import { DiagnosisScreen } from "./DiagnosisScreen";
import { QuestionScreen } from "./QuestionScreen";
import { WelcomeScreen } from "./WelcomeScreen";

type Phase = "welcome" | "category" | "questions" | "diagnosis";

export function Troubleshooter() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [category, setCategory] = useState<Category | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrder | null>(null);
  // AI-tailored diagnosis: null until fetched; stays null to fall back to the
  // deterministic diagnoses when the LLM is unconfigured or the call fails.
  const [aiDiagnoses, setAiDiagnoses] = useState<Diagnosis[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const flow = category?.flow;
  const steps = useMemo(
    () => (flow ? buildSteps(flow, answers) : []),
    [flow, answers],
  );

  const safeIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const current = steps[safeIndex];

  // Deterministic diagnoses for the completed run — also the fallback when the AI
  // is unavailable, and the source of branch/path metadata for the saved record.
  const diagnosis = useMemo(
    () => (flow ? resolveDiagnoses(flow, answers) : null),
    [flow, answers],
  );

  // Matched spec sheet (for the PDF link + summary). Manual model only on the
  // no-order path, so it never overrides a found order's product.
  const spec = useMemo<SpecMatch | null>(() => {
    const manual =
      answers["p_order_lookup"] === NO_ORDER_VALUE &&
      typeof answers["p_hood_model"] === "string"
        ? answers["p_hood_model"]
        : undefined;
    return findSpec([
      selectedOrder?.product.title,
      selectedOrder?.product.sku,
      manual,
    ]);
  }, [selectedOrder, answers]);

  // Human-readable answers (option labels, not slugs) for the copyable summary.
  const displayAnswers = useMemo(
    () => (flow ? collectAnswersDisplay(flow, answers) : []),
    [flow, answers],
  );

  const setAnswer = (id: string, value: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const resetRun = () => {
    setAnswers({});
    setStepIndex(0);
    setSelectedOrder(null);
    setAiDiagnoses(null);
    setAiLoading(false);
  };

  const pickCategory = (c: Category) => {
    resetRun();
    setCategory(c);
    setPhase("questions");
  };

  const runDiagnosis = async () => {
    if (!flow || !category) return;
    setAiLoading(true);
    setAiDiagnoses(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category.id,
          branchKey: diagnosis?.branchKey,
          pathValue: diagnosis?.pathValue,
          answers: collectAnswers(flow, answers),
          order: selectedOrder ?? undefined,
          // Only on the manual path — avoids a stale model overriding a found order.
          modelText:
            answers["p_order_lookup"] === NO_ORDER_VALUE &&
            typeof answers["p_hood_model"] === "string"
              ? answers["p_hood_model"]
              : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({ ok: false }))) as {
        ok?: boolean;
        diagnoses?: Diagnosis[];
      };
      if (res.ok && json.ok && Array.isArray(json.diagnoses) && json.diagnoses.length) {
        setAiDiagnoses(json.diagnoses);
      }
    } catch {
      // Leave aiDiagnoses null → DiagnosisScreen renders the deterministic set.
    } finally {
      setAiLoading(false);
    }
  };

  const back = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else setPhase("category");
  };

  const next = () => {
    if (!flow || !current || !isAnswered(current, answers)) return;
    const nextSteps = buildSteps(flow, answers);
    if (current.terminal && safeIndex + 1 >= nextSteps.length) {
      setPhase("diagnosis");
      void runDiagnosis();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const shownDiagnoses = aiDiagnoses ?? diagnosis?.diagnoses ?? [];

  const submitFeedback = async (
    feedback: RunFeedback,
    agentNotes?: string,
  ): Promise<{ ok: boolean }> => {
    if (!flow || !category || !diagnosis) return { ok: false };
    const payload = {
      category: category.id,
      branchKey: diagnosis.branchKey,
      pathValue: diagnosis.pathValue,
      order: selectedOrder ?? undefined,
      answers: collectAnswers(flow, answers),
      diagnoses: shownDiagnoses.map((d) => ({ id: d.id, title: d.title })),
      feedback,
      agentNotes: agentNotes?.trim() || undefined,
    };
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({ ok: false }))) as {
        ok?: boolean;
      };
      return { ok: res.ok && json.ok === true };
    } catch {
      return { ok: false };
    }
  };

  const restart = () => {
    resetRun();
    setCategory(null);
    setPhase("category");
  };

  // Progress: project the total from current commitments so the bar only moves
  // forward as the path narrows — render-pure, no stored floor needed.
  let progress = 0;
  if (phase === "questions" && flow && steps.length > 0) {
    const total = projectedTotal(flow, answers);
    progress = total > 1 ? Math.min(1, safeIndex / (total - 1)) : 0;
  }

  if (phase === "welcome") {
    return <WelcomeScreen onStart={() => setPhase("category")} />;
  }

  if (phase === "category") {
    return (
      <CategoryScreen onPick={pickCategory} onBack={() => setPhase("welcome")} />
    );
  }

  if (phase === "questions" && flow && current) {
    return (
      <QuestionScreen
        question={current}
        answers={answers}
        section={sectionLabel(flow, answers, current)}
        progress={progress}
        stepNumber={safeIndex + 1}
        canContinue={isAnswered(current, answers)}
        onChange={setAnswer}
        onBack={back}
        onContinue={next}
        selectedOrder={selectedOrder}
        onSelectOrder={setSelectedOrder}
      />
    );
  }

  if (phase === "diagnosis") {
    if (aiLoading) {
      return (
        <section className="flex flex-col items-center justify-center py-24 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-sky" />
          <h2 className="mt-6 text-xl font-bold text-ink">
            Analyzing your answers…
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            We&apos;re matching what you told us with your model&apos;s specs to
            find the most likely fix.
          </p>
        </section>
      );
    }
    if (diagnosis && shownDiagnoses.length > 0) {
      return (
        <DiagnosisScreen
          result={{
            branchKey: diagnosis.branchKey,
            pathValue: diagnosis.pathValue,
            diagnoses: shownDiagnoses,
          }}
          order={selectedOrder}
          answers={displayAnswers}
          spec={spec}
          onSubmitFeedback={submitFeedback}
          onRestart={restart}
        />
      );
    }
  }

  return null;
}
