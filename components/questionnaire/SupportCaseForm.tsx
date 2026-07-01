"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { downscaleImage } from "@/lib/images/downscale";
import type { SupportResult } from "@/lib/support/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/bmp",
]);
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface CaseDefaults {
  name: string;
  email: string;
  phone: string;
  message: string;
  model: string;
  orderNumber: string;
  troubleshootingSummary: string;
}

const FIELD =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-sky focus:outline-none";

export function SupportCaseForm({
  defaults,
  initialPhotos,
}: {
  defaults: CaseDefaults;
  initialPhotos: File[];
}) {
  const [name, setName] = useState(defaults.name);
  const [email, setEmail] = useState(defaults.email);
  const [phone, setPhone] = useState(defaults.phone);
  const [message, setMessage] = useState(defaults.message);
  const [model, setModel] = useState(defaults.model);
  const [serial, setSerial] = useState("");
  const [orderNumber, setOrderNumber] = useState(defaults.orderNumber);
  const [photos, setPhotos] = useState<File[]>(() =>
    initialPhotos
      .filter((f) => IMAGE_TYPES.has(f.type) && f.size <= MAX_IMAGE_BYTES)
      .slice(0, MAX_IMAGES),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<{
    caseId: number;
    attachedImages: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    let skipped = 0;
    const next = [...photos];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_IMAGES) {
        skipped++;
        continue;
      }
      if (!IMAGE_TYPES.has(f.type) || f.size > MAX_IMAGE_BYTES) {
        skipped++;
        continue;
      }
      next.push(f);
    }
    setPhotos(next);
    setNote(
      skipped > 0
        ? `${skipped} file${skipped > 1 ? "s" : ""} skipped — images only, up to ${MAX_IMAGES}, 10 MB each.`
        : null,
    );
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeAt = (i: number) =>
    setPhotos((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name.trim()) return setError("Please enter a name.");
    if (!EMAIL_RE.test(email.trim()))
      return setError("Please enter a valid email address.");
    if (!message.trim())
      return setError("Please enter a description of the problem.");

    setSubmitting(true);
    setError(null);
    try {
      const processed = await Promise.all(
        photos.slice(0, MAX_IMAGES).map(downscaleImage),
      );
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("email", email.trim());
      fd.set("message", message.trim());
      if (phone.trim()) fd.set("phone", phone.trim());
      if (model.trim()) fd.set("model", model.trim());
      if (serial.trim()) fd.set("serialNumber", serial.trim());
      if (orderNumber.trim()) fd.set("orderNumber", orderNumber.trim());
      if (defaults.troubleshootingSummary.trim())
        fd.set("troubleshootingSummary", defaults.troubleshootingSummary.trim());
      for (const p of processed) fd.append("images", p, p.name);

      const res = await fetch("/api/support", { method: "POST", body: fd });
      const json = (await res
        .json()
        .catch(() => ({ ok: false, error: "Unexpected response." }))) as SupportResult;
      if (json.ok) {
        setResult({ caseId: json.caseId, attachedImages: json.attachedImages });
      } else {
        setError(json.error || "Couldn't submit the case. Please try again.");
      }
    } catch {
      setError("Couldn't submit the case. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-2xl border border-sky bg-sky-soft p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky text-white">
            <Icon name="check" className="h-4 w-4" strokeWidth={3} />
          </span>
          <h3 className="text-lg font-bold text-ink">
            Support case #{result.caseId} created.
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted">
          {result.attachedImages > 0
            ? `${result.attachedImages} photo${result.attachedImages > 1 ? "s" : ""} attached. `
            : ""}
          The customer&apos;s reply will go to {email.trim()}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <h3 className="text-lg font-bold text-ink">Create support case</h3>
      <p className="mt-1 text-sm text-muted">
        Opens a case in Stopgap and emails the customer. Review the details,
        attach any photos, and submit.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Name</span>
          <input
            className={FIELD}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Email</span>
          <input
            className={FIELD}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            Phone (optional)
          </span>
          <input
            className={FIELD}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            Model (optional)
          </span>
          <input
            className={FIELD}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="PLJW 104"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            Order # (optional)
          </span>
          <input
            className={FIELD}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="1024"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">
            Serial # (optional)
          </span>
          <input
            className={FIELD}
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Serial number"
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-medium text-ink">
          Problem description
        </span>
        <textarea
          rows={3}
          className={`${FIELD} resize-y`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's happening with the hood…"
        />
      </label>

      <div className="mt-3">
        <span className="mb-1 block text-sm font-medium text-ink">
          Photos (optional — up to 8, 10 MB each)
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-line bg-white px-4 py-4 text-sm font-semibold text-ink transition hover:border-sky/60"
        >
          + Add photos
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        {note && <p className="mt-2 text-xs text-muted">{note}</p>}
        {photos.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {photos.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-3 py-1 text-sm text-ink"
              >
                <span className="max-w-[12rem] truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => removeAt(i)}
                  className="text-muted hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4">
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit case"}
        </Button>
      </div>
    </div>
  );
}
