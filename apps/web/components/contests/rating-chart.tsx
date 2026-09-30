"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatDate, formatDelta } from "@/lib/contests/format"
import type { ContestProfile } from "@/lib/contests/types"

type Point = ContestProfile["ratingHistory"][number]

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-900">{point.title}</p>
      <p className="mt-0.5 text-slate-500">{formatDate(point.date)} · rank {point.rank} of {point.participants}</p>
      <p className="mt-1 tabular-nums text-slate-700">
        {point.oldRating} → <span className="font-semibold">{point.newRating}</span>{" "}
        <span className={point.delta >= 0 ? "text-emerald-600" : "text-rose-600"}>({formatDelta(point.delta)})</span>
      </p>
    </div>
  )
}

export function RatingChart({ history }: { history: Point[] }) {
  if (history.length === 0) return <p className="py-10 text-center text-sm text-slate-500">No rated contests yet.</p>
  const data = [{ ...history[0], newRating: history[0].oldRating, title: "Starting rating", date: history[0].date, delta: 0 }, ...history]
  const ratings = data.map((d) => d.newRating)
  const min = Math.floor((Math.min(...ratings) - 40) / 50) * 50
  const max = Math.ceil((Math.max(...ratings) + 40) / 50) * 50
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis domain={[min, max]} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={48} />
          <ReferenceLine y={1500} stroke="#cbd5e1" strokeDasharray="4 4" />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="newRating" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 3.5, fill: "#fff", stroke: "#ea580c", strokeWidth: 2 }} activeDot={{ r: 5 }} animationDuration={900} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
