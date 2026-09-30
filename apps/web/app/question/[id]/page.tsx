import { redirect } from "next/navigation"

// Old question links: questions kept their ids when they moved into the community
export default async function QuestionRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/community/post/${encodeURIComponent(id)}`)
}
