"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SuccessPageContent() {
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

export default function SuccessPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SuccessPageContent />
    </Suspense>
  );
}
