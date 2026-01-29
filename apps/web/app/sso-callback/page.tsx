"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { Loader } from "lucide-react";

export default function SSOCallbackPage() {
  return (
    <div className="flex h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">
          Completing your authentication...
        </p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
