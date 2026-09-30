"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BookOpen, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"
import { AWARD_META, KIND_META, formatDate, formatScore, ordinal } from "@/lib/contests/format"
import type { Certificate } from "@/lib/contests/types"
import { ErrorState, LoadingState, primaryButton } from "@/components/contests/primitives"

function achievementLine(cert: Certificate) {
  const top = Math.max(1, Math.round((cert.rank / cert.participants) * 100))
  if (cert.award === "TOP_3") return `for finishing ${ordinal(cert.rank)} out of ${cert.participants} participants`
  if (cert.award === "MERIT") return `for finishing ${ordinal(cert.rank)} out of ${cert.participants} participants, in the top ${top}%`
  return "for taking part and completing"
}

export default function CertificatePage() {
  const { id } = useParams<{ id: string }>()
  const { data: cert, error, loading, refresh } = useApi<Certificate>(`/contests/${id}/certificate`, { revalidateOnFocus: false })

  if (loading) return <LoadingState className="min-h-screen" />
  if (error || !cert) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pt-24">
        <ErrorState message={error?.message ?? "No certificate is available"} onRetry={refresh} backHref={`/contests/${id}`} />
      </div>
    )
  }

  const award = AWARD_META[cert.award]
  const top = cert.award === "TOP_3"
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-violet-50/60 px-4 py-8 print:bg-white print:bg-none print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } }`}</style>
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
        <Button asChild variant="ghost">
          <Link href={`/contests/${id}?tab=results`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to results
          </Link>
        </Button>
        <Button className={primaryButton} onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" /> Print or save as PDF
        </Button>
      </div>

      <article className="relative mx-auto aspect-[1.414/1] max-w-5xl overflow-hidden bg-white shadow-[0_30px_70px_-30px_rgba(46,16,101,0.45)] ring-1 ring-slate-900/5 print:max-w-none print:shadow-none print:ring-0">
        <div className="absolute inset-4 border-2 border-violet-950/75" aria-hidden="true" />
        <div className="absolute inset-6 border border-amber-600/40" aria-hidden="true" />
        {/* Soft corner washes: plain radial gradients, no blur filters */}
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.30),transparent_65%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-48 -right-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.28),transparent_65%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(232,121,249,0.16),transparent_65%)]" aria-hidden="true" />

        <div className="relative flex h-full flex-col items-center justify-between px-[8%] py-[6%] text-center">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Cognitia</span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-800">{award.label}</p>
            <h1 className="mt-3 font-serif text-4xl text-slate-900 sm:text-5xl">{award.title}</h1>
            <div className="mx-auto mt-4 flex w-40 items-center gap-2" aria-hidden="true">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-violet-300" />
              <span className="h-1.5 w-1.5 rotate-45 bg-amber-500" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-violet-300" />
            </div>
            <p className="mt-6 text-sm text-slate-500">This certifies that</p>
            <p className="mt-2 font-serif text-3xl italic text-slate-900 sm:text-4xl">{cert.recipient.name}</p>
            {cert.recipient.institution && <p className="mt-1 text-sm text-slate-600">{cert.recipient.institution}</p>}
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-700">
              has been recognised {achievementLine(cert)} the {KIND_META[cert.contest.kind].label.toLowerCase()}{" "}
              <span className="font-semibold text-slate-900">{cert.contest.title}</span>
              {cert.contest.hostName ? `, hosted by ${cert.contest.hostName},` : ""} held on {formatDate(cert.contest.startsAt)}, with a score of{" "}
              {formatScore(cert.score)} out of {cert.maxScore}.
            </p>
          </div>

          <div className="grid w-full grid-cols-3 items-end gap-6 text-xs text-slate-500">
            <div className="text-left">
              <p className="font-medium text-slate-700">Issued {formatDate(cert.issuedAt)}</p>
              <p className="mt-0.5 font-mono">ID {cert.certificateId}</p>
            </div>
            <div className="flex justify-center">
              <span
                className={
                  top
                    ? "flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-double border-amber-700/80 text-center font-semibold uppercase text-amber-900"
                    : "flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-double border-violet-900/70 text-center font-semibold uppercase text-violet-950"
                }
              >
                {cert.award === "PARTICIPATION" ? (
                  <span className="text-[10px] leading-tight tracking-wider">Verified<br />participant</span>
                ) : (
                  <>
                    <span className="text-[9px] tracking-widest">Rank</span>
                    <span className="text-2xl leading-none">{cert.rank}</span>
                  </>
                )}
              </span>
            </div>
            <div className="text-right">
              <div className="ml-auto w-44 border-t border-slate-400 pt-1.5">
                <p className="font-medium text-slate-700">{cert.contest.organizer ?? "Cognitia"}</p>
                <p>Contest organizer</p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
