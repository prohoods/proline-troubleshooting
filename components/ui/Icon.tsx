// Lightweight inline icons in the rounded, 400-weight spirit of the brand's
// Material Symbols set. Swap for the real Material Symbols later if desired.
import type { SVGProps } from "react";

export type IconName =
  | "hood"
  | "range"
  | "arrowLeft"
  | "arrowRight"
  | "check"
  | "restart"
  | "alert"
  | "copy";

export function Icon({
  name,
  className = "h-5 w-5",
  ...props
}: { name: IconName; className?: string } & SVGProps<SVGSVGElement>) {
  const shared = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };

  switch (name) {
    case "hood":
      return (
        <svg {...shared}>
          <path d="M3 9l3.2-3.5h11.6L21 9" />
          <path d="M4 9h16v2.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z" />
          <path d="M9 19.5v-2M15 19.5v-2" />
        </svg>
      );
    case "range":
      return (
        <svg {...shared}>
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <circle cx="8" cy="11" r="1.7" />
          <circle cx="16" cy="11" r="1.7" />
          <path d="M7 16.5h10" />
        </svg>
      );
    case "arrowLeft":
      return (
        <svg {...shared}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
    case "arrowRight":
      return (
        <svg {...shared}>
          <path d="M9 5l7 7-7 7" />
        </svg>
      );
    case "check":
      return (
        <svg {...shared}>
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      );
    case "restart":
      return (
        <svg {...shared}>
          <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
          <path d="M3.5 4.5V10h5.5" />
        </svg>
      );
    case "alert":
      return (
        <svg {...shared}>
          <path d="M10.3 3.9 2.5 17.5A1.8 1.8 0 0 0 4 20.2h16a1.8 1.8 0 0 0 1.5-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0z" />
          <path d="M12 9v4.5M12 17h.01" />
        </svg>
      );
    case "copy":
      return (
        <svg {...shared}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h8" />
        </svg>
      );
  }
}
