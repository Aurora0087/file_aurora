import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavStorage } from "./nav-storage"
import { Separator } from "./ui/separator"
import { SidebarNewButton } from "./drive/sidebar-new-button"
import { IconBook, IconClock, IconCommand, IconFoldersFilled, IconSettings, IconStarFilled, IconTrash } from "@tabler/icons-react"
import { Link } from "@tanstack/react-router"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Documentation",
      url: "#",
      icon: IconBook,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "My Drive",
      url: "/drive/my-drive",
      icon: IconFoldersFilled,
    },
    {
      name: "Recent",
      url: "/drive/recent",
      icon: IconClock,
    },
    {
      name: "Star",
      url: "/drive/stars",
      icon: IconStarFilled,
    },
    {
      name: "Bin",
      url: "/drive/bin",
      icon: IconTrash,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/drive" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconCommand className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">My App</span>
                  <span className="truncate text-xs">Drive</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNewButton />
        <Separator orientation="horizontal" />
        <NavProjects projects={data.projects} />
        <Separator orientation="horizontal" />
        <NavMain items={data.navMain} />
        <NavStorage />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
