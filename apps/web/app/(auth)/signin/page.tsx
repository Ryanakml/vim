"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-svh">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            cardBox: "w-full",
          },
        }}
        redirectUrl="/dashboard/overview"
      />
    </div>
  );
}
