"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";

export function DynamicBreadcrumb() {
  const pathname = usePathname();

  // Split pathname dan filter folder kosong
  const segments = pathname.split("/").filter((segment) => segment.length > 0);

  // Mapping label agar lebih rapi (contoh: bot-appearance -> Bot Appearance)
  const breadcrumbItems = segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return { label, isLast };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
              {/* Semua dibuat pakai BreadcrumbPage karena kamu tidak ingin 
                  ada yang bisa diklik (non-clickable).
              */}
              <BreadcrumbPage
                className={
                  !item.isLast ? "text-muted-foreground/60 font-normal" : ""
                }
              >
                {item.label}
              </BreadcrumbPage>
            </BreadcrumbItem>

            {!item.isLast && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
