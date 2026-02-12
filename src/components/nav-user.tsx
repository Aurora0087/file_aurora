import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth-client'
import {
  IconBadge,
  IconBell,
  IconChevronsUp,
  IconCreditCard,
  IconLogout,
  IconSparkles,
  IconLoader2,
} from '@tabler/icons-react'
import { toast } from 'sonner'

export function NavUser() {
  const { isMobile } = useSidebar()
  const user = useQuery(api.drive.getUserWithPlan)

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Logged out successfully");
          window.location.href = "/"; 
        },
      },
    });
  };

  // 1. Loading State
  if (user === undefined) {
    return (
      <SidebarMenu>
        <SidebarMenuItem className="px-2">
           <IconLoader2 className="animate-spin size-4 text-muted-foreground" />
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // 2. Unauthenticated State (Optional safety check)
  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{user.name}</span>
                  {/* Show Plan Badge */}
                  <span className="text-[10px] bg-primary/10 text-primary px-1 rounded uppercase font-bold">
                    {user.plan.type}
                  </span>
                </div>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <IconChevronsUp className="ml-auto size-4" />
            </SidebarMenuButton>}>
           
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            
            {/* Conditional "Upgrade" section */}
            {user.plan.type === 'free' && (
              <DropdownMenuGroup>
                <DropdownMenuItem className="text-amber-600 focus:text-amber-600 cursor-pointer">
                  <IconSparkles className="size-4 mr-2 fill-amber-600" />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconBadge className="size-4 mr-2" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCreditCard className="size-4 mr-2" />
                Billing ({user.plan.type} Plan)
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconBell className="size-4 mr-2" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <IconLogout className="size-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}