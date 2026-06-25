"use client";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { NO_ORDER_VALUE } from "@/lib/flow/constants";
import type { Question } from "@/lib/flow/types";
import type { SelectedOrder } from "@/lib/shopify/types";
import type { Contact } from "@/lib/storage/types";
import type { Answers, AnswerValue } from "@/lib/types";
import { ContactForm, isValidEmail } from "./inputs/ContactForm";
import { MultiSelect } from "./inputs/MultiSelect";
import { ShopifyLookup } from "./inputs/ShopifyLookup";
import { SingleSelect } from "./inputs/SingleSelect";
import { TextInput } from "./inputs/TextInput";
import { UploadStub } from "./inputs/UploadStub";

export function QuestionScreen({
  question,
  answers,
  section,
  progress,
  stepNumber,
  canContinue,
  onChange,
  onBack,
  onContinue,
  selectedOrder,
  onSelectOrder,
  contact,
  onContact,
}: {
  question: Question;
  answers: Answers;
  section: string;
  progress: number;
  stepNumber: number;
  canContinue: boolean;
  onChange: (id: string, value: AnswerValue) => void;
  onBack: () => void;
  onContinue: () => void;
  selectedOrder: SelectedOrder | null;
  onSelectOrder: (sel: SelectedOrder | null) => void;
  contact: Contact | null;
  onContact: (c: Contact) => void;
}) {
  const value = answers[question.id];

  const followUpVisible =
    question.followUp != null &&
    (Array.isArray(value)
      ? value.some((v) => question.followUp!.showWhen.includes(v))
      : typeof value === "string"
        ? question.followUp.showWhen.includes(value)
        : false);

  return (
    <section className="py-2">
      <div className="flex items-center justify-between gap-4">
        <Eyebrow rule={false}>{section}</Eyebrow>
        <span className="text-xs font-medium text-muted">Step {stepNumber}</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={progress} />
      </div>

      <h2 className="mt-7 text-2xl font-bold leading-snug text-ink sm:text-[1.7rem]">
        {question.prompt}
      </h2>

      <div className="mt-6">
        {question.type === "single" && question.options && (
          <SingleSelect
            options={question.options}
            value={typeof value === "string" ? value : undefined}
            label={question.prompt}
            onChange={(v) => onChange(question.id, v)}
          />
        )}
        {question.type === "multi" && question.options && (
          <MultiSelect
            options={question.options}
            value={Array.isArray(value) ? value : []}
            label={question.prompt}
            onChange={(v) => onChange(question.id, v)}
          />
        )}
        {question.type === "text" && (
          <TextInput
            value={typeof value === "string" ? value : ""}
            placeholder={question.placeholder}
            prompt={question.prompt}
            onChange={(v) => onChange(question.id, v)}
          />
        )}
        {question.type === "upload" && (
          <UploadStub
            value={Array.isArray(value) ? value : []}
            options={question.options}
            onChange={(v) => onChange(question.id, v)}
          />
        )}
        {question.type === "lookup" && (
          <ShopifyLookup
            placeholder={question.placeholder}
            selected={selectedOrder}
            manual={value === NO_ORDER_VALUE}
            onSetManual={(on) => {
              onSelectOrder(null);
              onChange(question.id, on ? NO_ORDER_VALUE : "");
            }}
            onSelect={(sel) => {
              onSelectOrder(sel);
              onChange(
                question.id,
                sel
                  ? `${sel.orderName} — ${sel.product.title}${sel.product.sku ? ` (SKU ${sel.product.sku})` : ""}`
                  : "",
              );
            }}
          />
        )}
        {question.type === "contact" && (
          <ContactForm
            value={contact}
            onChange={(c) => {
              onContact(c);
              const valid = c.name.trim().length > 0 && isValidEmail(c.email);
              onChange(question.id, valid ? c.email.trim() : "");
            }}
          />
        )}

        {followUpVisible && question.followUp && (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-ink">
              {question.followUp.prompt}
            </label>
            <TextInput
              value={
                typeof answers[question.followUp.id] === "string"
                  ? (answers[question.followUp.id] as string)
                  : ""
              }
              placeholder={question.followUp.placeholder}
              prompt={question.followUp.prompt}
              onChange={(v) => onChange(question.followUp!.id, v)}
            />
          </div>
        )}
      </div>

      <div className="mt-9 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <Icon name="arrowLeft" className="h-4 w-4" /> Back
        </button>
        <Button onClick={onContinue} disabled={!canContinue}>
          {question.terminal ? "See diagnosis" : "Continue"}
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>

      {question.optional && !question.terminal && (
        <p className="mt-3 text-right text-xs text-muted">
          Optional — you can skip this.
        </p>
      )}
    </section>
  );
}
