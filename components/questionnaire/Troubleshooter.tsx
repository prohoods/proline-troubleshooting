"use client";

import { useMemo, useState } from "react";
import type { Diagnosis } from "@/lib/diagnoses/types";
import { resolveDiagnoses } from "@/lib/diagnoses/resolve";
import { categories, type Category } from "@/lib/flow";
import {
  NO_ORDER_VALUE,
  SAFETY_EMERGENCY_VALUE,
  SAFETY_GATE_ID,
} from "@/lib/flow/constants";
import {
  buildSteps,
  collectAnswers,
  collectAnswersDisplay,
  isAnswered,
  projectedTotal,
  sectionLabel,
  selectedIssueLabels,
} from "@/lib/flow/engine";
import { looksLikeHood, looksLikeRange } from "@/lib/knowledge/productKind";
import { findSpec, type SpecMatch } from "@/lib/knowledge/specSheets";
import type { SelectedOrder } from "@/lib/shopify/types";
import type { Contact, RunFeedback } from "@/lib/storage/types";
import type { Answers, AnswerValue, AppMode } from "@/lib/types";
import { apiUrl } from "@/lib/apiBase";
import { Panel } from "@/components/ui/Panel";
import { downscaleImage } from "@/lib/images/downscale";
import { buildMessage, buildSummary } from "@/lib/support/summary";
import type { SupportResult } from "@/lib/support/types";
import { CategoryScreen } from "./CategoryScreen";
import { ContactStep } from "./ContactStep";
import { DiagnosisScreen } from "./DiagnosisScreen";
import { QuestionScreen } from "./QuestionScreen";
import { MisroutedScreen } from "./MisroutedScreen";
import { SafetyStopScreen } from "./SafetyStopScreen";
import { TicketSentScreen } from "./TicketSentScreen";
import { WelcomeScreen } from "./WelcomeScreen";

// "diagnosis" is agent-only. The customer path ends at "sent": their answers,
// photos, the scripted causes, and the AI pre-diagnosis all go to the agent,
// who replies with model-specific guidance. Showing the customer a diagnosis
// invites them to self-treat an electrical appliance.
type Phase =
  | "welcome"
  | "category"
  | "questions"
  | "diagnosis"
  | "contact"
  | "sending"
  | "sent";

export function Troubleshooter({
  mode = "agent",
  skipWelcome = false,
  initialCategory = null,
}: {
  mode?: AppMode;
  /**
   * Start at the product picker instead of the welcome screen. Set when the
   * host page supplies its own intro and <h1> — otherwise the widget emits a
   * second <h1>, and the customer reads two introductions in a row.
   */
  skipWelcome?: boolean;
  /**
   * Pre-select a product so the flow opens on its first real question. For a
   * page that is already about one product, the picker is a dead click.
   */
  initialCategory?: Category | null;
}) {
  const [phase, setPhase] = useState<Phase>(
    initialCategory ? "questions" : skipWelcome ? "category" : "welcome",
  );
  const [category, setCategory] = useState<Category | null>(initialCategory);
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrder | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  // Real photo files captured in the flow, keyed by upload-question id — attached
  // to the support case at the end.
  const [uploadFiles, setUploadFiles] = useState<Record<string, File[]>>({});
  // AI-tailored diagnosis: null until fetched; stays null to fall back to the
  // deterministic diagnoses when the LLM is unconfigured or the call fails.
  const [aiDiagnoses, setAiDiagnoses] = useState<Diagnosis[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Customer path: outcome of the automatic ticket submission.
  const [ticket, setTicket] = useState<{
    caseId: number | null;
    attachedImages: number;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  // Guards the paid upstream call against double-clicks and back-navigation —
  // every submission costs a Stopgap case and an AI call, and a duplicate here
  // is a duplicate ticket in an agent's queue.
  const [sending, setSending] = useState(false);
  // Range diversion: detection is conservative, but a typo shouldn't strand
  // anyone, so it can be dismissed.
  const [rangeDismissed, setRangeDismissed] = useState(false);
  // Turnstile proof-of-humanity, attached to the submission. Null until the
  // challenge resolves, or when Turnstile isn't configured at all.
  const [botToken, setBotToken] = useState<string | null>(null);

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

  // Contact for the ticket: the manually-entered one, else derived from the
  // Shopify order (email + name) so order-path customers are never asked.
  const effectiveContact = useMemo<Contact | null>(() => {
    if (contact) return contact;
    if (selectedOrder?.email)
      return {
        name: selectedOrder.customerName ?? "",
        email: selectedOrder.email,
      };
    return null;
  }, [contact, selectedOrder]);

  // Misrouting works both ways: a range owner in the hood guide would be asked
  // about ducting and baffle filters, and a hood owner in the ranges guide
  // about burners and ovens. Either way the agent receives answers that don't
  // describe the product.
  //
  // Crucially this is scoped to the CURRENT category — checking "is this a
  // range" regardless of which guide you're in re-triggers the diversion after
  // the switch, which is an unescapable loop.
  const manualModel =
    typeof answers["p_hood_model"] === "string"
      ? answers["p_hood_model"]
      : typeof answers["r_model"] === "string"
        ? answers["r_model"]
        : null;
  const productHints: (string | null | undefined)[] = [
    selectedOrder?.product.title,
    selectedOrder?.product.sku,
    manualModel,
  ];

  const misroutedTo: "ranges" | "range_hood" | null =
    mode !== "customer" || rangeDismissed
      ? null
      : category?.id === "range_hood" && looksLikeRange(...productHints)
        ? "ranges"
        : category?.id === "ranges" && looksLikeHood(...productHints)
          ? "range_hood"
          : null;

  const productLabel = selectedOrder?.product.title ?? manualModel ?? null;

  // Gas emergency reported on the ranges flow: stop everything. No ticket, no
  // email — this needs a faster answer than we can give.
  const safetyStop = answers[SAFETY_GATE_ID] === SAFETY_EMERGENCY_VALUE;

  // All photos captured across the flow, for the support case.
  const photos = useMemo(() => Object.values(uploadFiles).flat(), [uploadFiles]);

  const setAnswer = (id: string, value: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const resetRun = () => {
    setAnswers({});
    setStepIndex(0);
    setSelectedOrder(null);
    setContact(null);
    setUploadFiles({});
    setAiDiagnoses(null);
    setAiLoading(false);
  };

  /**
   * Move a misrouted customer into the Ranges guide.
   *
   * The two flows share no question ids, so the hood answers are dropped — but
   * the found order is kept and re-seeded as the ranges lookup answer, because
   * making someone find their order twice is the fastest way to lose them.
   */
  const switchCategory = (targetId: "ranges" | "range_hood") => {
    const target = categories.find((c) => c.id === targetId);
    if (!target?.flow) return;
    // The two flows share no question ids, so the answers go — but the found
    // order is carried across under the new flow's lookup id, because making
    // someone find their order twice is the fastest way to lose them.
    const fromId = targetId === "ranges" ? "p_order_lookup" : "r_order_lookup";
    const toId = targetId === "ranges" ? "r_order_lookup" : "p_order_lookup";
    const carried = answers[fromId];
    setAnswers(
      typeof carried === "string" && carried !== NO_ORDER_VALUE
        ? { [toId]: carried }
        : {},
    );
    setStepIndex(0);
    setUploadFiles({});
    setAiDiagnoses(null);
    setCategory(target);
    setPhase("questions");
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
      const res = await fetch(apiUrl("/api/diagnose"), {
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

  // With a pre-selected product there's no picker to return to, so the first
  // step has no Back — the button is hidden rather than left inert.
  const canGoBack = stepIndex > 0 || !initialCategory;
  const back = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else if (!initialCategory) setPhase("category");
  };

  const next = () => {
    if (!flow || !current || !isAnswered(current, answers)) return;
    const nextSteps = buildSteps(flow, answers);
    if (safeIndex + 1 >= nextSteps.length) {
      if (mode === "agent") {
        setPhase("diagnosis");
        void runDiagnosis();
        return;
      }
      // Customer path: finishing the questionnaire opens a ticket, but never
      // silently. The reply address is usually inherited from the Shopify
      // order, which can be years old, so the customer confirms it first.
      const c = effectiveContact;
      setContact(c ?? { name: "", email: "", phone: "" });
      setPhase("contact");
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const shownDiagnoses = aiDiagnoses ?? diagnosis?.diagnoses ?? [];

  // Customer mode: the completed run's context, sent with a support-case
  // submission so the server can run the AI pre-diagnosis for the agent.
  // Mirrors the /api/diagnose request body (DiagnoseContext).
  const runContext = useMemo(() => {
    if (mode !== "customer" || !flow || !category) return undefined;
    return JSON.stringify({
      category: category.id,
      branchKey: diagnosis?.branchKey,
      pathValue: diagnosis?.pathValue,
      answers: collectAnswers(flow, answers),
      order: selectedOrder ?? undefined,
      modelText:
        answers["p_order_lookup"] === NO_ORDER_VALUE &&
        typeof answers["p_hood_model"] === "string"
          ? answers["p_hood_model"]
          : undefined,
    });
  }, [mode, flow, category, diagnosis, answers, selectedOrder]);

  /**
   * Customer path terminus: create the Stopgap case from the completed run.
   *
   * Everything the agent needs travels with it — the answer transcript, the
   * photos captured during the flow, the scripted causes, and (added
   * server-side from `runContext`) the AI pre-diagnosis. The customer sees only
   * the confirmation.
   */
  const sendTicket = async (c: Contact) => {
    if (!flow || !category || sending || ticket) return;
    setSending(true);
    setSendError(null);
    setPhase("sending");
    try {
      const summary = buildSummary(
        selectedOrder,
        c,
        displayAnswers,
        diagnosis?.diagnoses ?? [],
        spec,
        "",
        flow ? selectedIssueLabels(flow, answers) : [],
      );
      const model =
        spec?.model ??
        selectedOrder?.product.sku ??
        (typeof answers["p_hood_model"] === "string"
          ? answers["p_hood_model"]
          : "");

      const processed = await Promise.all(photos.slice(0, 8).map(downscaleImage));

      const fd = new FormData();
      fd.set("name", c.name.trim());
      fd.set("email", c.email.trim());
      fd.set(
        "message",
        buildMessage(
          displayAnswers,
          diagnosis?.branchKey,
          selectedOrder?.product.title ?? model ?? undefined,
        ),
      );
      fd.set(
        "subject",
        `Range hood troubleshooting${model ? ` — ${model}` : ""}`,
      );
      if (c.phone?.trim()) fd.set("phone", c.phone.trim());
      if (model) fd.set("model", model);
      if (selectedOrder?.orderName)
        fd.set("orderNumber", selectedOrder.orderName.replace(/^#/, ""));
      fd.set("troubleshootingSummary", summary);
      if (runContext) fd.set("runContext", runContext);
      if (botToken) fd.set("turnstileToken", botToken);
      for (const p of processed) fd.append("images", p, p.name);

      const res = await fetch(apiUrl("/api/support"), {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({
        ok: false,
        error: "Unexpected response.",
      }))) as SupportResult;

      if (json.ok) {
        setTicket({ caseId: json.caseId, attachedImages: json.attachedImages });
        setPhase("sent");
        // Persist the run for analytics. The customer flow no longer asks for a
        // rating, so this is the only record of it — best-effort, and never
        // allowed to affect the ticket the customer was actually promised.
        void saveRun(c);
      } else {
        setSendError(
          json.error || "We couldn't send your request. Please try again.",
        );
        setPhase("contact");
      }
    } catch {
      setSendError("We couldn't send your request. Please try again.");
      setPhase("contact");
    } finally {
      setSending(false);
    }
  };

  /** Store the completed run (no rating on the customer path). */
  const saveRun = async (c: Contact | null) => {
    if (!flow || !category || !diagnosis) return;
    try {
      await fetch(apiUrl("/api/runs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category.id,
          branchKey: diagnosis.branchKey,
          pathValue: diagnosis.pathValue,
          model: spec?.model ?? selectedOrder?.product.sku ?? undefined,
          order: selectedOrder ?? undefined,
          contact: c ?? undefined,
          answers: displayAnswers
            .filter((a) => a.questionId !== "p_order_lookup")
            .map((a) => ({ prompt: a.prompt, value: a.value })),
          diagnoses: (diagnosis.diagnoses ?? []).map((d) => ({
            title: d.title,
            summary: d.summary,
            steps: d.steps,
            partsTools: d.partsTools,
            escalation: d.escalation,
          })),
        }),
      });
    } catch {
      // Analytics only — a failure here must not surface to the customer.
    }
  };

  const submitFeedback = async (
    feedback: RunFeedback,
    agentNotes?: string,
  ): Promise<{ ok: boolean }> => {
    if (!flow || !category || !diagnosis) return { ok: false };
    const payload = {
      category: category.id,
      branchKey: diagnosis.branchKey,
      pathValue: diagnosis.pathValue,
      model: spec?.model ?? selectedOrder?.product.sku ?? undefined,
      order: selectedOrder ?? undefined,
      contact: effectiveContact ?? undefined,
      answers: displayAnswers
        .filter((a) => a.questionId !== "p_order_lookup")
        .map((a) => ({ prompt: a.prompt, value: a.value })),
      diagnoses: shownDiagnoses.map((d) => ({
        title: d.title,
        summary: d.summary,
        steps: d.steps,
        partsTools: d.partsTools,
        escalation: d.escalation,
      })),
      feedback,
      agentNotes: agentNotes?.trim() || undefined,
    };
    try {
      const res = await fetch(apiUrl("/api/runs"), {
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
    setTicket(null);
    setSendError(null);
    setSending(false);
    setRangeDismissed(false);
    // Return to wherever the flow actually begins for this mount.
    if (initialCategory) {
      setCategory(initialCategory);
      setPhase("questions");
    } else {
      setCategory(null);
      setPhase("category");
    }
  };

  // Progress: project the total from current commitments so the bar only moves
  // forward as the path narrows — render-pure, no stored floor needed.
  let progress = 0;
  if (phase === "questions" && flow && steps.length > 0) {
    const total = projectedTotal(flow, answers);
    progress = total > 1 ? Math.min(1, safeIndex / (total - 1)) : 0;
  }

  if (phase === "questions" && safetyStop) {
    return (
      <Panel>
        <SafetyStopScreen
          onBack={() => setAnswer(SAFETY_GATE_ID, "none")}
        />
      </Panel>
    );
  }

  if (phase === "questions" && misroutedTo) {
    return (
      <Panel>
        <MisroutedScreen
          productLabel={productLabel}
          target={misroutedTo}
          onSwitch={() => switchCategory(misroutedTo)}
          onDismiss={() => setRangeDismissed(true)}
        />
      </Panel>
    );
  }

  if (phase === "contact") {
    return (
      <Panel>
        <ContactStep
          value={contact}
          onChange={setContact}
          onSubmit={() => contact && void sendTicket(contact)}
          onBack={() => setPhase("questions")}
          submitting={sending}
          error={sendError}
          complete={Boolean(
            effectiveContact?.name.trim() && effectiveContact?.email.trim(),
          )}
          onToken={setBotToken}
        />
      </Panel>
    );
  }

  if (phase === "sending") {
    return (
      <Panel>
        <section className="flex flex-col items-center justify-center py-16 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-sky" />
          <h2 className="mt-6 text-xl font-bold text-ink">
            Sending your details to our support team…
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            This takes a few seconds. Please don&apos;t close the page.
          </p>
        </section>
      </Panel>
    );
  }

  if (phase === "sent") {
    return (
      <Panel>
        <TicketSentScreen
          caseId={ticket?.caseId ?? null}
          email={effectiveContact?.email ?? ""}
          attachedImages={ticket?.attachedImages ?? 0}
          spec={spec}
          onRestart={restart}
        />
      </Panel>
    );
  }

  if (phase === "welcome") {
    return (
      <Panel>
        <WelcomeScreen mode={mode} onStart={() => setPhase("category")} />
      </Panel>
    );
  }

  if (phase === "category") {
    return (
      <Panel>
        <CategoryScreen
          onPick={pickCategory}
          onBack={skipWelcome ? undefined : () => setPhase("welcome")}
        />
      </Panel>
    );
  }

  if (phase === "questions" && flow && current) {
    return (
      <Panel>
        <QuestionScreen
        mode={mode}
        // Only genuinely last once the current question is answered: an
        // unanswered branch-selector is the end of the *known* step list, but
        // answering it appends that branch's questions. Without the guard the
        // issue-type screen offers "Send to support" before you've chosen an
        // issue.
        isLast={isAnswered(current, answers) && safeIndex + 1 >= steps.length}
        question={current}
        answers={answers}
        section={sectionLabel(flow, answers, current)}
        progress={progress}
        stepNumber={safeIndex + 1}
        canContinue={isAnswered(current, answers)}
        onChange={setAnswer}
        onBack={canGoBack ? back : undefined}
        onContinue={next}
        selectedOrder={selectedOrder}
        onSelectOrder={setSelectedOrder}
        contact={contact}
        onContact={setContact}
        uploadFilesFor={(id) => uploadFiles[id] ?? []}
        onUploadFiles={(id, files) =>
          setUploadFiles((prev) => ({ ...prev, [id]: files }))
          }
        />
      </Panel>
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
          mode={mode}
          result={{
            branchKey: diagnosis.branchKey,
            pathValue: diagnosis.pathValue,
            diagnoses: shownDiagnoses,
          }}
          order={selectedOrder}
          answers={displayAnswers}
          spec={spec}
          contact={effectiveContact}
          photos={photos}
          runContext={runContext}
          onSubmitFeedback={submitFeedback}
          onRestart={restart}
        />
      );
    }
  }

  return null;
}
