"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApi } from "@/hooks/use-api"
import { api, errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { DIFFICULTY_META } from "@/lib/contests/format"
import type { BankQuestion, Difficulty } from "@/lib/contests/types"
import { LoadingState, primaryButton } from "../primitives"

interface BankPage {
  questions: BankQuestion[]
  facets: { subjects: string[]; topics: string[] }
  pagination: { page: number; pages: number; total: number }
}

export function BankImportDialog({ open, onOpenChange, contestId, onImported }: { open: boolean; onOpenChange: (open: boolean) => void; contestId: string; onImported: () => void }) {
  const [subject, setSubject] = useState("ALL")
  const [topic, setTopic] = useState("ALL")
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Map<string, BankQuestion>>(new Map())
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => setPage(1), [subject, topic, difficulty, term])
  useEffect(() => {
    if (!open) setSelected(new Map())
  }, [open])

  const { data, loading, refresh } = useApi<BankPage>(open ? "/admin/contests/question-bank" : null, {
    query: { subject: subject === "ALL" ? undefined : subject, topic: topic === "ALL" ? undefined : topic, difficulty: difficulty === "ALL" ? undefined : difficulty, search: term, page, limit: 20, excludeContestId: contestId },
    revalidateOnFocus: false,
  })

  const toggle = (q: BankQuestion) =>
    setSelected((current) => {
      const next = new Map(current)
      if (next.has(q.id)) next.delete(q.id)
      else next.set(q.id, q)
      return next
    })

  const importSelected = async () => {
    setImporting(true)
    try {
      const result = await api<{ imported: number; skipped: number }>(`/admin/contests/${contestId}/questions/import`, { method: "POST", body: { questionBankIds: [...selected.keys()] } })
      toast.success(`Imported ${result.imported} question${result.imported === 1 ? "" : "s"}${result.skipped ? ` (${result.skipped} already in the contest)` : ""}`)
      onImported()
      onOpenChange(false)
      refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !importing && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import from the question bank</DialogTitle>
          <DialogDescription>Imported questions are copied into this contest, so editing the bank later won't change it. Marks default to 1, 2 or 3 by difficulty.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-[1fr_repeat(3,minmax(0,160px))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question text" className="pl-9" aria-label="Search questions" />
          </div>
          <Select value={subject} onValueChange={(v) => { setSubject(v); setTopic("ALL") }}>
            <SelectTrigger aria-label="Subject"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All subjects</SelectItem>
              {data?.facets.subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger aria-label="Topic"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All topics</SelectItem>
              {data?.facets.topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty | "ALL")}>
            <SelectTrigger aria-label="Difficulty"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any difficulty</SelectItem>
              {Object.entries(DIFFICULTY_META).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-[300px] flex-1 overflow-y-auto rounded-xl border border-slate-200">
          {loading ? (
            <LoadingState />
          ) : data?.questions.length ? (
            <ul className="divide-y divide-slate-100">
              {data.questions.map((q) => {
                const on = selected.has(q.id)
                return (
                  <li key={q.id}>
                    <button type="button" onClick={() => toggle(q)} aria-pressed={on} className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition", on ? "bg-orange-50/70" : "hover:bg-slate-50")}>
                      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border", on ? "border-orange-600 bg-orange-600 text-white" : "border-slate-300")}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-slate-900">{q.question}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {q.subject} · {q.topics.join(", ")} · <span className={DIFFICULTY_META[q.difficulty].className}>{DIFFICULTY_META[q.difficulty].label}</span> · answer: {q.options[q.correctAnswer]}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">No questions match these filters.</p>
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {data && data.pagination.pages > 1 && (
              <>
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="tabular-nums">{page} / {data.pagination.pages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </>
            )}
          </div>
          <Button className={primaryButton} disabled={!selected.size || importing} onClick={importSelected}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />} Import {selected.size || ""} question{selected.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
