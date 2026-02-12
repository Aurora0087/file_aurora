
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { IconCloud } from "@tabler/icons-react"
import { useQuery } from "convex/react"
import { api } from "convex/_generated/api"
import { Skeleton } from "./ui/skeleton"
import { cn } from "@/lib/utils"

export function NavStorage() {
  const plan = useQuery(api.drive.userPlan)

  // 1. Loading State (Skeleton)
  if (plan === undefined) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="flex items-center gap-2">
          <IconCloud className="size-4" />
          Storage
        </SidebarGroupLabel>
        <div className="px-4 py-2 space-y-3">
          <Skeleton className="h-1 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      </SidebarGroup>
    )
  }

  // If no plan data at all (unauthenticated)
  if (!plan) return null

  // 2. Data Formatting
  const GB = 1024 * 1024 * 1024
  const usedGB = plan.usedStorage / GB
  const maxGB = plan.maxStorage / GB
  const percentage = Math.min(plan.usagePercentage, 100) // Ensure bar doesn't overflow

  // 3. Status color (Red if > 90% full)
  const isCritical = percentage > 90

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center gap-2">
        <IconCloud className={cn("size-4", isCritical && "text-destructive")} />
        Storage
        <span className="ml-auto text-[10px] font-bold uppercase bg-muted px-1.5 py-0.5 rounded">
          {plan.planType}
        </span>
      </SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="p-2 space-y-3">
            {/* Progress Bar */}
            <Progress 
              value={percentage} 
              className="h-1" 
              indicatorClassName={cn(isCritical && "bg-destructive")}
            />
            
            <div className="flex flex-col gap-0.5" title={usedGB+" GB used"}>
              <p className="text-xs text-muted-foreground">
                <span className={cn("font-medium", isCritical && "text-destructive")}>
                  {usedGB.toFixed(2)} GB
                </span>
                {" "}of {maxGB.toFixed(0)} GB used
              </p>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-transparent h-8 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-all"
            >
              Get more storage
            </Button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}