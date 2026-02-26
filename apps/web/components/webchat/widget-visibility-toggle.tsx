"use client";

import { useMemo, useState } from "react";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import {
  useToggleWidgetActive,
  useWidgetConfig,
  useBotProfile,
} from "@/lib/convex-client";

export function WidgetVisibilityToggle() {
  const botProfile = useBotProfile();
  const [isUpdating, setIsUpdating] = useState(false);
  const toggleWidgetActive = useToggleWidgetActive();

  const widgetId = botProfile?._id as Id<"botProfiles"> | undefined;
  const widgetConfig = useWidgetConfig(widgetId ? widgetId : "skip");

  const isLoading =
    botProfile === undefined ||
    (widgetId !== undefined && widgetConfig === undefined);

  const isActive = useMemo(() => {
    if (widgetConfig) return widgetConfig.isActive;
    if (botProfile) return botProfile.is_active ?? true;
    return true;
  }, [widgetConfig, botProfile]);

  const handleToggle = async () => {
    if (!widgetId || isUpdating || isLoading) return;

    setIsUpdating(true);
    try {
      await toggleWidgetActive({ widgetId });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Widget Visibility
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Remote kill switch to show or hide the embedded widget.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Label
            htmlFor="widget-visibility-toggle"
            className="text-xs text-zinc-400"
          >
            {isLoading ? "Checking..." : isActive ? "Active" : "Hidden"}
          </Label>
          <Switch
            id="widget-visibility-toggle"
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={isLoading || isUpdating || !widgetId}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
