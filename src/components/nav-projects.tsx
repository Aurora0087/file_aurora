import { type TablerIcon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Link } from "@tanstack/react-router"

import { useLocation } from '@tanstack/react-router'

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: TablerIcon
  }[]
}) {
  const { isMobile } = useSidebar()
  const {pathname} = useLocation();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild tooltip={item.name} className={pathname.includes(item.url) ? 'text-primary' : ''}>
              <Link to={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
