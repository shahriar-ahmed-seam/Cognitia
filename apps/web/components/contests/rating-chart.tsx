"use client"

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { formatDate, formatDelta } from "@/lib/contests/format"
import type { ContestProfile } from "@/lib/contests/types"
import { usePrefersReducedMotion } from "./primitives"

type Point = ContestProfile["ratingHistory"][number]

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="max-w-[16rem] rounded-xl bg-white px-3 py-2.5 text-xs shadow-[0_12px_32px_-12px_rgba(76,29,149,0.35)] ring-1 ring-violet-200">
      <p className="font-semibold text-slate-900">{point.title}</p>
      <p className="mt-0.5 text-slate-500">
        {formatDate(point.date)}
        {point.participants ? ` · rank ${point.rank} of ${point.participants}` : ""}
      </p>
      <p className="mt-1.5 tabular-nums text-slate-700">
        {point.oldRating} → <span className="font-semibold text-violet-700">{point.newRating}</span>{" "}
        {point.delta !== 0 && <span className={cn("font-medium", point.delta > 0 ? "text-emerald-700" : "text-rose-700")}>({formatDelta(point.delta)})</span>}
      </p>
    </div>
  )
}

export function RatingChart({ history }: { history: Point[] }) {
  const reduced = usePrefersReducedMotion()
  if (history.length === 0) return <p className="py-10 text-center text-sm text-slate-500">No rated contests yet.</p>
  const data = [{ ...history[0], newRating: history[0].oldRating, title: "Starting rating", date: history[0].date, delta: 0, participants: 0 }, ...history]
  const ratings = data.map((d) => d.newRating)
  const min = Math.floor((Math.min(...ratings, 1500) - 40) / 50) * 50
  const max = Math.ceil((Math.max(...ratings, 1500) + 40) / 50) * 50
  const last = history[history.length - 1]
  const summary = `Rating went from ${history[0].oldRating} to ${last.newRating} over ${history.length} rated contest${history.length === 1 ? "" : "s"}.`

  return (
    <div className="h-64 w-full sm:h-72" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="rating-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.32} />
              <stop offset="70%" stopColor="#d946ef" stopOpacity={0.06} />
              <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rating-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#c026d3" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ede9fe" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis domain={[min, max]} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={48} />
          <ReferenceLine y={1500} stroke="#c4b5fd" strokeDasharray="4 4" label={{ value: "Start 1500", position: "insideTopLeft", fill: "#6d28d9", fontSize: 10 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c4b5fd", strokeDasharray: "3 3" }} />
          <Area
            type="monotone"
            dataKey="newRating"
            stroke="url(#rating-stroke)"
            strokeWidth={2.5}
            fill="url(#rating-fill)"
            dot={{ r: 3.5, fill: "#fff", stroke: "#7c3aed", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive={!reduced}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
