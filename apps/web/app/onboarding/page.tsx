"use client";

import { FormEvent, useState } from "react";
import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";

export default function OnboardingPage() {
  const router = useRouter();
  const { createOrganization, isLoaded } = useOrganizationList();
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateWorkspace = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspaceName.trim()) {
      setError("Workspace name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!createOrganization) {
        throw new Error("Organization creation is not available");
      }

      await createOrganization({
        name: workspaceName.trim(),
      });

      // Redirect to dashboard after successful creation
      router.push("/dashboard/overview");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create workspace";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">Welcome to Chattify</CardTitle>
          <CardDescription>
            Create your first workspace to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="Enter your workspace name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !workspaceName.trim()}
            >
              {isLoading ? "Creating..." : "Create Workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
