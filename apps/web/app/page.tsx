"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function Page() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) return;

    // If signed in, redirect to dashboard
    if (isSignedIn) {
      router.push("/dashboard/overview");
    } else {
      // If not signed in, redirect to Clerk signin (Clerk hosted page)
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking auth
  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="text-center">
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    </div>
  );
}
