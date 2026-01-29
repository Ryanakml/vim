"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface OrganizationGuardProps {
  children: ReactNode;
}

export function OrganizationGuard({ children }: OrganizationGuardProps) {
  const router = useRouter();

  const { isLoaded: isAuthLoaded, userId } = useAuth();

  const { isLoaded: isOrgLoaded, userMemberships } = useOrganizationList();

  useEffect(() => {
    // wait until everything is loaded
    if (!isAuthLoaded || !isOrgLoaded) return;

    // not logged in
    if (!userId) {
      router.replace("/signin");
      return;
    }

    // no organization yet
    if (userMemberships.data.length === 0) {
      router.replace("/onboarding");
      return;
    }
  }, [isAuthLoaded, isOrgLoaded, userId, userMemberships, router]);

  // loading state
  if (!isAuthLoaded || !isOrgLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // redirecting state (no org)
  if (userMemberships.data.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
