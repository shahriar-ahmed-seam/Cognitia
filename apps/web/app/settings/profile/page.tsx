import { redirect } from "next/navigation"

// Profile settings live on the profile editor
export default function ProfileSettingsRedirect() {
  redirect("/profile/edit")
}
