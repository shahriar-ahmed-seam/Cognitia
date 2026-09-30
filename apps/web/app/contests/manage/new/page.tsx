"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useUser } from "@/contexts/user-context"
import { api, errorMessage } from "@/lib/api"
import type { OrganizerWorkspace } from "@/lib/contests/types"
import { ContestShell, Panel } from "@/components/contests/primitives"
import { ContestSettingsForm } from "@/components/contests/manage/settings-form"
import { OrganizerGuard } from "@/components/contests/manage/organizer-guard"

function NewContest() {
  const router = useRouter()
  const { user } = useUser()
  return (
    <ContestShell animated={false} width="narrow">
      <nav className="text-sm text-slate-500">
        <Link href="/contests/manage" className="hover:text-slate-900">Organizer console</Link> / New contest
      </nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">New contest</h1>
      <p className="mt-2 text-slate-600">It's saved as a draft. Add questions next, then publish when the checklist is complete.</p>
      <Panel className="mt-6">
        <ContestSettingsForm
          defaultInstitution={user?.institution}
          submitLabel="Create draft and add questions"
          onSubmit={async (settings) => {
            try {
              const created = await api<OrganizerWorkspace>("/admin/contests", { method: "POST", body: settings })
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
    <OrganizerGuard>
      <NewContest />
    </OrganizerGuard>
  )
}
