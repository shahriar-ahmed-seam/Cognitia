"use client"

import type React from "react"
import { memo, useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { cn } from "@/lib/utils"
import type { ArenaQuestion, ContestResponse } from "@/lib/contests/types"
import { WrittenAnswer, type AnswerChangeOptions, type PhotoControls, type ResponseUpdate } from "./arena/written-answer"

export type { AnswerChangeOptions, PhotoControls, ResponseUpdate } from "./arena/written-answer"

const LETTERS = "ABCDEFGHIJKL"

// Options re-render only when their own text changes, not on every keystroke elsewhere
const OptionText = memo(function OptionText({ content }: { content: string }) {
  return <MarkdownRenderer content={content} inline />
})

/** Parse a typed number like "1,200", "3.14" or "2e-3". Returns null if it isn't a number. */
export function parseTypedNumber(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, "")
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/**
 * Options as large selectable cards. Arrow keys move between options (and pick, for single
 * choice), Space or Enter toggles, and clicking a picked single-choice option clears it.
 */
function ChoiceList({
  question,
  selected,
  multiple,
  disabled,
  onPick,
}: {
  question: ArenaQuestion
  selected: number[]
  multiple: boolean
  disabled?: boolean
  onPick: (key: number, via: "toggle" | "arrow") => void
}) {
  const options = question.options ?? []
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [focusIndex, setFocusIndex] = useState(() => Math.max(0, options.findIndex((o) => selected.includes(o.key))))
  const twoUp = question.type === "TRUE_FALSE" && options.length === 2

  const move = (to: number) => {
    const next = (to + options.length) % options.length
    setFocusIndex(next)
    refs.current[next]?.focus()
    if (!multiple && !disabled && options[next]) onPick(options[next].key, "arrow")
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault()
        move(index + 1)
        break
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault()
        move(index - 1)
        break
      case "Home":
        event.preventDefault()
        move(0)
        break
      case "End":
        event.preventDefault()
        move(options.length - 1)
        break
      case " ":
      case "Enter":
        event.preventDefault()
        if (!disabled) onPick(options[index].key, "toggle")
        break
    }
  }

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-label="Answer options"
      aria-disabled={disabled || undefined}
      data-answer-options=""
      className={cn("grid gap-2.5", twoUp && "sm:grid-cols-2")}
    >
      {options.map((option, index) => {
        const active = selected.includes(option.key)
        return (
          <div
            key={option.key}
            ref={(el) => {
              refs.current[index] = el
            }}
            role={multiple ? "checkbox" : "radio"}
            aria-checked={active}
            aria-disabled={disabled || undefined}
            tabIndex={index === focusIndex ? 0 : -1}
            onFocus={() => setFocusIndex(index)}
            onClick={() => !disabled && onPick(option.key, "toggle")}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "group relative flex min-h-[3.5rem] w-full cursor-pointer select-none items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left text-[15px] leading-relaxed transition-[border-color,background-color,box-shadow]",
              "outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
              active
                ? "border-violet-500 bg-violet-50/70 text-slate-900 shadow-[0_0_0_1px_rgb(139,92,246),0_6px_16px_-10px_rgba(109,40,217,0.45)]"
                : "border-slate-200 bg-white text-slate-800 hover:border-violet-300 hover:bg-violet-50/30",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-[13px] font-semibold transition-colors",
                multiple ? "rounded-md" : "rounded-full",
                active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700"
              )}
              aria-hidden="true"
            >
              {LETTERS[index] ?? index + 1}
            </span>
            <span className="min-w-0 flex-1 break-words pt-0.5">
              <OptionText content={option.text} />
            </span>
            <span
              className={cn(
                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
                multiple ? "rounded-md" : "rounded-full",
                active ? "bg-violet-600 text-white" : "ring-1 ring-inset ring-slate-300"
              )}
              aria-hidden="true"
            >
              {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Answer input for one question. Choice answers are reported immediately; typed answers are
 * reported as the student types (the caller debounces saves). `onChange` may receive a function
 * of the latest response (written answers use it so text and photo changes can't overwrite each
 * other); a React state setter accepts both forms.
 */
export function AnswerInput({
  question,
  response,
  disabled,
  onChange,
  photos,
}: {
  question: ArenaQuestion
  response: ContestResponse | null
  disabled?: boolean
  onChange: (response: ResponseUpdate, options?: AnswerChangeOptions) => void
  /** Photo uploads for written questions (the arena passes its upload queue) */
  photos?: PhotoControls
}) {
  const [text, setText] = useState("")

  // Sync the text box when switching questions or when a saved value arrives
  useEffect(() => {
    if (question.type === "NUMERIC") setText(response && "value" in response ? String(response.value) : "")
    if (question.type === "SHORT_TEXT") setText(response && "text" in response ? (response.text ?? "") : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  if (question.type === "WRITTEN") {
    return <WrittenAnswer key={question.id} question={question} response={response} disabled={disabled} onChange={onChange} photos={photos} />
  }

  if (question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") {
    const selected = response && "choice" in response ? [response.choice] : []
    return (
      <ChoiceList
        key={question.id}
        question={question}
        selected={selected}
        multiple={false}
        disabled={disabled}
        onPick={(key, via) => {
          if (via === "arrow") onChange({ choice: key })
          else onChange(selected[0] === key ? null : { choice: key }, { immediate: true })
        }}
      />
    )
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const selected = response && "choices" in response ? response.choices : []
    return (
      <div>
        <p className="mb-3 text-sm text-slate-500">
          Select all that apply.{question.partialCredit ? " Partial credit: each wrong pick cancels a right one." : " All correct options are needed for the marks."}
        </p>
        <ChoiceList
          key={question.id}
          question={question}
          selected={selected}
          multiple
          disabled={disabled}
          onPick={(key) => {
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
        <label htmlFor={`answer-${question.id}`} className="mb-2 block text-sm font-semibold text-slate-900">
          Your answer <span className="font-normal text-slate-500">(a number{question.unit ? ` in ${question.unit}` : ""})</span>
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
            aria-describedby={invalid ? `answer-${question.id}-error` : undefined}
            onChange={(event) => {
              const value = event.target.value
              setText(value)
              const number = value.trim() ? parseTypedNumber(value) : null
              if (!value.trim()) onChange(null)
              else if (number !== null) onChange({ value: number })
            }}
            className={cn(
              "h-12 rounded-xl pr-16 text-lg tabular-nums focus-visible:ring-violet-500",
              invalid && "border-rose-400 focus-visible:ring-rose-400"
            )}
          />
          {question.unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">{question.unit}</span>}
        </div>
        {invalid && (
          <p id={`answer-${question.id}-error`} className="mt-2 text-sm text-rose-700">
            Enter a plain number, like 140 or 0.375.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <label htmlFor={`answer-${question.id}`} className="mb-2 block text-sm font-semibold text-slate-900">
        Your answer <span className="font-normal text-slate-500">(capitalization and extra spaces don't matter)</span>
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
        className="h-12 rounded-xl text-base focus-visible:ring-violet-500"
      />
    </div>
  )
}

/** True if the response counts as an answer. A written answer needs some text or at least one photo. */
export function hasResponse(response: ContestResponse | null | undefined) {
  if (!response) return false
  if ("choices" in response) return response.choices.length > 0
  if ("files" in response || "text" in response) {
    const text = "text" in response ? response.text : undefined
    const files = "files" in response ? response.files : undefined
    return Boolean(text?.trim()) || Boolean(files?.length)
  }
  return true
}
