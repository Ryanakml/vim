"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Toaster } from "@workspace/ui/components/sonner";
import { WebchatProvider } from "@/contexts/webchat-context";

// Initialize Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      // Use Clerk's hosted authentication pages
      // If you want custom pages, set signInUrl="/sign-in" and signUpUrl="/sign-up"
      // and create corresponding pages with <SignIn /> and <SignUp /> components
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <WebchatProvider>{children}</WebchatProvider>
          <Toaster
            richColors
            position="top-center"
            style={{ zIndex: 99999 }} // Forces it above everything
          />
        </NextThemesProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
