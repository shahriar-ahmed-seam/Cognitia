// pages/auth/success.tsx
"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      router.replace("/dashboard"); // redirect to dashboard after saving token
    } else {
      router.replace("/login");
    }
  }, [token]);

  return <p>Redirecting...</p>;
}
