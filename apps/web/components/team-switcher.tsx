"use client";

import * as React from "react";
import { useOrganizationList, useOrganization } from "@clerk/nextjs";
import { ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";

/**
 * TeamSwitcher Component
 * Fetches organizations from Clerk and allows switching between them.
 * Uses useOrganizationList to get all orgs, useOrganization to track active org,
 * and setActive to update the Convex query context.
 */
export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const {
    userMemberships,
    isLoaded: orgsLoaded,
    setActive,
  } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const { organization: activeOrganization } = useOrganization();

  // Loading state
  if (!orgsLoaded) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg animate-pulse">
              —
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Get organizations from userMemberships data
  const organizations = userMemberships?.data ?? [];

  // No organizations
  if (organizations.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              ?
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No Organizations</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const handleOrgSwitch = (orgId: string) => {
    setActive({ organization: orgId });
  };

  const getOrgLogo = (orgName: string): string => {
    const firstLetter = orgName.charAt(0).toUpperCase();
    return firstLetter;
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-semibold text-xs">
                {activeOrganization ? getOrgLogo(activeOrganization.name) : "—"}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeOrganization?.name || "Select Organization"}
                </span>
                <span className="truncate text-xs">Organization</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {organizations.map((membership) => (
              <DropdownMenuItem
                key={membership.id}
                onClick={() => handleOrgSwitch(membership.organization.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border font-semibold text-xs bg-background">
                  {getOrgLogo(membership.organization.name)}
                </div>
                <div className="flex-1">
                  <span>{membership.organization.name}</span>
                </div>
                {activeOrganization?.id === membership.organization.id && (
                  <span className="text-xs text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2 cursor-not-allowed opacity-50">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium text-sm">
                Create Organization
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
