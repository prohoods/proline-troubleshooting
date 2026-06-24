"use client";

const FIELD =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-ink placeholder:text-muted/70 focus:border-sky";

export function TextInput({
  value = "",
  onChange,
  placeholder,
  prompt = "",
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prompt?: string;
}) {
  const multiline = /describe|additional|explain|own words|notes/i.test(
    `${prompt} ${placeholder ?? ""}`,
  );
  const label = prompt || placeholder || "Answer";

  if (multiline) {
    return (
      <textarea
        rows={3}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} resize-y`}
      />
    );
  }

  return (
    <input
      type="text"
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={FIELD}
    />
  );
}
