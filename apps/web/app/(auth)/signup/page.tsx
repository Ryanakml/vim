"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-svh">
      <SignUp 
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
