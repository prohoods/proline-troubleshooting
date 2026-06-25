"use client";

import type { Contact } from "@/lib/storage/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (s: string) => EMAIL_RE.test(s.trim());

const FIELD =
  "mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-sky focus:outline-none";

export function ContactForm({
  value,
  onChange,
}: {
  value: Contact | null;
  onChange: (c: Contact) => void;
}) {
  const c: Contact = value ?? { name: "", email: "", phone: "" };
  const set = (patch: Partial<Contact>) => onChange({ ...c, ...patch });
  const emailInvalid = c.email.trim().length > 0 && !isValidEmail(c.email);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        We&apos;ll use this to follow up and open your support ticket.
      </p>
      <label className="block">
        <span className="text-sm font-medium text-ink">Full name</span>
        <input
          type="text"
          autoComplete="name"
          value={c.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Jane Smith"
          className={FIELD}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={c.email}
          onChange={(e) => set({ email: e.target.value })}
          placeholder="jane@example.com"
          className={`${FIELD} ${emailInvalid ? "border-danger" : ""}`}
        />
        {emailInvalid && (
          <span className="mt-1 block text-xs text-danger">
            Enter a valid email address.
          </span>
        )}
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink">
          Phone <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          type="tel"
          autoComplete="tel"
          value={c.phone ?? ""}
          onChange={(e) => set({ phone: e.target.value })}
          placeholder="(555) 123-4567"
          className={FIELD}
        />
      </label>
    </div>
  );
}
