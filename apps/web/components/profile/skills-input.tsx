"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Chips with a text box. Enter or a comma adds a skill, Backspace in an empty box removes the last one.
 * Duplicates (ignoring case) are skipped.
 */
export function SkillsInput({
  id,
  value,
  onChange,
  max = 15,
  maxLength = 32,
  describedBy,
  invalid = false,
}: {
  id: string
  value: string[]
  onChange: (skills: string[]) => void
  max?: number
  maxLength?: number
  describedBy?: string
  invalid?: boolean
}) {
  const [text, setText] = useState("")
  const full = value.length >= max

  const add = (raw: string) => {
    const next = [...value]
    for (const part of raw.split(",")) {
      const skill = part.trim().replace(/\s+/g, " ").slice(0, maxLength)
      if (!skill || next.length >= max) continue
      if (next.some((s) => s.toLowerCase() === skill.toLowerCase())) continue
      next.push(skill)
    }
    if (next.length !== value.length) onChange(next)
    setText("")
  }

  const remove = (skill: string) => onChange(value.filter((s) => s !== skill))

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-2 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/30",
        invalid ? "border-rose-300" : "border-slate-200"
      )}
    >
      <ul className="flex flex-wrap items-center gap-1.5" aria-label="Your skills">
        {value.map((skill) => (
          <li key={skill} className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 py-1 pl-2.5 pr-1 text-sm font-medium text-violet-800 ring-1 ring-inset ring-violet-200/70">
            <span className="truncate">{skill}</span>
            <button
              type="button"
              onClick={() => remove(skill)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-violet-500 hover:bg-violet-100 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              aria-label={`Remove ${skill}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
        <li className="flex min-w-[10rem] flex-1 items-center gap-1">
          <input
            id={id}
            value={text}
            disabled={full}
            maxLength={maxLength * 3}
            onChange={(e) => {
              const v = e.target.value
              if (v.includes(",")) add(v)
              else setText(v)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Don't submit the whole form
                e.preventDefault()
                if (text.trim()) add(text)
              } else if (e.key === "Backspace" && !text && value.length) {
                remove(value[value.length - 1])
              }
            }}
            onBlur={() => text.trim() && add(text)}
            placeholder={full ? `That's the most (${max})` : value.length ? "Add another" : "e.g. C, Linux, Figma"}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className="h-8 min-w-0 flex-1 bg-transparent px-1.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed sm:text-sm"
          />
          {text.trim() && !full && (
            <button
              type="button"
              onClick={() => add(text)}
              className="flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
            </button>
          )}
        </li>
      </ul>
    </div>
  )
}
