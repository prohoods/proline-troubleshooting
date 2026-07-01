"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { RunFeedback } from "@/lib/storage/types";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-8 w-8 transition ${filled ? "fill-sky text-sky" : "fill-none text-line"}`}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
    >
      <path d="M12 3.2l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.98l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85z" />
    </svg>
  );
}

export function FeedbackForm({
  onSubmit,
}: {
  onSubmit: (feedback: RunFeedback) => Promise<{ ok: boolean }>;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const submit = async () => {
    if (!rating) {
      setError("Please choose a rating first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit({
        rating,
        comment: comment.trim() || undefined,
      });
      if (!result.ok) setError("Couldn't save your feedback. Please try again.");
    } catch {
      setError("Couldn't save your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onStarKeyDown = (e: KeyboardEvent<HTMLButtonElement>, n: number) => {
    let nv = 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp")
      nv = Math.min(5, (rating || n) + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      nv = Math.max(1, (rating || n) - 1);
    else return;
    e.preventDefault();
    setRating(nv);
    starRefs.current[nv - 1]?.focus();
  };

  const active = hover || rating;
  const focusStar = rating || 1;

  return (
    <div>
      <h3 className="text-lg font-bold text-ink">Rate this diagnosis</h3>
      <p className="mt-1 text-sm text-muted">
        Agent feedback: how accurate and helpful was this result? It measures the
        tool and trains better answers over time.
      </p>

      <div
        className="mt-4 flex gap-1"
        role="radiogroup"
        aria-label="Rating, 1 to 5 stars"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            ref={(el) => {
              starRefs.current[n - 1] = el;
            }}
            tabIndex={n === focusStar ? 0 : -1}
            onKeyDown={(e) => onStarKeyDown(e, n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => setRating(n)}
            className="rounded-md p-1"
          >
            <Star filled={active >= n} />
          </button>
        ))}
      </div>

      <textarea
        rows={3}
        aria-label="Additional comments"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What was off, or anything to add for the knowledge base? (optional)"
        className="mt-4 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-sky"
      />

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4">
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Saving…" : "Submit rating"}
        </Button>
      </div>
    </div>
  );
}
