"use client";

import { useMemo, useState } from "react";
import { resolveDiagnoses } from "@/lib/diagnoses/resolve";
import type { Category } from "@/lib/flow";
import {
  buildSteps,
  collectAnswers,
  isAnswered,
  projectedTotal,
  sectionLabel,
} from "@/lib/flow/engine";
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

  const flow = category?.flow;
  const steps = useMemo(
    () => (flow ? buildSteps(flow, answers) : []),
    [flow, answers],
  );

  const safeIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const current = steps[safeIndex];

  const setAnswer = (id: string, value: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const resetRun = () => {
    setAnswers({});
    setStepIndex(0);
  };

  const pickCategory = (c: Category) => {
    resetRun();
    setCategory(c);
    setPhase("questions");
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
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  // Diagnoses for the completed run.
  const diagnosis = useMemo(
    () => (flow ? resolveDiagnoses(flow, answers) : null),
    [flow, answers],
  );

  const submitFeedback = async (
    feedback: RunFeedback,
  ): Promise<{ ok: boolean }> => {
    if (!flow || !category || !diagnosis) return { ok: false };
    const payload = {
      category: category.id,
      branchKey: diagnosis.branchKey,
      pathValue: diagnosis.pathValue,
      answers: collectAnswers(flow, answers),
      diagnoses: diagnosis.diagnoses.map((d) => ({ id: d.id, title: d.title })),
      feedback,
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
      />
    );
  }

  if (phase === "diagnosis" && diagnosis) {
    return (
      <DiagnosisScreen
        result={diagnosis}
        onSubmitFeedback={submitFeedback}
        onRestart={restart}
      />
    );
  }

  return null;
}
