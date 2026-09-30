import { ratingClass } from "@/lib/contests/format"

// ratingClass() uses -600 shades; some of them (sky, emerald) fall below 4.5:1 on white for
// normal-size text, so tables and cards use the -700 shade of the same band.
const AA_ON_WHITE: Record<string, string> = {
  "text-rose-600": "text-rose-700",
  "text-violet-600": "text-violet-700",
  "text-sky-600": "text-sky-700",
  "text-emerald-600": "text-emerald-700",
  "text-slate-600": "text-slate-700",
  "text-slate-500": "text-slate-600",
}

/** Rating band colour that passes WCAG AA on a white background. */
export function ratingText(rating: number | null | undefined) {
  const base = ratingClass(rating)
  return AA_ON_WHITE[base] ?? base
}

// Lighter shades of the same bands for the dark stage
const ON_DARK: Record<string, string> = {
  "text-rose-600": "text-rose-300",
  "text-violet-600": "text-violet-300",
  "text-sky-600": "text-sky-300",
  "text-emerald-600": "text-emerald-300",
  "text-slate-600": "text-slate-200",
  "text-slate-500": "text-slate-300",
}

/** Rating band colour for text on the dark stage. */
export function ratingTextOnDark(rating: number | null | undefined) {
  return ON_DARK[ratingClass(rating)] ?? "text-white"
}
