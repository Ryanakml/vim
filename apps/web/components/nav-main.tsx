"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar";
import Link from "next/link";

const SIDEBAR_STORAGE_KEY = "sidebar_expanded_state";

/**
 * Load expanded menu items from localStorage
 * Returns an array of menu titles that should be expanded
 */
function getExpandedState(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("Failed to parse sidebar expanded state:", error);
    return [];
  }
}

/**
 * Save expanded menu items to localStorage
 */
function setExpandedState(expandedItems: string[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(expandedItems));
  } catch (error) {
    console.warn("Failed to save sidebar expanded state:", error);
  }
}

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  // State to track which menu items are expanded
  // Using state to handle hydration - initially empty, populated after mount
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load expanded state from localStorage on mount
  // This runs only on the client after hydration
  useEffect(() => {
    const stored = getExpandedState();
    setExpandedItems(stored);
    setIsMounted(true);
  }, []);

  /**
   * Handle toggle of a collapsible item
   * Updates local state and persists to localStorage
   */
  const handleToggle = (itemTitle: string, isOpen: boolean) => {
    setExpandedItems((prevItems) => {
      let updated: string[];

      if (isOpen) {
        // Add to expanded items if not already present
        updated = Array.from(new Set([...prevItems, itemTitle]));
      } else {
        // Remove from expanded items
        updated = prevItems.filter((item) => item !== itemTitle);
      }

      // Persist to localStorage
      setExpandedState(updated);
      return updated;
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // If item has no sub-items, render as a direct link
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          // Determine if this item should be open
          // Use persisted state if available, otherwise fall back to isActive
          const isOpen = isMounted
            ? expandedItems.includes(item.title)
            : (item.isActive ?? false);

          // If item has sub-items, render as a collapsible dropdown
          return (
            <Collapsible
              key={item.title}
              asChild
              open={isOpen}
              onOpenChange={(open) => handleToggle(item.title, open)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
