import {
  IconDotsVertical,
  IconDownload,
  IconFolderFilled,
  IconStarFilled,
  IconWorld,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from '@tanstack/react-router'
import { truncateName } from '@/lib/utils'

function FolderCard({
  name,
  color = 'current',
  id,
  isPublic,
  isStarted,
  isTrashed,
  token
}: {
  name: string
  color?: string
  id: string
  isPublic: boolean
  isStarted: boolean
  isTrashed: boolean
  token:string
}) {
  const navigate = useNavigate()

  async function onDoubleClickHandeler() {
    navigate({
      to: '/drive/shared/$token/folder/$folderId',
      params: { folderId:id,token },
    })
  }

  return (
    <>
      <div
        className="group relative rounded bg-card/70 border border-transparent shadow-sm ring-1 ring-border/50 hover:bg-card hover:ring-primary/50 p-2 flex items-center justify-between w-full h-fit gap-4 transition-all cursor-pointer"
        onDoubleClick={onDoubleClickHandeler}
      >
        <div className="absolute -top-2 -right-2 flex gap-1 items-center">
          {isPublic && <IconWorld className="h-4 w-4 text-primary" />}
          {isStarted && <IconStarFilled className="h-4 w-4 text-yellow-400" />}
        </div>

        <div className="flex items-center gap-3 overflow-hidden">
          <IconFolderFilled
            style={{ color: color === 'current' ? undefined : color }}
            className={`w-6 h-6 shrink-0`}
          />
          <span
            className="truncate font-medium text-sm text-card-foreground"
            title={name}
          >
            {truncateName({ name })}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="More actions"
                onClick={(e) => e.stopPropagation()} // Prevent double click trigger
              >
                <IconDotsVertical size={18} />
              </Button>
            }
          />
          <DropdownMenuContent className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <IconDownload className="mr-2 h-4 w-4" />
                Download as zip
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

export default FolderCard
