import type { CategoryFlow } from "./types";
import { rangeHoodFlow } from "./rangeHoodFlow";

export type CategoryId = "range_hood" | "ranges";

export interface Category {
  id: CategoryId;
  label: string;
  blurb: string;
  icon: "hood" | "range";
  available: boolean;
  /** Present only for available categories. */
  flow?: CategoryFlow;
}

// Top-level choice from the brief: Ranges vs. Range Hood.
// The flow diagram only defines the Range Hood tree, so Ranges is a marked
// placeholder — drop its flow in here when the diagram is provided.
export const categories: Category[] = [
  {
    id: "range_hood",
    label: "Range Hood",
    blurb:
      "Airflow, blower, lighting, controls, noise, or power — let's pin down the issue.",
    icon: "hood",
    available: true,
    flow: rangeHoodFlow,
  },
  {
    id: "ranges",
    label: "Ranges",
    blurb: "Gas, dual-fuel, and induction ranges.",
    icon: "range",
    available: false, // TODO: add the Ranges troubleshooting flow once supplied.
  },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export { rangeHoodFlow };
