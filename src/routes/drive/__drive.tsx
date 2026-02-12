import { AppSidebar } from '@/components/app-sidebar'
import DriveSearch from '@/components/drive/DriveSearch'
import { ModeToggle } from '@/components/mode-toggle'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'
import { useMutation } from 'convex/react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/drive/__drive')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    // 1. Check if the user is logged in
    const isLogined = context.isAuthenticated

    // 2. If no session, redirect to login
    if (!isLogined) {
      throw redirect({
        to: '/auth/login',
        search: {
          // Keep track of where they were trying to go
          redirect: location.href,
        },
      })
    }
  },
})

const SIDEBAR_STATE_KEY = 'sidebar_preference'

function RouteComponent() {
  const ensurePlan = useMutation(api.drive.ensurePlan)
  const [isOpen, setIsOpen] = useState(() => {
    // Check for window to support SSR (TanStack Start)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY)
      return saved !== null ? JSON.parse(saved) : true
    }
    return true
  })

  // 2. Sync state to localStorage whenever it changes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(open))
  }
  useEffect(() => {
    ensurePlan()
  }, [ensurePlan])
  return (
    <SidebarProvider open={isOpen} onOpenChange={handleOpenChange}>
      <AppSidebar />
      <SidebarInset className="">
        <header className="bg-background sticky top-0 flex shrink-0 items-center justify-between gap-2 border-b p-4 z-40">
          <div className="-ml-1 flex gap-2 items-center justify-center">
            <SidebarTrigger  />
          <Separator
            orientation="vertical"
            className="mr-2"
          />
          </div>
          
          <DriveSearch />
          <ModeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
