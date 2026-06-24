import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Montserrat is the single brand typeface; weight is the only typographic variable.
// It's a variable font — omitting `weight` loads the full 100–900 axis in one
// optimized file, and Tailwind's font-weight utilities select the weight.
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Proline Troubleshooting Guide",
  description:
    "Diagnose your Proline range hood and find the right fix — a simple, step-by-step guide.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="min-h-dvh bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
