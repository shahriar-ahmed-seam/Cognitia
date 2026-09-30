"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ArenaQuestion, ContestResponse } from "@/lib/contests/types"

const LETTERS = "ABCDEFGH"

/** Parse a typed number like "1,200", "3.14" or "2e-3". Returns null if it isn't a number. */
export function parseTypedNumber(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, "")
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function ChoiceList({
  question,
  selected,
  multiple,
  disabled,
  onToggle,
}: {
  question: ArenaQuestion
  selected: number[]
  multiple: boolean
  disabled?: boolean
  onToggle: (key: number) => void
}) {
  return (
    <div role={multiple ? "group" : "radiogroup"} aria-label="Answer options" className="space-y-2.5">
      {(question.options ?? []).map((option, index) => {
        const active = selected.includes(option.key)
        return (
          <button
            key={option.key}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={active}
            disabled={disabled}
            onClick={() => onToggle(option.key)}
            className={cn(
              "group flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed",
              active
                ? "border-orange-400 bg-orange-50/80 text-slate-900 shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold transition",
                multiple ? "rounded-md" : "rounded-full",
                active ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
              )}
            >
              {active && multiple ? <Check className="h-3.5 w-3.5" /> : LETTERS[index]}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5">{option.text}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Answer input for one question. Choice answers are reported immediately;
 * typed answers are reported as the student types (the caller debounces saves).
 */
export function AnswerInput({
  question,
  response,
  disabled,
  onChange,
}: {
  question: ArenaQuestion
  response: ContestResponse | null
  disabled?: boolean
  onChange: (response: ContestResponse | null, options?: { immediate?: boolean }) => void
}) {
  const [text, setText] = useState("")

  // Sync the text box when switching questions or when a saved value arrives
  useEffect(() => {
    if (question.type === "NUMERIC") setText(response && "value" in response ? String(response.value) : "")
    if (question.type === "SHORT_TEXT") setText(response && "text" in response ? response.text : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  if (question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") {
    const selected = response && "choice" in response ? [response.choice] : []
    return (
      <ChoiceList
        question={question}
        selected={selected}
        multiple={false}
        disabled={disabled}
        onToggle={(key) => onChange(selected[0] === key ? null : { choice: key }, { immediate: true })}
      />
    )
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const selected = response && "choices" in response ? response.choices : []
    return (
      <div>
        <p className="mb-3 text-xs font-medium text-slate-500">
          Select all that apply.{question.partialCredit ? " Partial credit: each wrong pick cancels a right one." : " All correct options are needed for the marks."}
        </p>
        <ChoiceList
          question={question}
          selected={selected}
          multiple
          disabled={disabled}
          onToggle={(key) => {
            const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key].sort((a, b) => a - b)
            onChange(next.length ? { choices: next } : null, { immediate: true })
          }}
        />
      </div>
    )
  }

  if (question.type === "NUMERIC") {
    const parsed = text.trim() ? parseTypedNumber(text) : null
    const invalid = Boolean(text.trim()) && parsed === null
    return (
      <div className="max-w-sm">
        <label htmlFor={`answer-${question.id}`} className="mb-2 block text-xs font-medium text-slate-500">
          Your answer (a number{question.unit ? ` in ${question.unit}` : ""})
        </label>
        <div className="relative">
          <Input
            id={`answer-${question.id}`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 42 or 3.14"
            value={text}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(event) => {
              const value = event.target.value
              setText(value)
              const number = value.trim() ? parseTypedNumber(value) : null
              if (!value.trim()) onChange(null)
              else if (number !== null) onChange({ value: number })
            }}
            className={cn("h-12 pr-16 text-lg tabular-nums", invalid && "border-rose-400 focus-visible:ring-rose-400")}
          />
          {question.unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">{question.unit}</span>}
        </div>
        {invalid && <p className="mt-2 text-xs text-rose-600">Enter a plain number, like 140 or 0.375.</p>}
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <label htmlFor={`answer-${question.id}`} className="mb-2 block text-xs font-medium text-slate-500">
        Your answer (capitalization and extra spaces don't matter)
      </label>
      <Input
        id={`answer-${question.id}`}
        autoComplete="off"
        spellCheck={false}
        maxLength={200}
        placeholder="Type your answer"
        value={text}
        disabled={disabled}
        onChange={(event) => {
          setText(event.target.value)
          onChange(event.target.value.trim() ? { text: event.target.value } : null)
        }}
        className="h-12 text-base"
      />
    </div>
  )
}

export function hasResponse(response: ContestResponse | null | undefined) {
  if (!response) return false
  if ("choices" in response) return response.choices.length > 0
  if ("text" in response) return response.text.trim().length > 0
  return true
}
