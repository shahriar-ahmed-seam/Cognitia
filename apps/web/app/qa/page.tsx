import { redirect } from "next/navigation"

// Q&A moved into the community
export default function QaRedirect() {
  redirect("/community?type=question")
}
