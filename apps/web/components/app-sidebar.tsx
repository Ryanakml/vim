"use client";

import * as React from "react";
import {
  AudioWaveform,
  Bot,
  ChartLineIcon,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  MessageCircle,
  MessageCircleCodeIcon,
  Instagram,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavIntegrations } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard/overview",
      icon: SquareTerminal,
    },
    {
      title: "Configurations",
      url: "/dashboard/configurations",
      icon: Bot,
    },
    {
      title: "Monitor",
      url: "#",
      icon: ChartLineIcon,
      items: [
        {
          title: "Conversations",
          url: "/dashboard/monitor/conversations",
        },
        {
          title: "Users",
          url: "/dashboard/monitor/users",
        },
      ],
    },
    {
      title: "Webchat",
      url: "#",
      icon: MessageCircleCodeIcon,
      items: [
        {
          title: "Bot Profile",
          url: "/dashboard/webchat/bot-profile",
        },
        {
          title: "Bot Appearance",
          url: "/dashboard/webchat/bot-appearance",
        },
        {
          title: "Deploy Settings",
          url: "/dashboard/webchat/deploy-settings",
        },
        {
          title: "Features",
          url: "/dashboard/webchat/features",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/dashboard/settings/general",
        },
        {
          title: "Profile",
          url: "/dashboard/settings/profile",
        },
        {
          title: "Billing",
          url: "/dashboard/settings/billing",
        },
      ],
    },
  ],
  integrations: [
    {
      name: "WhatsApp",
      url: "/dashboard/integrations/whatsapp",
      icon: MessageCircle,
    },
    {
      name: "Instagram",
      url: "/dashboard/integrations/instagram",
      icon: Instagram,
    },
    {
      name: "Omnichannel",
      url: "/dashboard/integrations/omnichannel",
      icon: Frame,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavIntegrations integrations={data.integrations} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
