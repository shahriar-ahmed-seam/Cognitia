"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FilePlus2 } from "lucide-react"
import { useUser } from "@/contexts/user-context"
import { api, errorMessage } from "@/lib/api"
import type { OrganizerWorkspace } from "@/lib/contests/types"
import { ContestShell, Eyebrow, Panel, StageHero } from "@/components/contests/primitives"
import { ContestSettingsForm } from "@/components/contests/manage/settings-form"
import { OrganizerGuard } from "@/components/contests/manage/organizer-guard"

const STEPS = ["Settings", "Questions", "Publish"]

function NewContest() {
  const router = useRouter()
  const { user } = useUser()

  const hero = (
    <StageHero width="narrow">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
        <Link href="/contests/manage" className="rounded-sm hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          Organizer console
        </Link>{" "}
        / <span className="text-slate-200">New contest</span>
      </nav>
      <div className="mt-6 flex items-start gap-4">
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-900/40 sm:flex" aria-hidden="true">
          <FilePlus2 className="h-6 w-6" />
        </span>
        <div>
          <Eyebrow>New contest</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Set up your contest</h1>
          <p className="mt-2 max-w-xl text-slate-300">It's saved as a draft. Add questions next, then publish when the checklist is complete.</p>
        </div>
      </div>
      <ol className="mt-6 flex flex-wrap items-center gap-2 text-xs" aria-label="Steps">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span
              className={
                index === 0
                  ? "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-medium text-slate-900"
                  : "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-slate-300 ring-1 ring-inset ring-white/15"
              }
              aria-current={index === 0 ? "step" : undefined}
            >
              <span className="tabular-nums">{index + 1}</span> {step}
            </span>
            {index < STEPS.length - 1 && <span className="h-px w-6 bg-white/20" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </StageHero>
  )

  return (
    <ContestShell hero={hero} width="narrow">
      <Panel className="rise">
        <ContestSettingsForm
          defaultInstitution={user?.institution}
          submitLabel="Create draft and add questions"
          onSubmit={async (settings) => {
            try {
              const created = await api<OrganizerWorkspace>("/organizer/contests", { method: "POST", body: settings })
              toast.success("Draft created")
              router.push(`/contests/manage/${created.contest.id}?tab=questions`)
            } catch (error) {
              toast.error(errorMessage(error))
            }
          }}
        />
      </Panel>
    </ContestShell>
  )
}

export default function NewContestPage() {
  return (
    <OrganizerGuard requireHost>
      <NewContest />
    </OrganizerGuard>
  )
}
